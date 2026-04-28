import { Handle, Position, type NodeProps } from "reactflow";

import type { GraphNodeData } from "../graphMapper";

export function MemoryFlowNode({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div className={`flow-node flow-node-memory ${selected ? "flow-node-selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <p className="flow-node-kicker">Memory</p>
      <h3 title={data.label}>{data.label}</h3>
      <p className="flow-node-meta">
        <span className={`flow-status flow-status-${String(data.status)}`}>{String(data.status)}</span>
        <span>{data.inbound} in</span>
      </p>
      {data.assignedTo ? <p className="flow-node-assignee">Assigned to {data.assignedTo}</p> : null}
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  );
}
