import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Memory, MemoryFilters } from "@openclaw/types";

import { api } from "../lib/api";
import { useWebSocket } from "./useWebSocket";

export function useMemories(filters?: MemoryFilters) {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe((message) => {
      if (message.type === "memory:created" || message.type === "memory:updated") {
        queryClient.invalidateQueries({ queryKey: ["memories"] });
      }
      if (message.type === "memory:updated") {
        queryClient.setQueryData(["memory", message.id], (old: Memory | undefined) =>
          old ? { ...old, ...message.patch } : old,
        );
      }
    });
  }, [queryClient, subscribe]);

  return useQuery({
    queryKey: ["memories", filters],
    queryFn: () => api.memories.list(filters),
    staleTime: 30_000,
  });
}
