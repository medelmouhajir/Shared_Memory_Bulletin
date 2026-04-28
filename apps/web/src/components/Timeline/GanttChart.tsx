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
            <strong>{memory.assigned_to ?? "unassigned"}</strong>
            <span>{memory.title}</span>
            <time>{formatTime(memory.scheduled_at)}</time>
          </article>
        ))}
    </section>
  );
}
