import { useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api";
import { formatTime } from "../../lib/time";
import { useUiStore } from "../../store/ui";
import { StatusBadge } from "../shared/StatusBadge";

export function CardDetail() {
  const selectedMemoryId = useUiStore((state) => state.selectedMemoryId);
  const setSelectedMemoryId = useUiStore((state) => state.setSelectedMemoryId);
  const query = useQuery({
    queryKey: ["memory", selectedMemoryId],
    queryFn: () => api.memories.get(selectedMemoryId as string),
    enabled: Boolean(selectedMemoryId),
  });

  if (!selectedMemoryId) return null;

  return (
    <aside className="detail-panel">
      <button type="button" className="detail-panel-close" onClick={() => setSelectedMemoryId(null)}>
        Close
      </button>
      {query.data ? (
        <>
          <h2 className="detail-panel-title">{query.data.memory.title}</h2>
          <StatusBadge status={query.data.memory.status} />
          <p className="detail-panel-body">{query.data.memory.body ?? "No body"}</p>
          <p className="detail-panel-meta">Scheduled: {formatTime(query.data.memory.scheduled_at)}</p>
          <h3 className="detail-panel-section">Audit trail</h3>
          <ol className="detail-panel-list">
            {query.data.events.map((event) => (
              <li key={event.id}>
                {event.event_type} at {formatTime(event.ts)}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="detail-panel-loading">Loading memory…</p>
      )}
    </aside>
  );
}
