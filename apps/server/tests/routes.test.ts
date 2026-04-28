import { describe, expect, test } from "bun:test";

import { loadConfig } from "../src/config";
import { createApp } from "../src/app";
import { createDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrations";
import { createEventWriter } from "../src/lib/events";

describe("routes", () => {
  test("health is public", async () => {
    const config = loadConfig();
    const db = createDb({ dbPath: ":memory:", dbWal: false });
    runMigrations(db);
    const app = createApp({ db, config, events: createEventWriter(db) });

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("api routes require bearer auth", async () => {
    const config = loadConfig();
    const db = createDb({ dbPath: ":memory:", dbWal: false });
    runMigrations(db);
    const app = createApp({ db, config, events: createEventWriter(db) });

    const response = await app.request("/api/v1/agents");

    expect(response.status).toBe(401);
  });
});
