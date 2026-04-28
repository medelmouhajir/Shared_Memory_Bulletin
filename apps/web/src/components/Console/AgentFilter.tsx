import { useAgents } from "../../hooks/useAgents";
import { useUiStore } from "../../store/ui";

export function AgentFilter() {
  const agents = useAgents();
  const agentId = useUiStore((state) => state.consoleAgentId);
  const setAgentId = useUiStore((state) => state.setConsoleAgentId);

  return (
    <label>
      Agent
      {" "}
      <select value={agentId ?? ""} onChange={(event) => setAgentId(event.target.value || null)}>
        <option value="">All agents</option>
        {(agents.data ?? []).map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
    </label>
  );
}
