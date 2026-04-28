import { useMemories } from "../../hooks/useMemories";
import { formatTime } from "../../lib/time";

export function GanttChart() {
  const memories = useMemories();

  return (
    <section className="timeline">
      {(memories.data ?? [])
        .filter((memory) => memory.scheduled_at)
        .map((memory) => (
          <article className="timeline-row" key={memory.id}>
            <div className="timeline-cell timeline-cell-agent">
              <small>Agent</small>
              <strong>{memory.assigned_to ?? "unassigned"}</strong>
            </div>
            <div className="timeline-cell timeline-cell-title">
              <small>Task</small>
              <span>{memory.title}</span>
            </div>
            <div className="timeline-cell timeline-cell-time">
              <small>Scheduled</small>
              <time>{formatTime(memory.scheduled_at)}</time>
            </div>
          </article>
        ))}
    </section>
  );
}
