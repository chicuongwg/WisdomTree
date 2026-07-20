// Wiki-links `[[Tiêu đề]]` / `[[Tiêu đề|nhãn hiển thị]]` — the authoring
// surface behind the knowledge graph. One module, no dependencies, used
// identically by the renderer (src/lib/markdown-core.ts), the service layer
// (derived node_links on save) and the client.
//
// Title matching is case- and diacritic-insensitive, mirroring the search
// path's immutable_unaccent(): strip combining marks, fold đ→d, lowercase,
// collapse whitespace. Doing it in TypeScript (not SQL) keeps one normalizer
// shared by the parser and the resolver, so what the reader sees linked is
// exactly what the save wrote into node_links.

/** `[[target]]` or `[[target|label]]`; targets never contain `[`, `]` or `|`. */
const WIKI_LINK = /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;

export type WikiLink = { target: string; label: string };

/** Search-compatible title key: no diacritics, no case, single spaces. */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Every wiki-link in the text, in document order (duplicates kept). */
export function parseWikiLinks(content: string): WikiLink[] {
  const found: WikiLink[] = [];
  for (const m of content.matchAll(WIKI_LINK)) {
    const target = m[1].trim();
    if (!target) continue;
    found.push({ target, label: (m[2] ?? m[1]).trim() });
  }
  return found;
}

/** Distinct normalized targets — what the derived-link sync resolves. */
export function wikiTargetKeys(content: string): string[] {
  return [...new Set(parseWikiLinks(content).map((l) => normalizeTitle(l.target)))];
}

/** Title → id index for rendering; later titles never shadow earlier ones. */
export function buildWikiIndex<T extends { id: string; title: string }>(
  nodes: T[],
): Record<string, T> {
  const index: Record<string, T> = {};
  for (const node of nodes) {
    const key = normalizeTitle(node.title);
    if (!(key in index)) index[key] = node;
  }
  return index;
}

/**
 * The sentence around the first wiki-link pointing at `targetKey` — the
 * context line shown in a backlink row. Falls back to the source node's
 * opening line when the link cannot be located (e.g. link declared by hand).
 */
export function backlinkContext(content: string, targetKey: string, max = 180): string {
  const plain = (s: string) =>
    s
      .replace(WIKI_LINK, (_m, target: string, label?: string) => (label ?? target).trim())
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/^[-*]\s+/gm, "")
      .trim();

  for (const m of content.matchAll(WIKI_LINK)) {
    if (normalizeTitle(m[1].trim()) !== targetKey) continue;
    const at = m.index ?? 0;
    const start = Math.max(0, content.lastIndexOf("\n", at) + 1);
    const breaks = [content.indexOf("\n", at), content.indexOf(". ", at)].filter((i) => i > -1);
    const end = breaks.length ? Math.min(...breaks) + 1 : content.length;
    const sentence = plain(content.slice(start, end));
    if (sentence) return sentence.slice(0, max);
  }
  const opening = plain(content)
    .split(/\n+/)
    .map((l) => l.trim())
    .find(Boolean);
  return (opening ?? "").slice(0, max);
}

/** Plain-text excerpt for hover previews (markup stripped, single spaces). */
export function excerpt(content: string, max = 200): string {
  const text = content
    .replace(WIKI_LINK, (_m, target: string, label?: string) => (label ?? target).trim())
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
