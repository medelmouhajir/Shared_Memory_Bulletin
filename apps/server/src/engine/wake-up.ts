import type { Memory } from "@openclaw/types";

import type { Config } from "../config";
import type { Db } from "../db/client";
import type { EventWriter } from "../lib/events";
import { broadcast } from "../ws/broadcast";

export type WakeUpContext = {
  db: Db;
  events: EventWriter;
  config: Config;
  memory: Memory;
};

async function streamLines(
  stream: ReadableStream<Uint8Array> | null,
  agentId: string,
  name: "stdout" | "stderr",
): Promise<void> {
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      broadcast({ type: "console:output", agent_id: agentId, line, stream: name });
    }
  }
  if (buffer) {
    broadcast({ type: "console:output", agent_id: agentId, line: buffer, stream: name });
  }
}

export async function triggerWakeUp({ db, events, config, memory }: WakeUpContext): Promise<void> {
  if (!memory.assigned_to) {
    return;
  }

  const now = Date.now();
  const updated = db
    .query(
      `UPDATE memories
       SET status = 'triggered', triggered_at = ?, updated_at = ?
       WHERE id = ? AND status NOT IN ('finished', 'fail')
       RETURNING *`,
    )
    .get(now, now, memory.id) as Memory | null;

  if (!updated) return;

  events.logEvent({
    memory_id: memory.id,
    agent_id: memory.assigned_to,
    event_type: "wake_up:sent",
    payload: { title: memory.title },
  });
  broadcast({ type: "memory:updated", id: memory.id, patch: { status: "triggered", triggered_at: now } });
  broadcast({ type: "wake_up:sent", memory_id: memory.id, agent_id: memory.assigned_to, ts: now });

  const proc = Bun.spawn(
    [
      config.openClawCliPath,
      "agent",
      "--agent",
      memory.assigned_to,
      "--message",
      `You have a new task: ${memory.title}. Check your inbox.`,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  await Promise.allSettled([
    streamLines(proc.stdout, memory.assigned_to, "stdout"),
    streamLines(proc.stderr, memory.assigned_to, "stderr"),
    proc.exited.then((exitCode) => {
      if (exitCode !== 0) {
        events.logEvent({
          memory_id: memory.id,
          agent_id: memory.assigned_to,
          event_type: "wake_up:failed",
          payload: { exitCode },
        });
      }
    }),
  ]);
}

export function retryUnackedWakeUps(db: Db, events: EventWriter, config: Config, now = Date.now()): void {
  const threshold = now - config.wakeUpAckTimeoutMs;
  const rows = db
    .query(
      `SELECT * FROM memories
       WHERE status = 'triggered'
         AND triggered_at IS NOT NULL
         AND triggered_at <= ?
         AND retry_count < max_retries
         AND assigned_to IS NOT NULL`,
    )
    .all(threshold) as Memory[];

  for (const memory of rows) {
    db.query("UPDATE memories SET retry_count = retry_count + 1, triggered_at = ?, updated_at = ? WHERE id = ?").run(
      now,
      now,
      memory.id,
    );
    events.logEvent({
      memory_id: memory.id,
      agent_id: memory.assigned_to,
      event_type: "wake_up:retry",
      payload: { retry_count: memory.retry_count + 1 },
    });
  }
}
