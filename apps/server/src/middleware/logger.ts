import type { MiddlewareHandler } from "hono";
import pino from "pino";

export const logger = pino({
  name: "openclaw",
  level: Bun.env.LOG_LEVEL ?? "info",
});

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  const requestId = crypto.randomUUID();
  c.header("x-request-id", requestId);

  await next();

  logger.info({
    request_id: requestId,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    duration_ms: Math.round(performance.now() - start),
  });
};
