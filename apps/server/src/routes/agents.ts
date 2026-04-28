import { Hono } from "hono";
import { createAgentSchema, type Agent } from "@openclaw/types";

import type { AppEnv } from "../app-env";
import { notFound } from "../lib/http";
import { broadcast } from "../ws/broadcast";

export const agentsRoute = new Hono<AppEnv>();

agentsRoute.get("/", (c) => {
  const db = c.get("db");
  const agents = db.query("SELECT * FROM agents ORDER BY created_at DESC").all() as Agent[];
  return c.json({ agents });
});

agentsRoute.get("/status", (c) => {
  const db = c.get("db");
  const rows = db
    .query("SELECT status, COUNT(*) as count FROM agents GROUP BY status")
    .all() as Array<{ status: Agent["status"]; count: number }>;

  return c.json({
    status: {
      active: rows.find((row) => row.status === "active")?.count ?? 0,
      idle: rows.find((row) => row.status === "idle")?.count ?? 0,
      zombie: rows.find((row) => row.status === "zombie")?.count ?? 0,
      offline: rows.find((row) => row.status === "offline")?.count ?? 0,
    },
  });
});

agentsRoute.post("/", async (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const input = createAgentSchema.parse(await c.req.json());
  const id = input.id ?? crypto.randomUUID();

  const agent = db
    .query(
      `INSERT INTO agents (id, name, description, status, created_at)
       VALUES (?, ?, ?, 'idle', ?)
       RETURNING *`,
    )
    .get(id, input.name, input.description ?? null, Date.now()) as Agent;

  events.logEvent({ agent_id: agent.id, event_type: "agent:registered", payload: agent });
  broadcast({ type: "agent:status", agent });
  return c.json({ agent }, 201);
});

agentsRoute.patch("/:id/heartbeat", (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const id = c.req.param("id");
  const now = Date.now();

  const agent = db
    .query(
      `UPDATE agents SET last_seen = ?, status = CASE WHEN status = 'zombie' THEN 'active' ELSE status END
       WHERE id = ?
       RETURNING *`,
    )
    .get(now, id) as Agent | null;

  if (!agent) notFound("Agent not found");

  events.logEvent({ agent_id: id, event_type: "agent:heartbeat", payload: { last_seen: now } });
  broadcast({ type: "agent:status", agent });
  return c.json({ agent });
});

agentsRoute.delete("/:id", (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const id = c.req.param("id");
  const agent = db.query("SELECT * FROM agents WHERE id = ?").get(id) as Agent | null;
  if (!agent) notFound("Agent not found");

  db.query("DELETE FROM agents WHERE id = ?").run(id);
  events.logEvent({ agent_id: id, event_type: "agent:deleted", payload: agent });
  return c.json({ ok: true });
});
