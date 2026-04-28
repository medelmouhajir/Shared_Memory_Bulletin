import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import { useWorkflowGraph } from "../../hooks/useWorkflowGraph";
import { GraphDetailsPanel } from "./GraphDetailsPanel";
import { GraphToolbar } from "./GraphToolbar";
import { applyGraphFilters, mapWorkflowToFlow, type GraphNodeData } from "./graphMapper";
import { AgentFlowNode } from "./nodes/AgentFlowNode";
import { MemoryFlowNode } from "./nodes/MemoryFlowNode";

const nodeTypes: NodeTypes = {
  agentNode: AgentFlowNode,
  memoryNode: MemoryFlowNode,
};

function GraphCanvas({
  nodes,
  edges,
  selectedId,
  fitTrigger,
  onNodeSelect,
}: {
  nodes: Node<GraphNodeData>[];
  edges: ReturnType<typeof applyGraphFilters>["edges"];
  selectedId: string | null;
  fitTrigger: number;
  onNodeSelect: (id: string | null) => void;
}) {
  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setFlowEdges(
      edges.map((edge) => ({
        ...edge,
        animated: selectedId ? edge.source === selectedId || edge.target === selectedId : false,
        style: {
          stroke: selectedId && (edge.source === selectedId || edge.target === selectedId) ? "#a78bfa" : "#64748b",
          strokeWidth: selectedId && (edge.source === selectedId || edge.target === selectedId) ? 2.4 : 1.6,
          opacity: selectedId && !(edge.source === selectedId || edge.target === selectedId) ? 0.18 : 1,
        },
      })),
    );
  }, [edges, selectedId, setFlowEdges]);

  useEffect(() => {
    fitView({ padding: 0.2, duration: 500 });
  }, [fitView, nodes.length, edges.length, fitTrigger]);

  return (
    <section className="graph-scene surface-dark">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect(null)}
        fitView
        minZoom={0.4}
        maxZoom={1.8}
        className="graph-flow"
        aria-label="Workflow dependency graph"
      >
        <Background gap={20} color="#334155" />
        <Controls />
        <MiniMap pannable zoomable nodeStrokeWidth={3} />
      </ReactFlow>
    </section>
  );
}

export function DependencyGraph() {
  const graph = useWorkflowGraph();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "agent" | "memory">("all");
  const [status, setStatus] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  const flow = useMemo(() => (graph.data ? mapWorkflowToFlow(graph.data) : null), [graph.data]);

  const statuses = useMemo(() => {
    if (!flow) return [];
    return [...new Set(flow.nodes.map((node) => String(node.data.status)))].sort();
  }, [flow]);

  const filtered = useMemo(() => {
    if (!flow) return null;
    return applyGraphFilters(flow.nodes, flow.edges, { query, kind, status });
  }, [flow, query, kind, status]);

  const selectedNodeData = useMemo(() => {
    if (!filtered || !selectedId) return null;
    const node = filtered.nodes.find((item) => item.id === selectedId);
    return node?.data ?? null;
  }, [filtered, selectedId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (graph.isLoading) return <p className="detail-panel-loading">Loading graph...</p>;
  if (graph.isError) return <p className="detail-panel-loading">Unable to load graph right now.</p>;
  if (!filtered || filtered.nodes.every((node) => node.hidden)) return <p className="detail-panel-loading">No graph data available.</p>;

  return (
    <ReactFlowProvider>
      <section className="graph-page-layout">
        <GraphToolbar
          query={query}
          onQueryChange={setQuery}
          kind={kind}
          onKindChange={setKind}
          status={status}
          statuses={statuses}
          onStatusChange={setStatus}
          onFitView={() => {
            setSelectedId(null);
            setFitTrigger((value) => value + 1);
          }}
          onReset={() => {
            setQuery("");
            setKind("all");
            setStatus("all");
            setSelectedId(null);
            setFitTrigger((value) => value + 1);
          }}
        />
        <GraphCanvas
          nodes={filtered.nodes}
          edges={filtered.edges}
          selectedId={selectedId}
          fitTrigger={fitTrigger}
          onNodeSelect={setSelectedId}
        />
        <GraphDetailsPanel node={selectedNodeData} edges={filtered.edges} onClose={() => setSelectedId(null)} />
      </section>
    </ReactFlowProvider>
  );
}
