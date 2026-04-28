import type {
  Agent,
  CreateAgentInput,
  EventFilters,
  CreateMemoryInput,
  CreateScheduleInput,
  Dependency,
  Memory,
  MemoryFilters,
  OpenClawEvent,
  Schedule,
  UpdateMemoryInput,
  UpdateScheduleInput,
  WorkflowGraph,
} from "@openclaw/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";
const TOKEN = import.meta.env.VITE_OPENCLAW_TOKEN ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenClaw API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function qs(filters?: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const api = {
  agents: {
    list: () => request<{ agents: Agent[] }>("/agents").then((r) => r.agents),
    get: (id: string) => request<{ agent: Agent }>(`/agents/${id}`).then((r) => r.agent),
    status: () => request<{ status: Record<string, number> }>("/agents/status").then((r) => r.status),
    create: (input: CreateAgentInput) =>
      request<{ agent: Agent }>("/agents", { method: "POST", body: JSON.stringify(input) }).then((r) => r.agent),
    heartbeat: (id: string) =>
      request<{ agent: Agent }>(`/agents/${id}/heartbeat`, { method: "PATCH" }).then((r) => r.agent),
    remove: (id: string) => request<{ ok: true }>(`/agents/${id}`, { method: "DELETE" }),
  },
  memories: {
    list: (filters?: MemoryFilters) => request<{ memories: Memory[] }>(`/memories${qs(filters)}`).then((r) => r.memories),
    get: (id: string) => request<{ memory: Memory; events: OpenClawEvent[] }>(`/memories/${id}`),
    create: (input: CreateMemoryInput) =>
      request<{ memory: Memory }>("/memories", { method: "POST", body: JSON.stringify(input) }).then((r) => r.memory),
    update: (id: string, input: UpdateMemoryInput) =>
      request<{ memory: Memory }>(`/memories/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then((r) => r.memory),
    remove: (id: string) =>
      request<{ memory: Memory }>(`/memories/${id}`, { method: "DELETE" }).then((r) => r.memory),
    trigger: (id: string) => request<{ ok: true }>(`/memories/${id}/trigger`, { method: "POST" }),
  },
  scheduler: {
    list: () => request<{ schedules: Schedule[] }>("/scheduler").then((r) => r.schedules),
    create: (input: CreateScheduleInput) =>
      request<{ schedule: Schedule }>("/scheduler", { method: "POST", body: JSON.stringify(input) }).then((r) => r.schedule),
    update: (id: string, input: UpdateScheduleInput) =>
      request<{ schedule: Schedule }>(`/scheduler/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then((r) => r.schedule),
  },
  workflow: {
    graph: () => request<WorkflowGraph>("/workflow/graph"),
    addDependency: (input: Dependency) =>
      request<{ dependency: Dependency }>("/workflow/dependencies", { method: "POST", body: JSON.stringify(input) }),
  },
  events: {
    list: (filters?: EventFilters) => request<{ events: OpenClawEvent[] }>(`/events${qs(filters)}`).then((r) => r.events),
  },
};
