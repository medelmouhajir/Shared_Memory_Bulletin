import type { Memory } from "@openclaw/types";

import { deadlineLabel, formatShortDate, timeLeftUntil } from "../../lib/time";
import { useUiStore } from "../../store/ui";
import { StatusBadge } from "../shared/StatusBadge";

function createdChipVariant(id: string): 0 | 1 | 2 | 3 {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 997;
  return (h % 4) as 0 | 1 | 2 | 3;
}

function assigneeInitials(assigned: string | null): string {
  if (!assigned?.trim()) return "?";
  const parts = assigned.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  return assigned.trim().slice(0, 2).toUpperCase();
}

export function Card({ memory }: { memory: Memory }) {
  const setSelectedMemoryId = useUiStore((state) => state.setSelectedMemoryId);
  const chip = createdChipVariant(memory.id);
  const timeLeft = timeLeftUntil(memory.scheduled_at);

  return (
    <button type="button" className="memory-card" onClick={() => setSelectedMemoryId(memory.id)}>
      <div className="memory-card-top">
        <span className={`chip-created chip-created--${chip}`}>Created · {formatShortDate(memory.created_at)}</span>
        <span className="memory-card-meta">{timeLeft ?? "—"}</span>
      </div>
      <h3 className="memory-card-title">{memory.title}</h3>
      <p className="memory-card-body">{memory.body?.trim() ? memory.body : "No description yet."}</p>
      <div className="memory-card-status">
        <StatusBadge status={memory.status} />
      </div>
      <div className="memory-card-footer">
        <span className="avatar-initials" title={memory.assigned_to ?? "Unassigned"}>
          {assigneeInitials(memory.assigned_to)}
        </span>
        <time dateTime={new Date(memory.scheduled_at ?? memory.finished_at ?? memory.created_at ?? 0).toISOString()}>
          {deadlineLabel(memory)}
        </time>
      </div>
    </button>
  );
}
