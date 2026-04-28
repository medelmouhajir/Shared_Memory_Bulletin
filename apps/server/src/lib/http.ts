import type { Context } from "hono";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFound(message = "Not found"): never {
  throw new HttpError(404, message);
}

export function jsonError(c: Context, error: unknown): Response {
  if (error instanceof ZodError) {
    return c.json({ error: "Validation failed", details: error.flatten() }, 400);
  }

  if (error instanceof HttpError) {
    return c.json({ error: error.message }, error.status as never);
  }

  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
}
