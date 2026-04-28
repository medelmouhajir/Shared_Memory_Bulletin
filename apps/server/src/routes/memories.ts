import { Hono } from "hono";
import {
  createMemorySchema,
  memoryFiltersSchema,
  updateMemorySchema,
  type Memory,
} from "@openclaw/types";

import type { AppEnv } from "../app-env";
import { notFound } from "../lib/http";
import { triggerWakeUp } from "../engine/wake-up";
import { broadcast } from "../ws/broadcast";

export const memoriesRoute = new Hono<AppEnv>();

function listMemories(db: AppEnv["Variables"]["db"], search: URLSearchParams): Memory[] {
  const filters = memoryFiltersSchema.parse(Object.fromEntries(search));
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters.status) {
    clauses.push(`status IN (${filters.status.split(",").map(() => "?").join(",")})`);
    params.push(...filters.status.split(","));
  }
  if (filters.assigned_to) {
    clauses.push("assigned_to = ?");
    params.push(filters.assigned_to);
  }
  if (filters.type) {
    clauses.push(`type IN (${filters.type.split(",").map(() => "?").join(",")})`);
    params.push(...filters.type.split(","));
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.query(`SELECT * FROM memories ${where} ORDER BY created_at DESC`).all(...params) as Memory[];
}

memoriesRoute.get("/", (c) => {
  const memories = listMemories(c.get("db"), new URL(c.req.url).searchParams);
  return c.json({ memories });
});

memoriesRoute.post("/", async (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const input = createMemorySchema.parse(await c.req.json());
  const now = Date.now();
  const status = input.scheduled_at ? "scheduled" : "created";

  const memory = db
    .query(
      `INSERT INTO memories
       (type, title, body, priority, assigned_to, created_by, status, scheduled_at, max_retries, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
    )
    .get(
      input.type,
      input.title,
      input.body ?? null,
      input.priority,
      input.assigned_to ?? null,
      input.created_by ?? null,
      status,
      input.scheduled_at ?? null,
      input.max_retries,
      now,
      now,
    ) as Memory;

  events.logEvent({ memory_id: memory.id, agent_id: memory.created_by, event_type: "memory:created", payload: memory });
  broadcast({ type: "memory:created", memory });

  if (memory.assigned_to && !memory.scheduled_at) {
    await triggerWakeUp({ db, events, config: c.get("config"), memory });
  }

  return c.json({ memory }, 201);
});

memoriesRoute.get("/:id", (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const memory = db.query("SELECT * FROM memories WHERE id = ?").get(id) as Memory | null;
  if (!memory) notFound("Memory not found");
  const events = db
    .query("SELECT * FROM events WHERE memory_id = ? ORDER BY ts ASC")
    .all(id);
  return c.json({ memory, events });
});

memoriesRoute.patch("/:id", async (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const id = c.req.param("id");
  const input = updateMemorySchema.parse(await c.req.json());
  const existing = db.query("SELECT * FROM memories WHERE id = ?").get(id) as Memory | null;
  if (!existing) notFound("Memory not found");

  const patch = {
    title: input.title ?? existing.title,
    body: input.body === undefined ? existing.body : input.body,
    priority: input.priority ?? existing.priority,
    assigned_to: input.assigned_to === undefined ? existing.assigned_to : input.assigned_to,
    status: input.status ?? existing.status,
    scheduled_at: input.scheduled_at === undefined ? existing.scheduled_at : input.scheduled_at,
    seen_at: input.status === "seen" && !existing.seen_at ? Date.now() : existing.seen_at,
    finished_at:
      (input.status === "finished" || input.status === "fail") && !existing.finished_at
        ? Date.now()
        : existing.finished_at,
    updated_at: Date.now(),
  };

  const memory = db
    .query(
      `UPDATE memories
       SET title = ?, body = ?, priority = ?, assigned_to = ?, status = ?, scheduled_at = ?,
           seen_at = ?, finished_at = ?, updated_at = ?
       WHERE id = ?
       RETURNING *`,
    )
    .get(
      patch.title,
      patch.body,
      patch.priority,
      patch.assigned_to,
      patch.status,
      patch.scheduled_at,
      patch.seen_at,
      patch.finished_at,
      patch.updated_at,
      id,
    ) as Memory;

  const outboundPatch: Partial<Memory> = {};
  if (input.title !== undefined) outboundPatch.title = input.title;
  if (input.body !== undefined) outboundPatch.body = input.body;
  if (input.priority !== undefined) outboundPatch.priority = input.priority;
  if (input.assigned_to !== undefined) outboundPatch.assigned_to = input.assigned_to;
  if (input.status !== undefined) outboundPatch.status = input.status;
  if (input.scheduled_at !== undefined) outboundPatch.scheduled_at = input.scheduled_at;

  events.logEvent({ memory_id: id, agent_id: memory.assigned_to, event_type: "memory:updated", payload: input });
  if (input.status === "seen" && memory.assigned_to) {
    events.logEvent({ memory_id: id, agent_id: memory.assigned_to, event_type: "wake_up:acked" });
    broadcast({ type: "wake_up:acked", memory_id: id, agent_id: memory.assigned_to, ts: Date.now() });
  }
  broadcast({ type: "memory:updated", id, patch: outboundPatch });
  return c.json({ memory });
});

memoriesRoute.delete("/:id", (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const id = c.req.param("id");
  const memory = db
    .query("UPDATE memories SET status = 'fail', updated_at = ?, finished_at = ? WHERE id = ? RETURNING *")
    .get(Date.now(), Date.now(), id) as Memory | null;
  if (!memory) notFound("Memory not found");
  events.logEvent({ memory_id: id, agent_id: memory.assigned_to, event_type: "memory:deleted" });
  broadcast({ type: "memory:updated", id, patch: { status: "fail", finished_at: memory.finished_at } });
  return c.json({ memory });
});

memoriesRoute.post("/:id/trigger", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const memory = db.query("SELECT * FROM memories WHERE id = ?").get(id) as Memory | null;
  if (!memory) notFound("Memory not found");
  await triggerWakeUp({ db, events: c.get("events"), config: c.get("config"), memory });
  return c.json({ ok: true });
});
