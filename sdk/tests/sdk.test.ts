import { describe, expect, test } from "bun:test";

import { OpenClawAgent } from "../src/index";

describe("OpenClawAgent", () => {
  test("adds bearer auth and content type", async () => {
    const originalFetch = globalThis.fetch;
    let authorization = "";
    globalThis.fetch = (async (_input, init) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return Response.json({ memories: [] });
    }) as typeof fetch;

    const agent = new OpenClawAgent("http://localhost:3000", "agent-a", "token-a");
    await agent.getInbox();

    globalThis.fetch = originalFetch;
    expect(authorization).toBe("Bearer token-a");
  });
});
