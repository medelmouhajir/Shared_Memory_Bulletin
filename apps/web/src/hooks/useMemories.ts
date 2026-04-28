import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Memory, MemoryFilters, OpenClawEvent } from "@openclaw/types";

import { api } from "../lib/api";
import { useWebSocket } from "./useWebSocket";

export function useMemories(filters?: MemoryFilters) {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe((message) => {
      if (message.type === "memory:created") {
        queryClient.setQueriesData({ queryKey: ["memories"] }, (old: Memory[] | undefined) =>
          old ? [message.memory, ...old.filter((memory) => memory.id !== message.memory.id)] : old,
        );
        return;
      }
      if (message.type === "memory:updated") {
        queryClient.setQueriesData({ queryKey: ["memories"] }, (old: Memory[] | undefined) =>
          old?.map((memory) => (memory.id === message.id ? { ...memory, ...message.patch } : memory)),
        );
        queryClient.setQueryData(
          ["memory", message.id],
          (old: { memory: Memory; events: OpenClawEvent[] } | undefined) =>
            old ? { ...old, memory: { ...old.memory, ...message.patch } } : old,
        );
        queryClient.invalidateQueries({ queryKey: ["memories"] });
      }
    });
  }, [queryClient, subscribe]);

  return useQuery({
    queryKey: ["memories", filters],
    queryFn: () => api.memories.list(filters),
    staleTime: 30_000,
  });
}
