import type { Agent } from "@openclaw/types";

import type { Config } from "../config";
import type { Db } from "../db/client";
import type { EventWriter } from "../lib/events";
import { broadcast } from "../ws/broadcast";

type ZombieRow = {
  memory_id: string;
  agent_id: string;
  last_seen: number | null;
};

export function detectZombies(db: Db, events: EventWriter, config: Config, now = Date.now()): void {
  const threshold = now - config.zombieThresholdMs;
  const zombies = db
    .query(
      `SELECT m.id as memory_id, a.id as agent_id, a.last_seen
       FROM memories m
       JOIN agents a ON a.id = m.assigned_to
       WHERE m.status = 'inprogress'
         AND a.status != 'zombie'
         AND (a.last_seen IS NULL OR a.last_seen < ?)`,
    )
    .all(threshold) as ZombieRow[];

  for (const zombie of zombies) {
    const agent = db
      .query("UPDATE agents SET status = 'zombie' WHERE id = ? RETURNING *")
      .get(zombie.agent_id) as Agent;
    const idleMs = now - (zombie.last_seen ?? 0);
    events.logEvent({
      memory_id: zombie.memory_id,
      agent_id: zombie.agent_id,
      event_type: "zombie:detected",
      payload: { idle_ms: idleMs },
    });
    broadcast({ type: "agent:status", agent });
    broadcast({
      type: "zombie:detected",
      agent_id: zombie.agent_id,
      memory_id: zombie.memory_id,
      idle_ms: idleMs,
    });
  }
}
