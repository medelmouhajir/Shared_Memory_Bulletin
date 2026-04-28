import { useEffect, useState } from "react";

import { useWebSocket } from "../../hooks/useWebSocket";
import { useUiStore } from "../../store/ui";

type Line = {
  agentId: string;
  stream: "stdout" | "stderr";
  line: string;
};

export function LiveTerminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const agentId = useUiStore((state) => state.consoleAgentId);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe((message) => {
      if (message.type === "console:output") {
        setLines((current) => [
          ...current.slice(-499),
          { agentId: message.agent_id, stream: message.stream, line: message.line },
        ]);
      }
    });
  }, [subscribe]);

  return (
    <pre className="terminal">
      {lines
        .filter((line) => !agentId || line.agentId === agentId)
        .map((line, index) => (
          <span key={`${line.agentId}-${index}`} className={line.stream}>
            [{line.agentId}] {line.line}
            {"\n"}
          </span>
        ))}
    </pre>
  );
}
