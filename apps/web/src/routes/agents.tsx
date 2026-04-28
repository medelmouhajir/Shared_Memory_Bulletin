import { PulseGrid } from "../components/Agents/PulseGrid";
import { PageHeader } from "../components/shared/PageHeader";
import { useAgents } from "../hooks/useAgents";

export function AgentsRoute() {
  const agents = useAgents();
  const list = agents.data ?? [];
  const subtitle = agents.isLoading ? "Loading…" : list.length === 1 ? "1 agent" : `${list.length} agents`;
  const avatarLabels = list.map((a) => a.name);

  return (
    <>
      <PageHeader title="Agent pulse" subtitle={subtitle} {...(avatarLabels.length > 0 ? { avatarLabels } : {})} />
      <PulseGrid />
    </>
  );
}
