import type { GraphData, GraphQuery } from "@wisdomtree/graph-obsidian";

export type AccessContext = {
  identityId: string;
  systemCapabilities: string[];
  vaultGrants: Array<{
    vaultId: string;
    grant: "owner" | "editor" | "reviewer" | "viewer";
  }>;
  spaceIds: string[];
};

export type IndexDocument =
  | {
      kind: "note";
      id: string;
      vaultId: string;
      title: string;
      path: string;
      content: string;
      tags: string[];
      properties: Record<string, unknown>;
    }
  | {
      kind: "source_chunk";
      id: string;
      spaceId: string;
      sourceId: string;
      title: string;
      content: string;
      refLabel: string;
      trustStatus: string;
    };

export type SearchRequest = {
  query: string;
  vaultId?: string;
  source?: "notes" | "documents" | "all";
  page?: number;
};

export type SearchResult = {
  kind: IndexDocument["kind"];
  id: string;
  title: string;
  excerpt: string;
  href: string;
  refLabel?: string;
  trustStatus?: string;
};

export type ProviderHealth = {
  available: boolean;
  message?: string;
};

export interface IndexProvider {
  upsert(document: IndexDocument): Promise<void>;
  remove(documentId: string): Promise<void>;
  search(request: SearchRequest, access: AccessContext): Promise<SearchResult[]>;
  graph(query: GraphQuery, access: AccessContext): Promise<GraphData>;
  health(): Promise<ProviderHealth>;
}

export type CitedAnswer = {
  answer: string;
  citations: SearchResult[];
  model: string;
};

export interface LibrarianProvider {
  answer(question: string, access: AccessContext, vaultId?: string): Promise<CitedAnswer>;
  health(): Promise<ProviderHealth>;
}
