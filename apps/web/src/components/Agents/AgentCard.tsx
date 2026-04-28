import type { Agent } from "@openclaw/types";
import { Link } from "@tanstack/react-router";

import { relativeTime } from "../../lib/time";
import { StatusBadge } from "../shared/StatusBadge";

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article className="panel agent-card">
      <Link to="/agents/$id" params={{ id: agent.id }} className="agent-card-link">
        <div>
          <h3>{agent.name}</h3>
          <p>{agent.description ?? "No description"}</p>
        </div>
        <StatusBadge status={agent.status} />
        <small>Last pulse: {relativeTime(agent.last_seen)}</small>
      </Link>
    </article>
  );
}
