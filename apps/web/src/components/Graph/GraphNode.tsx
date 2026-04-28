import type { WorkflowGraph } from "@openclaw/types";

type Node = WorkflowGraph["nodes"][number];

export function GraphNode({ node, x, y }: { node: Node; x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {node.kind === "agent" ? <polygon points="0,20 15,0 55,0 70,20 55,40 15,40" /> : <rect width="90" height="44" rx="10" />}
      <text x="10" y="26">
        {node.label}
      </text>
    </g>
  );
}
