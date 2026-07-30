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

export type SearchField = "file" | "path" | "content" | "tag" | "property";

export type QueryNode =
  | {
      type: "term";
      value: string;
      field?: SearchField;
      property?: string;
      phrase: boolean;
    }
  | { type: "not"; child: QueryNode }
  | { type: "and" | "or"; left: QueryNode; right: QueryNode };

type Token =
  | { type: "word" | "phrase"; value: string }
  | { type: "or" | "not" | "left" | "right" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    if (/\s/.test(input[index])) {
      index++;
      continue;
    }
    if (input[index] === "(" || input[index] === ")") {
      tokens.push({ type: input[index] === "(" ? "left" : "right" });
      index++;
      continue;
    }
    if (input[index] === '"') {
      const end = input.indexOf('"', index + 1);
      if (end < 0) throw new Error("Thiếu dấu nháy đóng trong truy vấn.");
      tokens.push({ type: "phrase", value: input.slice(index + 1, end) });
      index = end + 1;
      continue;
    }
    let end = index;
    while (end < input.length && !/[\s()"]/.test(input[end])) end++;
    const value = input.slice(index, end);
    if (/^OR$/i.test(value)) tokens.push({ type: "or" });
    else if (/^NOT$/i.test(value) || value === "-") tokens.push({ type: "not" });
    else if (value.startsWith("-") && value.length > 1) {
      tokens.push({ type: "not" }, { type: "word", value: value.slice(1) });
    } else tokens.push({ type: "word", value });
    index = end;
  }
  return tokens;
}

function term(token: Extract<Token, { type: "word" | "phrase" }>): QueryNode {
  const split = token.value.indexOf(":");
  if (split < 1) {
    return { type: "term", value: token.value, phrase: token.type === "phrase" };
  }
  const prefix = token.value.slice(0, split).toLowerCase();
  const value = token.value.slice(split + 1);
  if (["file", "path", "content", "tag"].includes(prefix)) {
    return {
      type: "term",
      value,
      field: prefix as SearchField,
      phrase: token.type === "phrase",
    };
  }
  if (prefix === "property") {
    const equals = value.indexOf("=");
    if (equals < 1) throw new Error("Property phải có dạng property:tên=giá_trị.");
    return {
      type: "term",
      field: "property",
      property: value.slice(0, equals),
      value: value.slice(equals + 1),
      phrase: token.type === "phrase",
    };
  }
  return { type: "term", value: token.value, phrase: token.type === "phrase" };
}

export function parseSearchQuery(input: string): QueryNode {
  const tokens = tokenize(input.trim());
  if (!tokens.length) throw new Error("Truy vấn trống.");
  let cursor = 0;

  const primary = (): QueryNode => {
    const token = tokens[cursor++];
    if (!token) throw new Error("Truy vấn chưa hoàn chỉnh.");
    if (token.type === "not") return { type: "not", child: primary() };
    if (token.type === "left") {
      const node = or();
      if (tokens[cursor]?.type !== "right") throw new Error("Thiếu dấu ngoặc đóng.");
      cursor++;
      return node;
    }
    if (token.type === "word" || token.type === "phrase") {
      // Support field:"quoted phrase", tokenized as `field:` + phrase.
      if (token.type === "word" && token.value.endsWith(":")) {
        const next = tokens[cursor++];
        if (!next || (next.type !== "word" && next.type !== "phrase")) {
          throw new Error("Thiếu giá trị sau bộ lọc.");
        }
        return term({ type: next.type, value: `${token.value}${next.value}` });
      }
      return term(token);
    }
    throw new Error("Toán tử nằm sai vị trí.");
  };

  const and = (): QueryNode => {
    let node = primary();
    while (cursor < tokens.length && tokens[cursor].type !== "or" && tokens[cursor].type !== "right") {
      node = { type: "and", left: node, right: primary() };
    }
    return node;
  };

  const or = (): QueryNode => {
    let node = and();
    while (tokens[cursor]?.type === "or") {
      cursor++;
      node = { type: "or", left: node, right: and() };
    }
    return node;
  };

  const result = or();
  if (cursor !== tokens.length) throw new Error("Truy vấn không hợp lệ.");
  return result;
}
