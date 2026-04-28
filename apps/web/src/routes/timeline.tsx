import { GanttChart } from "../components/Timeline/GanttChart";
import { PageHeader } from "../components/shared/PageHeader";
import { useMemories } from "../hooks/useMemories";

export function TimelineRoute() {
  const memories = useMemories();
  const scheduled = (memories.data ?? []).filter((m) => m.scheduled_at).length;
  const subtitle = memories.isLoading ? "Loading…" : `${scheduled} scheduled`;

  return (
    <>
      <PageHeader title="Scheduler timeline" subtitle={subtitle} />
      <GanttChart />
    </>
  );
}
