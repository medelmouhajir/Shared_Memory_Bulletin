import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateMemoryInput, Memory, MemoryStatus } from "@openclaw/types";

import { api } from "../lib/api";

type MemoryDetail = { memory: Memory; events: Array<{ id: number; event_type: string; ts: number }> };

function patchMemoryInList(memories: Memory[] | undefined, id: string, patch: Partial<Memory>): Memory[] | undefined {
  if (!memories) return memories;
  return memories.map((memory) => (memory.id === id ? { ...memory, ...patch } : memory));
}

export function useMemoryMutations() {
  const queryClient = useQueryClient();

  const createMemory = useMutation({
    mutationFn: (input: CreateMemoryInput) => api.memories.create(input),
    onSuccess: (memory) => {
      queryClient.setQueriesData({ queryKey: ["memories"] }, (old: Memory[] | undefined) =>
        old ? [memory, ...old] : old,
      );
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MemoryStatus }) => api.memories.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["memories"] });
      const previousLists = queryClient.getQueriesData<Memory[]>({ queryKey: ["memories"] });
      const previousDetail = queryClient.getQueryData<MemoryDetail>(["memory", id]);

      queryClient.setQueriesData({ queryKey: ["memories"] }, (old: Memory[] | undefined) =>
        patchMemoryInList(old, id, { status }),
      );
      queryClient.setQueryData(["memory", id], (old: MemoryDetail | undefined) =>
        old ? { ...old, memory: { ...old.memory, status } } : old,
      );

      return { previousLists, previousDetail };
    },
    onError: (_error, { id }, context) => {
      context?.previousLists.forEach(([key, value]) => queryClient.setQueryData(key, value));
      queryClient.setQueryData(["memory", id], context?.previousDetail);
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory", id] });
    },
  });

  const removeMemory = useMutation({
    mutationFn: (id: string) => api.memories.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["memories"] });
      const previousLists = queryClient.getQueriesData<Memory[]>({ queryKey: ["memories"] });
      const previousDetail = queryClient.getQueryData<MemoryDetail>(["memory", id]);

      queryClient.setQueriesData({ queryKey: ["memories"] }, (old: Memory[] | undefined) =>
        patchMemoryInList(old, id, { status: "fail" }),
      );
      queryClient.setQueryData(["memory", id], (old: MemoryDetail | undefined) =>
        old ? { ...old, memory: { ...old.memory, status: "fail" } } : old,
      );

      return { previousLists, previousDetail };
    },
    onError: (_error, id, context) => {
      context?.previousLists.forEach(([key, value]) => queryClient.setQueryData(key, value));
      queryClient.setQueryData(["memory", id], context?.previousDetail);
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory", id] });
    },
  });

  return { createMemory, updateStatus, removeMemory };
}
