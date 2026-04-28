import type { Memory, MemoryStatus } from "@openclaw/types";

import { useMemories } from "../../hooks/useMemories";
import { Card } from "./Card";

const statuses: MemoryStatus[] = ["created", "scheduled", "triggered", "seen", "inprogress", "finished", "fail"];

function groupByStatus(memories: Memory[]): Record<MemoryStatus, Memory[]> {
  return statuses.reduce(
    (acc, status) => {
      acc[status] = memories.filter((memory) => memory.status === status);
      return acc;
    },
    {} as Record<MemoryStatus, Memory[]>,
  );
}

function filterByTitle(memories: Memory[], titleFilter: string): Memory[] {
  const q = titleFilter.trim().toLowerCase();
  if (!q) return memories;
  return memories.filter((m) => m.title.toLowerCase().includes(q));
}

export function Board({ titleFilter = "" }: { titleFilter?: string }) {
  const memories = useMemories();
  const filtered = filterByTitle(memories.data ?? [], titleFilter);
  const grouped = groupByStatus(filtered);

  return (
    <section className="kanban">
      {statuses.map((status) => (
        <div className="kanban-column" key={status}>
          <div className="kanban-column-header">
            <h2>{status}</h2>
            <span>{grouped[status].length}</span>
          </div>
          {grouped[status].map((memory) => (
            <Card key={memory.id} memory={memory} />
          ))}
        </div>
      ))}
    </section>
  );
}
