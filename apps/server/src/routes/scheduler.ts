import { Hono } from "hono";
import { createScheduleSchema, updateScheduleSchema, type Schedule } from "@openclaw/types";

import type { AppEnv } from "../app-env";
import { nextCronRun } from "../engine/cron";
import { notFound } from "../lib/http";
import { mapSchedule } from "../lib/rows";

export const schedulerRoute = new Hono<AppEnv>();

schedulerRoute.get("/", (c) => {
  const schedules = c
    .get("db")
    .query("SELECT * FROM schedules ORDER BY next_run_at ASC")
    .all()
    .map((row) => mapSchedule(row as never));
  return c.json({ schedules });
});

schedulerRoute.post("/", async (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const input = createScheduleSchema.parse(await c.req.json());
  const nextRunAt = input.cron_expr ? nextCronRun(input.cron_expr) : input.scheduled_at;
  if (!nextRunAt) throw new Error("scheduled_at or cron_expr is required");

  const schedule = mapSchedule(
    db
      .query(
        `INSERT INTO schedules (memory_id, cron_expr, next_run_at, enabled)
         VALUES (?, ?, ?, 1)
         RETURNING *`,
      )
      .get(input.memory_id, input.cron_expr ?? null, nextRunAt) as never,
  );

  db.query("UPDATE memories SET status = 'scheduled', scheduled_at = ?, updated_at = ? WHERE id = ?").run(
    schedule.next_run_at,
    Date.now(),
    schedule.memory_id,
  );
  events.logEvent({ memory_id: schedule.memory_id, event_type: "schedule:created", payload: schedule });
  return c.json({ schedule }, 201);
});

schedulerRoute.patch("/:id", async (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const id = c.req.param("id");
  const existing = db.query("SELECT * FROM schedules WHERE id = ?").get(id) as Schedule | null;
  if (!existing) notFound("Schedule not found");

  const input = updateScheduleSchema.parse(await c.req.json());
  const nextRunAt = input.cron_expr
    ? nextCronRun(input.cron_expr)
    : input.scheduled_at ?? existing.next_run_at;

  const schedule = mapSchedule(
    db
      .query(
        `UPDATE schedules SET cron_expr = ?, next_run_at = ?, enabled = ?
         WHERE id = ?
         RETURNING *`,
      )
      .get(
        input.cron_expr === undefined ? existing.cron_expr : input.cron_expr,
        nextRunAt,
        input.enabled === undefined ? Number(existing.enabled) : Number(input.enabled),
        id,
      ) as never,
  );

  events.logEvent({ memory_id: schedule.memory_id, event_type: "schedule:updated", payload: schedule });
  return c.json({ schedule });
});

schedulerRoute.delete("/:id", (c) => {
  const db = c.get("db");
  const events = c.get("events");
  const id = c.req.param("id");
  const schedule = db.query("SELECT * FROM schedules WHERE id = ?").get(id) as Schedule | null;
  if (!schedule) notFound("Schedule not found");

  db.query("DELETE FROM schedules WHERE id = ?").run(id);
  events.logEvent({ memory_id: schedule.memory_id, event_type: "schedule:deleted", payload: schedule });
  return c.json({ ok: true });
});
