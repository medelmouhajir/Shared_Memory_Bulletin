import type { AgentStatus } from "@openclaw/types";
import { useMemo, useState } from "react";

import { useAgents, useAgentStatus } from "../../hooks/useAgents";
import { AgentCard } from "./AgentCard";

export function PulseGrid() {
  const agents = useAgents();
  const status = useAgentStatus();
  const [selectedStatus, setSelectedStatus] = useState<"all" | AgentStatus>("all");

  if (agents.isLoading) return <p className="detail-panel-loading">Loading agents…</p>;

  const filteredAgents = useMemo(
    () => (selectedStatus === "all" ? agents.data ?? [] : (agents.data ?? []).filter((agent) => agent.status === selectedStatus)),
    [agents.data, selectedStatus],
  );
  const statusOrder: Array<AgentStatus> = ["active", "idle", "zombie", "offline"];

  return (
    <section>
      <div className="stats-bar">
        <button
          type="button"
          className={`stats-chip ${selectedStatus === "all" ? "stats-chip--active" : ""}`}
          onClick={() => setSelectedStatus("all")}
        >
          all: {(agents.data ?? []).length}
        </button>
        {statusOrder.map((key) => (
          <button
            type="button"
            key={key}
            className={`stats-chip ${selectedStatus === key ? "stats-chip--active" : ""}`}
            onClick={() => setSelectedStatus(key)}
          >
            {key}: {status.data?.[key] ?? 0}
          </button>
        ))}
      </div>
      <div className="grid">
        {filteredAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
