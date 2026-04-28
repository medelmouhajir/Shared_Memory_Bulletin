import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { useWebSocket } from "./useWebSocket";

export function useAgents() {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe((message) => {
      if (message.type === "agent:status" || message.type === "zombie:detected") {
        queryClient.invalidateQueries({ queryKey: ["agents"] });
        queryClient.invalidateQueries({ queryKey: ["agent-status"] });
      }
    });
  }, [queryClient, subscribe]);

  return useQuery({
    queryKey: ["agents"],
    queryFn: api.agents.list,
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: ["agent-status"],
    queryFn: api.agents.status,
  });
}
