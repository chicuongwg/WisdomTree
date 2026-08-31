export function wikiPath(nodeId: string, slug?: string | null): string {
  return slug ? `/wiki/${nodeId}/${encodeURIComponent(slug)}` : `/wiki/${nodeId}`;
}
