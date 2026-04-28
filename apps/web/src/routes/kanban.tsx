import { useState, type FormEvent } from "react";

import { Board } from "../components/KanbanBoard/Board";
import { PageHeader } from "../components/shared/PageHeader";
import { useAgents } from "../hooks/useAgents";
import { useMemories } from "../hooks/useMemories";
import { useMemoryMutations } from "../hooks/useMemoryMutations";

export function KanbanRoute() {
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState(2);
  const [scheduledAt, setScheduledAt] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const memories = useMemories();
  const agents = useAgents();
  const { createMemory } = useMemoryMutations();
  const total = memories.data?.length ?? 0;
  const avatarLabels = (agents.data ?? []).map((a) => a.name);
  const canSubmit = title.trim().length > 0 && !createMemory.isPending;

  async function handleQuickAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setFeedback(null);
    try {
      await createMemory.mutateAsync({
        type: "task",
        title: title.trim(),
        priority,
        max_retries: 3,
        assigned_to: assignedTo.trim() ? assignedTo.trim() : null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).getTime() : null,
      });
      setTitle("");
      setAssignedTo("");
      setPriority(2);
      setScheduledAt("");
      setFeedback("Task added.");
    } catch {
      setFeedback("Failed to add task.");
    }
  }

  return (
    <>
      <PageHeader
        title="Kanban Board"
        subtitle={total === 1 ? "1 memory" : `${total} memories`}
        search={{ value: search, onChange: setSearch, placeholder: "Search tasks…" }}
        {...(avatarLabels.length > 0 ? { avatarLabels } : {})}
      >
        <form className="quick-add-form" onSubmit={handleQuickAddSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quick add task title"
            aria-label="Quick add task title"
          />
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} aria-label="Assign to">
            <option value="">Unassigned</option>
            {(agents.data ?? []).map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} aria-label="Priority">
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                P{value}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            aria-label="Schedule for"
          />
          <button type="submit" disabled={!canSubmit}>
            {createMemory.isPending ? "Adding…" : "Add"}
          </button>
        </form>
      </PageHeader>
      {feedback ? <p className="kanban-feedback">{feedback}</p> : null}
      <Board titleFilter={search} />
    </>
  );
}
