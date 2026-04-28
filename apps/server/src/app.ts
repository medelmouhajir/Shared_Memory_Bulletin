import { Hono } from "hono";
import { cors } from "hono/cors";

import type { AppEnv } from "./app-env";
import type { Config } from "./config";
import type { Db } from "./db/client";
import type { EventWriter } from "./lib/events";
import { agentsRoute } from "./routes/agents";
import { memoriesRoute } from "./routes/memories";
import { schedulerRoute } from "./routes/scheduler";
import { workflowRoute } from "./routes/workflow";
import { eventsRoute } from "./routes/events";
import { authMiddleware } from "./middleware/auth";
import { requestLogger } from "./middleware/logger";
import { rateLimit } from "./middleware/rate-limit";
import { jsonError } from "./lib/http";

export function createApp(input: { db: Db; config: Config; events: EventWriter }) {
  const app = new Hono<AppEnv>();

  app.onError((error, c) => jsonError(c, error));
  app.use("*", async (c, next) => {
    c.set("db", input.db);
    c.set("config", input.config);
    c.set("events", input.events);
    await next();
  });
  app.use("*", requestLogger);
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return null;
        return input.config.corsOrigins.includes(origin) ? origin : null;
      },
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use("*", rateLimit());
  app.use("*", authMiddleware(input.config));

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/api/v1/agents", agentsRoute);
  app.route("/api/v1/memories", memoriesRoute);
  app.route("/api/v1/scheduler", schedulerRoute);
  app.route("/api/v1/workflow", workflowRoute);
  app.route("/api/v1/events", eventsRoute);

  return app;
}
