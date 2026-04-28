import { describe, expect, test } from "bun:test";

import { loadConfig } from "../src/config";
import { createDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrations";
import { createEventWriter } from "../src/lib/events";
import { detectZombies } from "../src/engine/zombie";

describe("detectZombies", () => {
  test("marks stale in-progress agents as zombie", () => {
    const db = createDb({ dbPath: ":memory:", dbWal: false });
    runMigrations(db);
    const config = { ...loadConfig(), zombieThresholdMs: 1000 };
    const events = createEventWriter(db);
    const now = Date.now();

    db.query("INSERT INTO agents (id, name, status, last_seen) VALUES (?, ?, 'active', ?)").run(
      "agent-a",
      "Agent A",
      now - 2000,
    );
    db.query("INSERT INTO memories (id, type, title, assigned_to, status) VALUES (?, 'task', ?, ?, 'inprogress')").run(
      "memory-a",
      "Task A",
      "agent-a",
    );

    detectZombies(db, events, config, now);

    const agent = db.query("SELECT status FROM agents WHERE id = ?").get("agent-a") as { status: string };
    expect(agent.status).toBe("zombie");
  });
});
