export type GraphNode = {
  id: string;
  title: string;
  path: string;
  vaultId: string;
  topicId: string | null;
  tags: string[];
  properties: Record<string, unknown>;
  verification: string;
  createdAt: string;
  updatedAt: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  type: "related" | "supports" | "contrasts" | "part_of";
};

export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

export type GraphQuery = {
  scope: "shared" | "personal";
  vaultId?: string;
  centerId?: string;
  depth?: number;
  search?: string;
  includeOrphans?: boolean;
  linkTypes?: GraphEdge["type"][];
};

export type NodePreview = {
  id: string;
  title: string;
  verification: string;
  excerpt: string;
};

export interface GraphDataProvider {
  loadGraph(query: GraphQuery): Promise<GraphData>;
  loadPreview(nodeId: string): Promise<NodePreview | null>;
}
