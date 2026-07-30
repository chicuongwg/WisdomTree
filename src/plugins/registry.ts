import type { GraphDataProvider } from "@wisdomtree/graph-obsidian";
import type { IdentityProvider } from "@wisdomtree/identity";
import type { IndexProvider, LibrarianProvider } from "@wisdomtree/index-librarian";

export type PluginRegistry = {
  graph: GraphDataProvider;
  identity: IdentityProvider;
  index: IndexProvider;
  librarian: LibrarianProvider;
};
