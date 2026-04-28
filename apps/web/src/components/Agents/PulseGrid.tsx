import { useAgents, useAgentStatus } from "../../hooks/useAgents";
import { AgentCard } from "./AgentCard";

export function PulseGrid() {
  const agents = useAgents();
  const status = useAgentStatus();

  if (agents.isLoading) return <p className="detail-panel-loading">Loading agents…</p>;

  return (
    <section>
      <div className="stats-bar">
        {Object.entries(status.data ?? {}).map(([key, value]) => (
          <span key={key}>
            {key}: {value}
          </span>
        ))}
      </div>
      <div className="grid">
        {(agents.data ?? []).map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
