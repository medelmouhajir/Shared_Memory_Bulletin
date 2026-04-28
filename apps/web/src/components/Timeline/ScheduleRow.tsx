import type { Memory } from "@openclaw/types";

import { formatTime } from "../../lib/time";
import { StatusBadge } from "../shared/StatusBadge";

export function ScheduleRow({ memory }: { memory: Memory }) {
  return (
    <article className="timeline-row">
      <StatusBadge status={memory.status} />
      <strong>{memory.title}</strong>
      <time>{formatTime(memory.scheduled_at)}</time>
    </article>
  );
}
