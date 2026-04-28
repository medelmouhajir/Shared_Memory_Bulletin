import type { Agent } from "@openclaw/types";

import { relativeTime } from "../../lib/time";
import { StatusBadge } from "../shared/StatusBadge";

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article className="panel agent-card">
      <div>
        <h3>{agent.name}</h3>
        <p>{agent.description ?? "No description"}</p>
      </div>
      <StatusBadge status={agent.status} />
      <small>Last pulse: {relativeTime(agent.last_seen)}</small>
    </article>
  );
}
