import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { getRealtimeRefetchInterval } from "../lib/realtime";
import { useWebSocket } from "./useWebSocket";

export function useAgents() {
  const queryClient = useQueryClient();
  const { subscribe, isConnected } = useWebSocket();

  useEffect(() => {
    return subscribe((message) => {
      if (message.type === "agent:status" || message.type === "zombie:detected" || message.type === "wake_up:acked") {
        queryClient.invalidateQueries({ queryKey: ["agents"] });
        queryClient.invalidateQueries({ queryKey: ["agent-status"] });
        queryClient.invalidateQueries({ queryKey: ["agent"] });
      }
    });
  }, [queryClient, subscribe]);

  return useQuery({
    queryKey: ["agents"],
    queryFn: api.agents.list,
    refetchInterval: getRealtimeRefetchInterval(isConnected),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ["agent", id],
    queryFn: () => api.agents.get(id),
    enabled: Boolean(id),
  });
}

export function useAgentStatus() {
  const { isConnected } = useWebSocket();

  return useQuery({
    queryKey: ["agent-status"],
    queryFn: api.agents.status,
    refetchInterval: getRealtimeRefetchInterval(isConnected),
  });
}
