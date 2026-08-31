import assert from "node:assert/strict";
import { ApiError } from "@/lib/errors";
import { buildVaultFiles } from "@/modules/export/vault";

const base = {
  spaceId: "space<&",
  releaseNo: 2,
  nodes: [
    {
      id: "node-b",
      branchId: "branch-b",
      branchName: "B < &",
      branchSortOrder: 1,
      title: "Trang B",
      summary: null,
      sortOrder: 0,
      contentMd: "# Trang B\n\n[[Trang A]]",
      version: 3,
      tags: ["wiki"],
      sourceIds: ["source-1"],
    },
    {
      id: "node-a",
      branchId: "branch-a",
      branchName: "A",
      branchSortOrder: 0,
      title: "Trang A",
      summary: "Tóm tắt",
      sortOrder: 0,
      contentMd: "# Trang A",
      version: 1,
      tags: [],
      sourceIds: [],
      translation: {
        title: "Page A",
        summary: null,
        contentMd: "# Page A",
        version: 1,
      },
    },
  ],
  links: [{ fromNodeId: "node-b", toNodeId: "node-a", linkType: "related" }],
};

export const run = async () => {
  const first = buildVaultFiles(base);
  const second = buildVaultFiles({ ...base, nodes: [...base.nodes].reverse() });
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.files.map((file) => file.path),
    ["links.xml", "topics/node-a/en.md", "topics/node-a/vi.md", "topics/node-b/vi.md", "vault.xml"],
  );
  assert.match(
    first.files.find((file) => file.path === "vault.xml")!.content,
    /space-id="space&lt;&amp;"/,
  );

  assert.throws(
    () =>
      buildVaultFiles({
        ...base,
        nodes: [{ ...base.nodes[0], contentMd: "[[Không tồn tại]]" }],
      }),
    (error: unknown) => error instanceof ApiError && error.code === "release_validation_failed",
  );
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}
