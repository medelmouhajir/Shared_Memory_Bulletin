import { useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { PageHeader } from "../components/shared/PageHeader";
import { StatusBadge } from "../components/shared/StatusBadge";
import { useAgent } from "../hooks/useAgents";
import { api } from "../lib/api";
import { formatTime, relativeTime } from "../lib/time";
import { useUiStore } from "../store/ui";

export function AgentDetailRoute() {
  const { id } = useParams({ from: "/agents/$id" });
  const agentId = id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setConsoleAgentId = useUiStore((state) => state.setConsoleAgentId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const agentQuery = useAgent(agentId);
  const eventsQuery = useQuery({
    queryKey: ["events", "agent", agentId],
    queryFn: () => api.events.list({ agent_id: agentId, limit: 100, offset: 0 }),
    enabled: Boolean(id),
  });

  const heartbeatMutation = useMutation({
    mutationFn: () => api.agents.heartbeat(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", agentId] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-status"] });
      setFeedback("Heartbeat sent.");
    },
    onError: () => setFeedback("Failed to send heartbeat."),
  });

  const removeMutation = useMutation({
    mutationFn: () => api.agents.remove(agentId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-status"] });
      setFeedback("Agent removed.");
      await navigate({ to: "/agents" });
    },
    onError: () => setFeedback("Failed to remove agent."),
  });

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const agent = agentQuery.data;

  const handleOpenConsole = async () => {
    setConsoleAgentId(agentId);
    await navigate({ to: "/console" });
  };

  const handleRemove = async () => {
    const confirmed = window.confirm("Remove this agent? This action cannot be undone.");
    if (!confirmed) return;
    setFeedback(null);
    await removeMutation.mutateAsync();
  };

  const handleBack = async () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    await navigate({ to: "/agents" });
  };

  return (
    <>
      <PageHeader
        title={agent?.name ?? "Agent details"}
        subtitle={agent ? `${agent.status} • Last pulse ${relativeTime(agent.last_seen)}` : "Loading agent…"}
      >
        <button type="button" className="agent-detail-back-link" onClick={() => void handleBack()}>
          Back
        </button>
      </PageHeader>
      <div className="agent-detail-layout">
        <section className="panel agent-detail-data">
          <div className="agent-detail-heading">
            <h2>Agent data</h2>
            {agent ? <StatusBadge status={agent.status} /> : null}
          </div>
          {agentQuery.isLoading ? <p className="detail-panel-loading">Loading agent…</p> : null}
          {agentQuery.isError ? <p className="detail-panel-loading">Unable to load this agent.</p> : null}
          {agent ? (
            <dl className="agent-detail-meta-list">
              <div>
                <dt>ID</dt>
                <dd>{agent.id}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{agent.name}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{agent.description ?? "No description"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatTime(agent.created_at)}</dd>
              </div>
              <div>
                <dt>Last pulse</dt>
                <dd>{formatTime(agent.last_seen)}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="panel agent-detail-actions">
          <h2>Actions</h2>
          <div className="agent-detail-actions-list">
            <button
              type="button"
              className="detail-panel-btn"
              disabled={heartbeatMutation.isPending || removeMutation.isPending || !agent}
              onClick={() => heartbeatMutation.mutate()}
            >
              {heartbeatMutation.isPending ? "Sending…" : "Send heartbeat"}
            </button>
            <button type="button" className="detail-panel-btn" disabled={!agent} onClick={handleOpenConsole}>
              Open in console
            </button>
            <button
              type="button"
              className="detail-panel-btn detail-panel-btn--danger"
              disabled={removeMutation.isPending || !agent}
              onClick={handleRemove}
            >
              {removeMutation.isPending ? "Removing…" : "Remove agent"}
            </button>
          </div>
          {feedback ? <p className="detail-panel-feedback">{feedback}</p> : null}
          <p className="agent-detail-next-features">
            Suggested next features: mark offline/idle, restart request, copy agent ID, export logs.
          </p>
        </section>
      </div>

      <section className="panel agent-detail-logs">
        <h2>Logs</h2>
        {eventsQuery.isLoading ? <p className="detail-panel-loading">Loading logs…</p> : null}
        {events.length === 0 && !eventsQuery.isLoading ? (
          <p className="detail-panel-loading">No logs found for this agent.</p>
        ) : null}
        {events.length > 0 ? (
          <ol className="detail-panel-list">
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.event_type}</strong> at {formatTime(event.ts)}
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </>
  );
}
