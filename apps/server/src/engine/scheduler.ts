import type { Memory } from "@openclaw/types";

import type { Config } from "../config";
import type { Db } from "../db/client";
import type { EventWriter } from "../lib/events";
import { nextCronRun } from "./cron";
import { triggerWakeUp, retryUnackedWakeUps } from "./wake-up";
import { detectZombies } from "./zombie";

type SchedulerContext = {
  db: Db;
  events: EventWriter;
  config: Config;
};

function dependencyBlocked(db: Db, memoryId: string): boolean {
  return Boolean(
    db
      .query(
        `SELECT 1 FROM dependencies d
         JOIN memories u ON u.id = d.upstream_id
         WHERE d.downstream_id = ?
           AND u.status NOT IN ('finished')
         LIMIT 1`,
      )
      .get(memoryId),
  );
}

function updateScheduleAfterRun(db: Db, memoryId: string, now: number): void {
  const schedule = db.query("SELECT * FROM schedules WHERE memory_id = ? AND enabled = 1").get(memoryId) as
    | { id: string; cron_expr: string | null }
    | null;

  if (!schedule) return;

  if (schedule.cron_expr) {
    db.query("UPDATE schedules SET last_run_at = ?, next_run_at = ? WHERE id = ?").run(
      now,
      nextCronRun(schedule.cron_expr, now),
      schedule.id,
    );
    return;
  }

  db.query("UPDATE schedules SET last_run_at = ?, enabled = 0 WHERE id = ?").run(now, schedule.id);
}

export async function schedulerTick({ db, events, config }: SchedulerContext, now = Date.now()): Promise<void> {
  const due = db
    .query(
      `SELECT m.* FROM memories m
       JOIN schedules s ON s.memory_id = m.id
       WHERE s.next_run_at <= ?
         AND s.enabled = 1
         AND m.status IN ('created', 'scheduled')`,
    )
    .all(now) as Memory[];

  for (const memory of due) {
    if (dependencyBlocked(db, memory.id)) continue;
    await triggerWakeUp({ db, events, config, memory });
    updateScheduleAfterRun(db, memory.id, now);
  }

  retryUnackedWakeUps(db, events, config, now);
  detectZombies(db, events, config, now);
}

export function startScheduler(context: SchedulerContext): Timer {
  return setInterval(() => {
    schedulerTick(context).catch((error) => {
      console.error("scheduler tick failed", error);
    });
  }, context.config.schedulerTickMs);
}
