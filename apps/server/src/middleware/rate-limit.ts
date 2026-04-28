import type { MiddlewareHandler } from "hono";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(limit = 100, windowMs = 60_000): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method === "GET" || c.req.method === "OPTIONS") {
      return next();
    }

    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= limit) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    bucket.count += 1;
    return next();
  };
}
