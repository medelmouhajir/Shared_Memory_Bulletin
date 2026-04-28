import { AgentFilter } from "../components/Console/AgentFilter";
import { LiveTerminal } from "../components/Console/LiveTerminal";
import { PageHeader } from "../components/shared/PageHeader";

export function ConsoleRoute() {
  return (
    <>
      <PageHeader title="Live console" subtitle="Streamed output from agents" />
      <div className="console-filter">
        <AgentFilter />
      </div>
      <div className="surface-dark">
        <LiveTerminal />
      </div>
    </>
  );
}
