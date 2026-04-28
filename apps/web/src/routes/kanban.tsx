import { useState } from "react";

import { Board } from "../components/KanbanBoard/Board";
import { PageHeader } from "../components/shared/PageHeader";
import { useAgents } from "../hooks/useAgents";
import { useMemories } from "../hooks/useMemories";

export function KanbanRoute() {
  const [search, setSearch] = useState("");
  const memories = useMemories();
  const agents = useAgents();
  const total = memories.data?.length ?? 0;
  const avatarLabels = (agents.data ?? []).map((a) => a.name);

  return (
    <>
      <PageHeader
        title="Kanban Board"
        subtitle={total === 1 ? "1 memory" : `${total} memories`}
        search={{ value: search, onChange: setSearch, placeholder: "Search tasks…" }}
        {...(avatarLabels.length > 0 ? { avatarLabels } : {})}
      />
      <Board titleFilter={search} />
    </>
  );
}
