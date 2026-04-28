import { useWorkflowGraph } from "../../hooks/useWorkflowGraph";
import { GraphNode } from "./GraphNode";

export function DependencyGraph() {
  const graph = useWorkflowGraph();

  if (!graph.data) return <p className="detail-panel-loading">Loading graph…</p>;

  return (
    <section className="graph-view surface-dark">
      <svg viewBox="0 0 900 500" role="img" aria-label="Dependency graph">
        {graph.data.edges.map((edge, index) => (
          <line
            key={`${edge.upstream_id}-${edge.downstream_id}`}
            x1={120 + index * 80}
            y1="120"
            x2={180 + index * 80}
            y2="260"
            markerEnd="url(#arrow)"
          />
        ))}
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" />
          </marker>
        </defs>
        {graph.data.nodes.map((node, index) => (
          <GraphNode key={node.id} node={node} x={80 + (index % 8) * 100} y={80 + Math.floor(index / 8) * 120} />
        ))}
      </svg>
    </section>
  );
}
