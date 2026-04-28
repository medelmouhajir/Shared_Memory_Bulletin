import { Hono } from "hono";
import { dependencySchema, type Agent, type Dependency, type Memory, type WorkflowGraph } from "@openclaw/types";

import type { AppEnv } from "../app-env";

export const workflowRoute = new Hono<AppEnv>();

workflowRoute.get("/graph", (c) => {
  const db = c.get("db");
  const agents = db.query("SELECT * FROM agents").all() as Agent[];
  const memories = db.query("SELECT * FROM memories").all() as Memory[];
  const edges = db.query("SELECT * FROM dependencies").all() as Dependency[];

  const graph: WorkflowGraph = {
    nodes: [
      ...agents.map((agent) => ({
        id: agent.id,
        kind: "agent" as const,
        label: agent.name,
        status: agent.status,
      })),
      ...memories.map((memory) => ({
        id: memory.id,
        kind: "memory" as const,
        label: memory.title,
        status: memory.status,
        assigned_to: memory.assigned_to,
      })),
    ],
    edges,
  };

  return c.json(graph);
});

workflowRoute.post("/dependencies", async (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const input = dependencySchema.parse(await c.req.json());
  db.query("INSERT OR IGNORE INTO dependencies (upstream_id, downstream_id) VALUES (?, ?)").run(
    input.upstream_id,
    input.downstream_id,
  );
  events.logEvent({
    memory_id: input.downstream_id,
    event_type: "dependency:created",
    payload: input,
  });
  return c.json({ dependency: input }, 201);
});

workflowRoute.delete("/dependencies", async (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const input = dependencySchema.parse(await c.req.json());
  db.query("DELETE FROM dependencies WHERE upstream_id = ? AND downstream_id = ?").run(
    input.upstream_id,
    input.downstream_id,
  );
  events.logEvent({
    memory_id: input.downstream_id,
    event_type: "dependency:deleted",
    payload: input,
  });
  return c.json({ ok: true });
});
