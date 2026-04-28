import { z } from "zod";

export const agentStatusSchema = z.enum(["idle", "active", "zombie", "offline"]);
export const memoryTypeSchema = z.enum(["task", "question", "update", "info", "schedule"]);
export const memoryStatusSchema = z.enum([
  "created",
  "scheduled",
  "triggered",
  "seen",
  "inprogress",
  "finished",
  "fail",
]);
export const eventTypeSchema = z.enum([
  "agent:registered",
  "agent:heartbeat",
  "agent:deleted",
  "memory:created",
  "memory:updated",
  "memory:deleted",
  "schedule:created",
  "schedule:updated",
  "schedule:deleted",
  "dependency:created",
  "dependency:deleted",
  "wake_up:sent",
  "wake_up:acked",
  "wake_up:retry",
  "wake_up:failed",
  "zombie:detected",
  "console:output",
]);

export type AgentStatus = z.infer<typeof agentStatusSchema>;
export type MemoryType = z.infer<typeof memoryTypeSchema>;
export type MemoryStatus = z.infer<typeof memoryStatusSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;

export const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  status: agentStatusSchema,
  last_seen: z.number().int().nullable(),
  created_at: z.number().int(),
});

export const memorySchema = z.object({
  id: z.string().min(1),
  type: memoryTypeSchema,
  title: z.string().min(1),
  body: z.string().nullable(),
  priority: z.number().int().min(1).max(5),
  assigned_to: z.string().nullable(),
  created_by: z.string().nullable(),
  status: memoryStatusSchema,
  scheduled_at: z.number().int().nullable(),
  triggered_at: z.number().int().nullable(),
  seen_at: z.number().int().nullable(),
  finished_at: z.number().int().nullable(),
  retry_count: z.number().int().min(0),
  max_retries: z.number().int().min(0),
  created_at: z.number().int(),
  updated_at: z.number().int(),
});

export const eventSchema = z.object({
  id: z.number().int(),
  memory_id: z.string().nullable(),
  agent_id: z.string().nullable(),
  event_type: eventTypeSchema,
  payload: z.string().nullable(),
  ts: z.number().int(),
});

export const scheduleSchema = z.object({
  id: z.string().min(1),
  memory_id: z.string().min(1),
  cron_expr: z.string().nullable(),
  next_run_at: z.number().int(),
  last_run_at: z.number().int().nullable(),
  enabled: z.boolean(),
});

export const dependencySchema = z.object({
  upstream_id: z.string().min(1),
  downstream_id: z.string().min(1),
});

export type Agent = z.infer<typeof agentSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type OpenClawEvent = z.infer<typeof eventSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type Dependency = z.infer<typeof dependencySchema>;

export const createAgentSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export const createMemorySchema = z.object({
  type: memoryTypeSchema,
  title: z.string().min(1),
  body: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(5).default(2),
  assigned_to: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
  scheduled_at: z.number().int().optional().nullable(),
  max_retries: z.number().int().min(0).default(3),
});

export const updateMemorySchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(5).optional(),
  assigned_to: z.string().optional().nullable(),
  status: memoryStatusSchema.optional(),
  scheduled_at: z.number().int().optional().nullable(),
});

export const createScheduleSchema = z
  .object({
    memory_id: z.string().min(1),
    scheduled_at: z.number().int().optional().nullable(),
    cron_expr: z.string().optional().nullable(),
  })
  .refine((value) => value.scheduled_at || value.cron_expr, {
    message: "scheduled_at or cron_expr is required",
  });

export const updateScheduleSchema = z.object({
  scheduled_at: z.number().int().optional(),
  cron_expr: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
});

export const memoryFiltersSchema = z.object({
  status: z.string().optional(),
  assigned_to: z.string().optional(),
  type: z.string().optional(),
});

export const eventFiltersSchema = z.object({
  memory_id: z.string().optional(),
  agent_id: z.string().optional(),
  event_type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type MemoryFilters = z.infer<typeof memoryFiltersSchema>;
export type EventFilters = z.infer<typeof eventFiltersSchema>;

export type ServerToClientMessage =
  | { type: "memory:created"; memory: Memory }
  | { type: "memory:updated"; id: string; patch: Partial<Memory> }
  | { type: "agent:status"; agent: Agent }
  | { type: "wake_up:sent"; memory_id: string; agent_id: string; ts: number }
  | { type: "wake_up:acked"; memory_id: string; agent_id: string; ts: number }
  | { type: "zombie:detected"; agent_id: string; memory_id: string; idle_ms: number }
  | { type: "console:output"; agent_id: string; line: string; stream: "stdout" | "stderr" }
  | { type: "event:created"; event: OpenClawEvent };

export type ClientToServerMessage =
  | { type: "subscribe"; channels: string[] }
  | { type: "unsubscribe"; channels: string[] };

export type WorkflowGraph = {
  nodes: Array<
    | { id: string; kind: "agent"; label: string; status: AgentStatus }
    | { id: string; kind: "memory"; label: string; status: MemoryStatus; assigned_to: string | null }
  >;
  edges: Dependency[];
};
