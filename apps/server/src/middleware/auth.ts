import { V4 } from "paseto";
import type { MiddlewareHandler } from "hono";

import type { Config } from "../config";

const publicPaths = new Set(["/health"]);

export async function createDevToken(config: Pick<Config, "pasetoSecretKey">): Promise<string> {
  const key = Buffer.from(config.pasetoSecretKey, "hex");
  return V4.sign({ sub: "dev", role: "operator" }, key);
}

export function authMiddleware(config: Pick<Config, "pasetoSecretKey">): MiddlewareHandler {
  const key = Buffer.from(config.pasetoSecretKey, "hex");

  return async (c, next) => {
    if (publicPaths.has(new URL(c.req.url).pathname)) {
      return next();
    }

    const header = c.req.header("Authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    if (!token) {
      return c.json({ error: "Missing bearer token" }, 401);
    }

    try {
      await V4.verify(token, key);
    } catch {
      return c.json({ error: "Invalid bearer token" }, 401);
    }

    return next();
  };
}
