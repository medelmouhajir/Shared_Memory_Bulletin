import { loadConfig } from "./config";
import { createDb } from "./db/client";
import { runMigrations } from "./db/migrations";
import { createEventWriter } from "./lib/events";
import { createApp } from "./app";
import { startScheduler } from "./engine/scheduler";
import { websocketHandlers } from "./ws/handler";
import { logger } from "./middleware/logger";
import { startNightlyBackup } from "./lib/backup";

const config = loadConfig();
const db = createDb(config);
runMigrations(db);
const events = createEventWriter(db);
const app = createApp({ db, config, events });
startScheduler({ db, config, events });
startNightlyBackup(db);

Bun.serve<{ channels: Set<string> }>({
  port: config.port,
  hostname: config.host,
  websocket: websocketHandlers,
  fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const origin = request.headers.get("origin");
      if (origin && !config.corsOrigins.includes(origin)) {
        return new Response("Forbidden", { status: 403 });
      }
      const upgraded = server.upgrade(request, { data: { channels: new Set<string>() } });
      return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
    }

    return app.fetch(request);
  },
});

logger.info({ host: config.host, port: config.port }, "OpenClaw server started");
