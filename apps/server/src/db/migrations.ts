import type { Db } from "./client";

const migrations = [
  {
    id: 1,
    name: "initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS agents (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        status      TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle','active','zombie','offline')),
        last_seen   INTEGER,
        created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS memories (
        id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
        type         TEXT NOT NULL CHECK(type IN ('task','question','update','info','schedule')),
        title        TEXT NOT NULL,
        body         TEXT,
        priority     INTEGER NOT NULL DEFAULT 2 CHECK(priority BETWEEN 1 AND 5),
        assigned_to  TEXT REFERENCES agents(id),
        created_by   TEXT REFERENCES agents(id),
        status       TEXT NOT NULL DEFAULT 'created'
                     CHECK(status IN ('created','scheduled','triggered','seen','inprogress','finished','fail')),
        scheduled_at INTEGER,
        triggered_at INTEGER,
        seen_at      INTEGER,
        finished_at  INTEGER,
        retry_count  INTEGER NOT NULL DEFAULT 0,
        max_retries  INTEGER NOT NULL DEFAULT 3,
        created_at   INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
        updated_at   INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS dependencies (
        upstream_id   TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        downstream_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        PRIMARY KEY (upstream_id, downstream_id)
      );

      CREATE TABLE IF NOT EXISTS events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_id  TEXT REFERENCES memories(id),
        agent_id   TEXT REFERENCES agents(id),
        event_type TEXT NOT NULL,
        payload    TEXT,
        ts         INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
        memory_id   TEXT REFERENCES memories(id) ON DELETE CASCADE,
        cron_expr   TEXT,
        next_run_at INTEGER NOT NULL,
        last_run_at INTEGER,
        enabled     INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      CREATE INDEX IF NOT EXISTS idx_memories_assigned ON memories(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_memories_scheduled ON memories(scheduled_at) WHERE scheduled_at IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_events_memory ON events(memory_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run_at) WHERE enabled = 1;
    `,
  },
];

export function runMigrations(db: Db): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )
  `);

  const hasMigration = db.query("SELECT 1 FROM schema_migrations WHERE id = ? LIMIT 1");
  const insertMigration = db.query("INSERT INTO schema_migrations (id, name) VALUES (?, ?)");

  const migrate = db.transaction(() => {
    for (const migration of migrations) {
      if (hasMigration.get(migration.id)) continue;
      db.run(migration.sql);
      insertMigration.run(migration.id, migration.name);
    }
  });

  migrate();
}
