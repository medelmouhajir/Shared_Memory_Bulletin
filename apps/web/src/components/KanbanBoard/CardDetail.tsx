import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MemoryStatus } from "@openclaw/types";

import { api } from "../../lib/api";
import { formatTime } from "../../lib/time";
import { useUiStore } from "../../store/ui";
import { useMemoryMutations } from "../../hooks/useMemoryMutations";
import { useAgents } from "../../hooks/useAgents";
import { StatusBadge } from "../shared/StatusBadge";

const statuses: MemoryStatus[] = ["created", "scheduled", "triggered", "seen", "inprogress", "finished", "fail"];

export function CardDetail() {
  const selectedMemoryId = useUiStore((state) => state.selectedMemoryId);
  const setSelectedMemoryId = useUiStore((state) => state.setSelectedMemoryId);
  const { removeMemory, updateStatus, triggerMemory, retryMemory, duplicateMemory, quickEditMemory } = useMemoryMutations();
  const agents = useAgents();
  const [statusValue, setStatusValue] = useState<MemoryStatus | "">("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [priority, setPriority] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
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
  const selectedAssignee = assignedTo ?? memory?.assigned_to ?? "";
  const selectedPriority = priority ?? memory?.priority ?? 2;
  const selectedSchedule = scheduledAt ?? (memory?.scheduled_at ? new Date(memory.scheduled_at).toISOString().slice(0, 16) : "");
  const actionPending =
    removeMemory.isPending ||
    updateStatus.isPending ||
    triggerMemory.isPending ||
    retryMemory.isPending ||
    duplicateMemory.isPending ||
    quickEditMemory.isPending;

  if (!selectedMemoryId) return null;

  const handleDelete = async () => {
    if (!memory) return;
    const confirmed = window.confirm(`Delete "${memory.title}" permanently?\n\nThis action cannot be undone.`);
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

  const handleTrigger = async () => {
    if (!memory) return;
    setFeedback(null);
    try {
      await triggerMemory.mutateAsync(memory.id);
      setFeedback("Manual trigger sent.");
    } catch {
      setFeedback("Failed to trigger memory.");
    }
  };

  const handleRetry = async () => {
    if (!memory) return;
    setFeedback(null);
    try {
      await retryMemory.mutateAsync({ id: memory.id, scheduledAt: memory.scheduled_at });
      setFeedback("Task moved back to active queue.");
    } catch {
      setFeedback("Failed to retry task.");
    }
  };

  const handleDuplicate = async () => {
    if (!memory) return;
    setFeedback(null);
    try {
      await duplicateMemory.mutateAsync(memory);
      setFeedback("Task duplicated.");
    } catch {
      setFeedback("Failed to duplicate task.");
    }
  };

  const handleQuickEdit = async () => {
    if (!memory) return;
    setFeedback(null);
    try {
      await quickEditMemory.mutateAsync({
        id: memory.id,
        assigned_to: selectedAssignee.trim() ? selectedAssignee.trim() : null,
        scheduled_at: selectedSchedule ? new Date(selectedSchedule).getTime() : null,
        priority: Number(selectedPriority),
      });
      setAssignedTo(null);
      setPriority(null);
      setScheduledAt(null);
      setFeedback("Task details updated.");
    } catch {
      setFeedback("Failed to update task details.");
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
          <div className="detail-panel-meta-grid">
            <p className="detail-panel-meta">Scheduled: {formatTime(memory.scheduled_at)}</p>
            <p className="detail-panel-meta">Assignee: {memory.assigned_to ?? "Unassigned"}</p>
            <p className="detail-panel-meta">Priority: P{memory.priority}</p>
          </div>
          <div className="detail-panel-actions">
            <h3 className="detail-panel-section">Quick actions</h3>
            <div className="detail-panel-action-row">
              <button type="button" className="detail-panel-btn detail-panel-btn--primary" onClick={handleTrigger} disabled={actionPending}>
                {triggerMemory.isPending ? "Triggering…" : "Trigger now"}
              </button>
              <button type="button" className="detail-panel-btn" onClick={handleRetry} disabled={actionPending}>
                {retryMemory.isPending ? "Retrying…" : "Retry task"}
              </button>
              <button type="button" className="detail-panel-btn" onClick={handleDuplicate} disabled={actionPending}>
                {duplicateMemory.isPending ? "Duplicating…" : "Duplicate"}
              </button>
            </div>

            <h3 className="detail-panel-section">Quick edit</h3>
            <div className="detail-panel-edit-grid">
              <label className="detail-panel-select-wrap">
                Assign to
                <select value={selectedAssignee} onChange={(e) => setAssignedTo(e.target.value)} disabled={actionPending}>
                  <option value="">Unassigned</option>
                  {(agents.data ?? []).map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="detail-panel-select-wrap">
                Priority
                <select value={selectedPriority} onChange={(e) => setPriority(Number(e.target.value))} disabled={actionPending}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      P{value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="detail-panel-select-wrap">
                Schedule
                <input type="datetime-local" value={selectedSchedule} onChange={(e) => setScheduledAt(e.target.value)} disabled={actionPending} />
              </label>
              <button type="button" className="detail-panel-btn detail-panel-btn--primary" onClick={handleQuickEdit} disabled={actionPending}>
                {quickEditMemory.isPending ? "Saving…" : "Save details"}
              </button>
            </div>

            <h3 className="detail-panel-section">Workflow status</h3>
            <label className="detail-panel-select-wrap">
              Move to
              <select value={selectedStatus} onChange={(e) => setStatusValue(e.target.value as MemoryStatus)} disabled={actionPending}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="detail-panel-btn" onClick={handleStatusSave} disabled={actionPending || !selectedStatus || selectedStatus === memory.status}>
              {updateStatus.isPending ? "Saving…" : "Save status"}
            </button>

            <div className="detail-panel-danger-zone">
              <p>Removing a task permanently deletes it.</p>
              <button type="button" className="detail-panel-btn detail-panel-btn--danger" onClick={handleDelete} disabled={actionPending}>
                {removeMemory.isPending ? "Removing…" : "Remove memory"}
              </button>
            </div>
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
