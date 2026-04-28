import type { AgentStatus, MemoryStatus, WorkflowGraph } from "@openclaw/types";
import type { Edge, Node } from "reactflow";

export type GraphNodeData = {
  id: string;
  label: string;
  kind: "agent" | "memory";
  status: AgentStatus | MemoryStatus;
  assignedTo?: string | null;
  inbound: number;
  outbound: number;
};

export type GraphFilters = {
  query: string;
  kind: "all" | "agent" | "memory";
  status: "all" | string;
};

function buildPositions(nodes: WorkflowGraph["nodes"]) {
  const positions = new Map<string, { x: number; y: number }>();
  const agents = nodes.filter((node) => node.kind === "agent");
  const memories = nodes.filter((node) => node.kind === "memory");

  agents.forEach((node, index) => {
    positions.set(node.id, { x: index * 260, y: 50 });
  });

  memories.forEach((node, index) => {
    positions.set(node.id, { x: (index % 4) * 260, y: 260 + Math.floor(index / 4) * 180 });
  });

  return positions;
}

export function mapWorkflowToFlow(graph: WorkflowGraph): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  const inboundCount = new Map<string, number>();
  const outboundCount = new Map<string, number>();

  for (const edge of graph.edges) {
    outboundCount.set(edge.upstream_id, (outboundCount.get(edge.upstream_id) ?? 0) + 1);
    inboundCount.set(edge.downstream_id, (inboundCount.get(edge.downstream_id) ?? 0) + 1);
  }

  const positions = buildPositions(graph.nodes);

  const nodes: Node<GraphNodeData>[] = graph.nodes.map((node) => ({
    id: node.id,
    type: node.kind === "agent" ? "agentNode" : "memoryNode",
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    data: {
      id: node.id,
      label: node.label,
      kind: node.kind,
      status: node.status,
      assignedTo: node.kind === "memory" ? node.assigned_to : null,
      inbound: inboundCount.get(node.id) ?? 0,
      outbound: outboundCount.get(node.id) ?? 0,
    },
  }));

  const edges: Edge[] = graph.edges.map((edge, index) => ({
    id: `${edge.upstream_id}-${edge.downstream_id}-${index}`,
    source: edge.upstream_id,
    target: edge.downstream_id,
    animated: false,
    style: { strokeWidth: 1.6 },
  }));

  return { nodes, edges };
}

export function applyGraphFilters(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  filters: GraphFilters,
): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  const query = filters.query.trim().toLowerCase();

  const visibleNodeIds = new Set(
    nodes
      .filter((node) => {
        const queryPass =
          query.length === 0 ||
          node.data.label.toLowerCase().includes(query) ||
          node.id.toLowerCase().includes(query) ||
          (node.data.assignedTo ?? "").toLowerCase().includes(query);
        const kindPass = filters.kind === "all" || node.data.kind === filters.kind;
        const statusPass = filters.status === "all" || String(node.data.status) === filters.status;
        return queryPass && kindPass && statusPass;
      })
      .map((node) => node.id),
  );

  const filteredEdges = edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));

  const filteredNodes = nodes.map((node) => ({
    ...node,
    hidden: !visibleNodeIds.has(node.id),
    data: {
      ...node.data,
      inbound: filteredEdges.filter((edge) => edge.target === node.id).length,
      outbound: filteredEdges.filter((edge) => edge.source === node.id).length,
    },
  }));

  return { nodes: filteredNodes, edges: filteredEdges };
}
