import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MemoryStatus } from "@openclaw/types";

import { api } from "../../lib/api";
import { formatTime } from "../../lib/time";
import { useUiStore } from "../../store/ui";
import { useMemoryMutations } from "../../hooks/useMemoryMutations";
import { StatusBadge } from "../shared/StatusBadge";

const statuses: MemoryStatus[] = ["created", "scheduled", "triggered", "seen", "inprogress", "finished", "fail"];

export function CardDetail() {
  const selectedMemoryId = useUiStore((state) => state.selectedMemoryId);
  const setSelectedMemoryId = useUiStore((state) => state.setSelectedMemoryId);
  const { removeMemory, updateStatus } = useMemoryMutations();
  const [statusValue, setStatusValue] = useState<MemoryStatus | "">("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["memory", selectedMemoryId],
    queryFn: () => api.memories.get(selectedMemoryId as string),
    enabled: Boolean(selectedMemoryId),
  });
  const memory = query.data?.memory;

  const selectedStatus = useMemo<MemoryStatus | "">(() => {
    if (statusValue) return statusValue;
    return memory?.status ?? "";
  }, [memory?.status, statusValue]);

  if (!selectedMemoryId) return null;

  const handleDelete = async () => {
    if (!memory) return;
    const confirmed = window.confirm(`Delete "${memory.title}"?\n\nThis action marks the memory as failed and cannot be undone.`);
    if (!confirmed) return;
    setFeedback(null);
    try {
      await removeMemory.mutateAsync(memory.id);
      setFeedback("Memory removed.");
      setSelectedMemoryId(null);
    } catch {
      setFeedback("Failed to remove memory.");
    }
  };

  const handleStatusSave = async () => {
    if (!memory || !selectedStatus || selectedStatus === memory.status) return;
    setFeedback(null);
    try {
      await updateStatus.mutateAsync({ id: memory.id, status: selectedStatus });
      setFeedback(`Status updated to ${selectedStatus}.`);
      setStatusValue("");
    } catch {
      setFeedback("Failed to update status.");
    }
  };

  return (
    <aside className="detail-panel">
      <button type="button" className="detail-panel-close" onClick={() => setSelectedMemoryId(null)}>
        Close
      </button>
      {memory ? (
        <>
          <h2 className="detail-panel-title">{memory.title}</h2>
          <StatusBadge status={memory.status} />
          <p className="detail-panel-body">{memory.body ?? "No body"}</p>
          <p className="detail-panel-meta">Scheduled: {formatTime(memory.scheduled_at)}</p>
          <div className="detail-panel-actions">
            <label className="detail-panel-select-wrap">
              Move to
              <select
                value={selectedStatus}
                onChange={(e) => setStatusValue(e.target.value as MemoryStatus)}
                disabled={updateStatus.isPending || removeMemory.isPending}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="detail-panel-btn"
              onClick={handleStatusSave}
              disabled={
                updateStatus.isPending || removeMemory.isPending || !selectedStatus || selectedStatus === memory.status
              }
            >
              {updateStatus.isPending ? "Saving…" : "Save status"}
            </button>
            <button
              type="button"
              className="detail-panel-btn detail-panel-btn--danger"
              onClick={handleDelete}
              disabled={removeMemory.isPending || updateStatus.isPending}
            >
              {removeMemory.isPending ? "Removing…" : "Remove memory"}
            </button>
          </div>
          {feedback ? <p className="detail-panel-feedback">{feedback}</p> : null}
          <h3 className="detail-panel-section">Audit trail</h3>
          <ol className="detail-panel-list">
            {(query.data?.events ?? []).map((event) => (
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
