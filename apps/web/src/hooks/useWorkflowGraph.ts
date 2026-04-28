import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";

export function useWorkflowGraph() {
  return useQuery({
    queryKey: ["workflow-graph"],
    queryFn: api.workflow.graph,
  });
}
