import { Hono } from "hono";
import { eventFiltersSchema, type OpenClawEvent } from "@openclaw/types";

import type { AppEnv } from "../app-env";

export const eventsRoute = new Hono<AppEnv>();

eventsRoute.get("/", (c) => {
  const db = c.get("db");
  const filters = eventFiltersSchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.memory_id) {
    clauses.push("memory_id = ?");
    params.push(filters.memory_id);
  }
  if (filters.agent_id) {
    clauses.push("agent_id = ?");
    params.push(filters.agent_id);
  }
  if (filters.event_type) {
    clauses.push("event_type = ?");
    params.push(filters.event_type);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const events = db
    .query(`SELECT * FROM events ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`)
    .all(...params, filters.limit, filters.offset) as OpenClawEvent[];

  return c.json({ events });
});

eventsRoute.get("/stream", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("event: ready\ndata: {}\n\n"));
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
});
