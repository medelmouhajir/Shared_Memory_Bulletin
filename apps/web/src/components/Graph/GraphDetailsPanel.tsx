import type { Edge } from "reactflow";

import type { GraphNodeData } from "./graphMapper";

type Props = {
  node: GraphNodeData | null;
  edges: Edge[];
  onClose: () => void;
};

export function GraphDetailsPanel({ node, edges, onClose }: Props) {
  if (!node) {
    return (
      <aside className="graph-details panel">
        <h3>Details</h3>
        <p>Select a node to inspect dependencies and metadata.</p>
      </aside>
    );
  }

  const upstream = edges.filter((edge) => edge.target === node.id).map((edge) => edge.source);
  const downstream = edges.filter((edge) => edge.source === node.id).map((edge) => edge.target);

  return (
    <aside className="graph-details panel" aria-live="polite">
      <button type="button" className="graph-details-close" onClick={onClose}>
        Clear selection
      </button>
      <h3>{node.label}</h3>
      <p className="graph-details-id">{node.id}</p>
      <div className="graph-details-pills">
        <span>{node.kind}</span>
        <span>{String(node.status)}</span>
      </div>
      {node.assignedTo ? <p className="graph-details-assignee">Assigned to {node.assignedTo}</p> : null}
      <p>
        <strong>Inbound:</strong> {node.inbound}
      </p>
      <p>
        <strong>Outbound:</strong> {node.outbound}
      </p>
      <section>
        <h4>Upstream</h4>
        {upstream.length ? <ul>{upstream.map((id) => <li key={id}>{id}</li>)}</ul> : <p>None</p>}
      </section>
      <section>
        <h4>Downstream</h4>
        {downstream.length ? <ul>{downstream.map((id) => <li key={id}>{id}</li>)}</ul> : <p>None</p>}
      </section>
    </aside>
  );
}
