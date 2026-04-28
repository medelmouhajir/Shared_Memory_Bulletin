import { Handle, Position, type NodeProps } from "reactflow";

import type { GraphNodeData } from "../graphMapper";

export function AgentFlowNode({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div className={`flow-node flow-node-agent ${selected ? "flow-node-selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <p className="flow-node-kicker">Agent</p>
      <h3 title={data.label}>{data.label}</h3>
      <p className="flow-node-meta">
        <span className={`flow-status flow-status-${String(data.status)}`}>{String(data.status)}</span>
        <span>{data.outbound} out</span>
      </p>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  );
}
