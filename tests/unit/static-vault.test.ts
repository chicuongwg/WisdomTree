import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readStaticVaultRepo } from "../../scripts/static-vault-repo";
import { LocalGitExportTarget } from "../../src/modules/export/target";
import {
  buildStaticVaultFiles,
  renderMarkdown,
  renderVaultXml,
  sha256,
  verifyStaticVaultFiles,
  type StaticVault,
} from "../../src/modules/knowledge/static-vault";

function fixture(): StaticVault {
  const baseNode = {
    id: "00000000-0000-4000-8000-000000000003",
    topicId: "00000000-0000-4000-8000-000000000002",
    title: `A & "B"`,
    slug: "a-b",
    revision: 2,
    verification: "verified" as const,
    createdBy: "00000000-0000-4000-8000-000000000001",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    tags: ["00000000-0000-4000-8000-000000000004"],
    contentMd: "# A\n",
  };
  const markdownPath = "topics/a-b/a-b.md";
  const markdown = renderMarkdown({ ...baseNode });
  return {
    id: "00000000-0000-4000-8000-000000000000",
    kind: "shared",
    topics: [
      {
        id: baseNode.topicId,
        parentId: null,
        name: `A & "B"`,
        path: "topics/a-b",
        createdBy: baseNode.createdBy,
        createdAt: baseNode.createdAt,
        updatedAt: baseNode.updatedAt,
      },
    ],
    tags: [
      {
        id: baseNode.tags[0],
        name: "zeta",
        createdBy: baseNode.createdBy,
        createdAt: baseNode.createdAt,
      },
    ],
    nodes: [{ ...baseNode, markdownPath, sha256: sha256(markdown) }],
    links: [],
  };
}

export async function run() {
  const vault = fixture();
  const xml = renderVaultXml(vault);
  assert.match(xml, /name="A &amp; &quot;B&quot;"/);
  assert.equal(
    JSON.stringify(buildStaticVaultFiles(vault)),
    JSON.stringify(buildStaticVaultFiles({ ...vault, topics: [...vault.topics].reverse() })),
  );
  const markdown = buildStaticVaultFiles(vault).find((file) => file.path.endsWith(".md"));
  assert.equal(markdown && sha256(markdown.content), vault.nodes[0].sha256);
  const validFiles = new Map(buildStaticVaultFiles(vault).map((file) => [file.path, file.content]));
  assert.equal(verifyStaticVaultFiles(validFiles).id, vault.id);

  for (const [name, mutate, expected] of [
    [
      "checksum",
      (files: Map<string, string>) => files.set(vault.nodes[0].markdownPath, "changed"),
      /checksum mismatch/,
    ],
    [
      "path traversal",
      (files: Map<string, string>) =>
        files.set(
          "vault.xml",
          files.get("vault.xml")!.replace(vault.nodes[0].markdownPath, "../outside.md"),
        ),
      /missing Markdown file|invalid Markdown path/,
    ],
    [
      "duplicate id",
      (files: Map<string, string>) =>
        files.set(
          "vault.xml",
          files
            .get("vault.xml")!
            .replace("  </nodes>", `    ${files.get("vault.xml")!.match(/<node .*<\/node>/s)![0]}\n  </nodes>`),
        ),
      /duplicate node id/,
    ],
    [
      "dangling link",
      (files: Map<string, string>) =>
        files.set(
          "links.xml",
          files
            .get("links.xml")!
            .replace("</links>", `  <link from="${vault.nodes[0].id}" to="missing" type="related"/>\n</links>`),
        ),
      /dangling link/,
    ],
  ] as const) {
    const files = new Map(validFiles);
    mutate(files);
    assert.throws(() => verifyStaticVaultFiles(files), expected, name);
  }

  const temp = await mkdtemp(path.join(tmpdir(), "wt-static-vault-test-"));
  try {
    const target = new LocalGitExportTarget(path.join(temp, "vault.git"));
    const first = await target.publish(buildStaticVaultFiles(vault), "first");
    assert.equal(
      verifyStaticVaultFiles(await readStaticVaultRepo(path.join(temp, "vault.git"))).id,
      vault.id,
    );
    const second = await target.publish(buildStaticVaultFiles(vault), "second");
    assert.equal(first.changed, true);
    assert.deepEqual(second, { commitSha: first.commitSha, changed: false });

    vault.nodes[0].contentMd = "# Changed";
    const rendered = renderMarkdown(vault.nodes[0]);
    vault.nodes[0].sha256 = sha256(rendered);
    const third = await target.publish(buildStaticVaultFiles(vault), "third");
    assert.equal(third.changed, true);
    assert.notEqual(third.commitSha, first.commitSha);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
