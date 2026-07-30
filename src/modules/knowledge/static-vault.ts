import { createHash } from "node:crypto";
import path from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { ExportFile } from "../export/target";

export const STATIC_VAULT_SCHEMA_VERSION = "1";

export interface StaticVaultTopic {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaticVaultTag {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface StaticVaultNode {
  id: string;
  topicId: string;
  title: string;
  slug: string;
  revision: number;
  verification: "no_source" | "unverified" | "verified";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  markdownPath: string;
  sha256: string;
  contentMd: string;
}

export interface StaticVaultLink {
  from: string;
  to: string;
  type: "related" | "supports" | "contrasts" | "part_of";
}

export interface StaticVault {
  id: string;
  kind: "personal" | "shared";
  topics: StaticVaultTopic[];
  tags: StaticVaultTag[];
  nodes: StaticVaultNode[];
  links: StaticVaultLink[];
}

export interface VerifiedStaticVault extends StaticVault {
  files: Map<string, string>;
}

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sha256(content: string): string {
  return createHash("sha256").update(Buffer.from(content, "utf8")).digest("hex");
}

export function renderMarkdown(node: Omit<StaticVaultNode, "markdownPath" | "sha256">): string {
  return [
    "---",
    `id: ${JSON.stringify(node.id)}`,
    `title: ${JSON.stringify(node.title)}`,
    `topicId: ${JSON.stringify(node.topicId)}`,
    `revision: ${node.revision}`,
    `verification: ${node.verification}`,
    "---",
    "",
    node.contentMd,
    "",
  ].join("\n");
}

export function renderVaultXml(vault: Omit<StaticVault, "links">): string {
  const topics = [...vault.topics].sort((a, b) => a.path.localeCompare(b.path) || a.id.localeCompare(b.id));
  const tags = [...vault.tags].sort((a, b) => a.id.localeCompare(b.id));
  const nodes = [...vault.nodes].sort(
    (a, b) => a.markdownPath.localeCompare(b.markdownPath) || a.id.localeCompare(b.id),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<vault schemaVersion="${STATIC_VAULT_SCHEMA_VERSION}" id="${xml(vault.id)}" kind="${xml(vault.kind)}">`,
    "  <topics>",
    ...topics.map(
      (topic) =>
        `    <topic id="${xml(topic.id)}" parentId="${xml(topic.parentId ?? "")}" name="${xml(topic.name)}" path="${xml(topic.path)}" createdBy="${xml(topic.createdBy)}" createdAt="${xml(topic.createdAt)}" updatedAt="${xml(topic.updatedAt)}"/>`,
    ),
    "  </topics>",
    "  <tags>",
    ...tags.map(
      (tag) =>
        `    <tag id="${xml(tag.id)}" name="${xml(tag.name)}" createdBy="${xml(tag.createdBy)}" createdAt="${xml(tag.createdAt)}"/>`,
    ),
    "  </tags>",
    "  <nodes>",
    ...nodes.flatMap((node) => [
      `    <node id="${xml(node.id)}" topicId="${xml(node.topicId)}" title="${xml(node.title)}" slug="${xml(node.slug)}" revision="${node.revision}" verification="${xml(node.verification)}" createdBy="${xml(node.createdBy)}" createdAt="${xml(node.createdAt)}" updatedAt="${xml(node.updatedAt)}" markdownPath="${xml(node.markdownPath)}" sha256="${node.sha256}">`,
      ...[...node.tags]
        .sort((a, b) => a.localeCompare(b))
        .map((tagId) => `      <tagRef id="${xml(tagId)}"/>`),
      "    </node>",
    ]),
    "  </nodes>",
    "</vault>",
    "",
  ].join("\n");
}

export function renderLinksXml(links: StaticVaultLink[]): string {
  const sorted = [...links].sort(
    (a, b) =>
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to) ||
      a.type.localeCompare(b.type),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<links schemaVersion="${STATIC_VAULT_SCHEMA_VERSION}">`,
    ...sorted.map(
      (link) =>
        `  <link from="${xml(link.from)}" to="${xml(link.to)}" type="${xml(link.type)}"/>`,
    ),
    "</links>",
    "",
  ].join("\n");
}

export function buildStaticVaultFiles(vault: StaticVault): ExportFile[] {
  const markdown = vault.nodes.map((node) => {
    const content = renderMarkdown(node);
    if (sha256(content) !== node.sha256) {
      throw new Error(`checksum does not match rendered Markdown: ${node.id}`);
    }
    return { path: node.markdownPath, content };
  });
  return [
    { path: "vault.xml", content: renderVaultXml(vault) },
    { path: "links.xml", content: renderLinksXml(vault.links) },
    ...markdown,
  ].sort((a, b) => a.path.localeCompare(b.path));
}

function array<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function required(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`missing ${field}`);
  return value;
}

function safeRepoPath(value: string): boolean {
  return (
    value === path.posix.normalize(value) &&
    !path.posix.isAbsolute(value) &&
    value !== ".." &&
    !value.startsWith("../") &&
    !value.includes("\\")
  );
}

export function verifyStaticVaultFiles(files: Map<string, string>): VerifiedStaticVault {
  const vaultXml = files.get("vault.xml");
  const linksXml = files.get("links.xml");
  if (!vaultXml || !linksXml) throw new Error("vault.xml and links.xml are required");
  for (const [name, content] of [
    ["vault.xml", vaultXml],
    ["links.xml", linksXml],
  ]) {
    const result = XMLValidator.validate(content);
    if (result !== true) throw new Error(`${name}: ${result.err.msg}`);
  }
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const rawVault = parser.parse(vaultXml)?.vault;
  const rawLinks = parser.parse(linksXml)?.links;
  if (rawVault?.schemaVersion !== STATIC_VAULT_SCHEMA_VERSION)
    throw new Error("vault.xml: unsupported schemaVersion");
  if (rawLinks?.schemaVersion !== STATIC_VAULT_SCHEMA_VERSION)
    throw new Error("links.xml: unsupported schemaVersion");

  const topics: StaticVaultTopic[] = array<Record<string, unknown>>(rawVault.topics?.topic).map(
    (topic) => ({
      id: required(topic.id, "topic id"),
      parentId: typeof topic.parentId === "string" && topic.parentId ? topic.parentId : null,
      name: required(topic.name, "topic name"),
      path: required(topic.path, "topic path"),
      createdBy: required(topic.createdBy, "topic createdBy"),
      createdAt: required(topic.createdAt, "topic createdAt"),
      updatedAt: required(topic.updatedAt, "topic updatedAt"),
    }),
  );
  const tags: StaticVaultTag[] = array<Record<string, unknown>>(rawVault.tags?.tag).map((tag) => ({
    id: required(tag.id, "tag id"),
    name: required(tag.name, "tag name"),
    createdBy: required(tag.createdBy, "tag createdBy"),
    createdAt: required(tag.createdAt, "tag createdAt"),
  }));
  const nodes: StaticVaultNode[] = array<Record<string, unknown>>(rawVault.nodes?.node).map((node) => {
    const revision = Number(node.revision);
    const verification = required(node.verification, "node verification");
    if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("invalid node revision");
    if (!["no_source", "unverified", "verified"].includes(verification))
      throw new Error("invalid node verification");
    const markdownPath = required(node.markdownPath, "node markdownPath");
    const content = files.get(markdownPath);
    if (content === undefined) throw new Error(`missing Markdown file: ${markdownPath}`);
    const checksum = required(node.sha256, "node sha256");
    if (sha256(content) !== checksum) throw new Error(`checksum mismatch: ${markdownPath}`);
    const parsedMarkdown = parseMarkdown(content);
    const id = required(node.id, "node id");
    const topicId = required(node.topicId, "node topicId");
    const title = required(node.title, "node title");
    if (
      parsedMarkdown.id !== id ||
      parsedMarkdown.title !== title ||
      parsedMarkdown.topicId !== topicId ||
      parsedMarkdown.revision !== revision ||
      parsedMarkdown.verification !== verification
    ) {
      throw new Error(`Markdown frontmatter does not match manifest: ${markdownPath}`);
    }
    return {
      id,
      topicId,
      title,
      slug: required(node.slug, "node slug"),
      revision,
      verification: verification as StaticVaultNode["verification"],
      createdBy: required(node.createdBy, "node createdBy"),
      createdAt: required(node.createdAt, "node createdAt"),
      updatedAt: required(node.updatedAt, "node updatedAt"),
      tags: array<Record<string, unknown>>(
        node.tagRef as Record<string, unknown> | Record<string, unknown>[] | undefined,
      ).map((ref) =>
        required(ref.id, "tagRef id"),
      ),
      markdownPath,
      sha256: checksum,
      contentMd: parsedMarkdown.contentMd,
    };
  });
  const links: StaticVaultLink[] = array<Record<string, unknown>>(rawLinks.link).map((link) => {
    const type = required(link.type, "link type");
    if (!["related", "supports", "contrasts", "part_of"].includes(type))
      throw new Error("invalid link type");
    return {
      from: required(link.from, "link from"),
      to: required(link.to, "link to"),
      type: type as StaticVaultLink["type"],
    };
  });

  assertUnique(topics.map((topic) => topic.id), "topic id");
  assertUnique(topics.map((topic) => topic.path), "topic path");
  assertUnique(tags.map((tag) => tag.id), "tag id");
  assertUnique(nodes.map((node) => node.id), "node id");
  assertUnique(nodes.map((node) => node.markdownPath), "Markdown path");
  for (const topic of topics) {
    if (!safeRepoPath(topic.path) || !topic.path.startsWith("topics/"))
      throw new Error(`invalid topic path: ${topic.path}`);
    if (topic.parentId && !topics.some((candidate) => candidate.id === topic.parentId))
      throw new Error(`dangling topic parent: ${topic.id}`);
  }
  for (const node of nodes) {
    if (
      !safeRepoPath(node.markdownPath) ||
      !node.markdownPath.endsWith(".md") ||
      !node.markdownPath.startsWith("topics/")
    )
      throw new Error(`invalid Markdown path: ${node.markdownPath}`);
    if (!topics.some((topic) => topic.id === node.topicId))
      throw new Error(`dangling node topic: ${node.id}`);
    for (const tagId of node.tags) {
      if (!tags.some((tag) => tag.id === tagId)) throw new Error(`dangling node tag: ${tagId}`);
    }
  }
  for (const link of links) {
    if (!nodes.some((node) => node.id === link.from) || !nodes.some((node) => node.id === link.to))
      throw new Error(`dangling link: ${link.from} -> ${link.to}`);
  }
  return {
    id: required(rawVault.id, "vault id"),
    kind: required(rawVault.kind, "vault kind") as StaticVault["kind"],
    topics,
    tags,
    nodes,
    links,
    files,
  };
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`duplicate ${label}`);
}

function parseMarkdown(content: string): {
  id: string;
  title: string;
  topicId: string;
  revision: number;
  verification: string;
  contentMd: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)\n$/);
  if (!match) throw new Error("invalid Markdown frontmatter");
  const lines = match[1].split("\n");
  if (lines.length !== 5) throw new Error("invalid Markdown frontmatter");
  const values = new Map(
    lines.map((line) => {
      const separator = line.indexOf(": ");
      if (separator < 1) throw new Error("invalid Markdown frontmatter");
      return [line.slice(0, separator), line.slice(separator + 2)];
    }),
  );
  try {
    return {
      id: JSON.parse(required(values.get("id"), "frontmatter id")),
      title: JSON.parse(required(values.get("title"), "frontmatter title")),
      topicId: JSON.parse(required(values.get("topicId"), "frontmatter topicId")),
      revision: Number(required(values.get("revision"), "frontmatter revision")),
      verification: required(values.get("verification"), "frontmatter verification"),
      contentMd: match[2],
    };
  } catch {
    throw new Error("invalid Markdown frontmatter");
  }
}
