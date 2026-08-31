import { createHash } from "node:crypto";
import { normalizeTitle } from "@/lib/wikilink";
import { validateMarkdown } from "@/lib/markdown-validation";
import { ApiError } from "@/lib/errors";
import type { ExportFile } from "./target";

export type VaultNode = {
  id: string;
  branchId: string;
  branchName: string;
  branchSortOrder: number;
  title: string;
  summary: string | null;
  sortOrder: number;
  contentMd: string;
  version: number;
  tags: string[];
  sourceIds: string[];
  translation?: {
    title: string;
    summary: string | null;
    contentMd: string;
    version: number;
  };
};

export type VaultLink = {
  fromNodeId: string;
  toNodeId: string;
  linkType: string;
};

const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");
const xml = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
const yamlString = (value: string) => JSON.stringify(value);

function markdown(
  node: VaultNode,
  locale: "vi" | "en",
  title: string,
  summary: string | null,
  contentMd: string,
  version: number,
): string {
  return [
    "---",
    `id: ${yamlString(node.id)}`,
    `locale: ${locale}`,
    `title: ${yamlString(title)}`,
    `summary: ${summary ? yamlString(summary) : "null"}`,
    `branch_id: ${yamlString(node.branchId)}`,
    `branch: ${yamlString(node.branchName)}`,
    `order: ${node.sortOrder}`,
    "verification: verified",
    `tags: [${node.tags.map(yamlString).join(", ")}]`,
    `sources: [${node.sourceIds.map(yamlString).join(", ")}]`,
    `version: ${version}`,
    "---",
    "",
    contentMd,
    "",
  ].join("\n");
}

/** Build the neutral, deterministic Markdown/XML projection for one release. */
export function buildVaultFiles(input: {
  spaceId: string;
  releaseNo: number;
  nodes: VaultNode[];
  links: VaultLink[];
  knownTargets?: string[];
}): { files: ExportFile[]; manifestSha256: string } {
  const known = new Set(
    [
      ...input.nodes.flatMap((node) => [node.title, node.translation?.title]),
      ...(input.knownTargets ?? []),
    ]
      .filter((title): title is string => Boolean(title))
      .map(normalizeTitle),
  );
  const nodes = [...input.nodes].sort(
    (left, right) =>
      left.branchSortOrder - right.branchSortOrder ||
      left.branchName.localeCompare(right.branchName) ||
      left.sortOrder - right.sortOrder ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
  const topicFiles: ExportFile[] = [];
  const topics: Array<{ node: VaultNode; locale: "vi" | "en"; path: string; hash: string }> = [];

  for (const node of nodes) {
    const variants = [
      {
        locale: "vi" as const,
        title: node.title,
        summary: node.summary,
        content: node.contentMd,
        version: node.version,
      },
      ...(node.translation
        ? [
            {
              locale: "en" as const,
              title: node.translation.title,
              summary: node.translation.summary,
              content: node.translation.contentMd,
              version: node.translation.version,
            },
          ]
        : []),
    ];
    for (const variant of variants) {
      const issues = validateMarkdown(variant.content, known);
      const blocking = issues.filter(
        (issue) => issue.severity === "error" || issue.code === "broken_wiki_link",
      );
      if (blocking.length) {
        throw new ApiError(422, "release_validation_failed", "Release content is invalid.", {
          nodeId: node.id,
          locale: variant.locale,
          issues: blocking,
        });
      }
      const filePath = `topics/${node.id}/${variant.locale}.md`;
      const content = markdown(
        node,
        variant.locale,
        variant.title,
        variant.summary,
        variant.content,
        variant.version,
      );
      topicFiles.push({ path: filePath, content });
      topics.push({ node, locale: variant.locale, path: filePath, hash: sha256(content) });
    }
  }

  const included = new Set(nodes.map((node) => node.id));
  const links = input.links
    .filter((link) => included.has(link.fromNodeId) && included.has(link.toNodeId))
    .sort(
      (left, right) =>
        left.fromNodeId.localeCompare(right.fromNodeId) ||
        left.toNodeId.localeCompare(right.toNodeId) ||
        left.linkType.localeCompare(right.linkType),
    );
  const linksXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<links space-id="${xml(input.spaceId)}" release="${input.releaseNo}">`,
    ...links.map(
      (link) =>
        `  <link from="${xml(link.fromNodeId)}" to="${xml(link.toNodeId)}" type="${xml(link.linkType)}" />`,
    ),
    "</links>",
    "",
  ].join("\n");
  const vaultXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<vault space-id="${xml(input.spaceId)}" release="${input.releaseNo}">`,
    ...topics.map(
      ({ node, locale, path, hash }) =>
        `  <topic node-id="${xml(node.id)}" branch-id="${xml(node.branchId)}" locale="${locale}" path="${xml(path)}" sha256="${hash}" />`,
    ),
    "</vault>",
    "",
  ].join("\n");
  const files = [
    ...topicFiles,
    { path: "links.xml", content: linksXml },
    { path: "vault.xml", content: vaultXml },
  ].sort((left, right) => left.path.localeCompare(right.path));
  const manifestSha256 = sha256(
    files.map((file) => `${file.path}\0${sha256(file.content)}\n`).join(""),
  );
  return { files, manifestSha256 };
}

export function hashVaultFiles(files: ExportFile[]): string {
  return sha256(
    [...files]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((file) => `${file.path}\0${sha256(file.content)}\n`)
      .join(""),
  );
}
