import { describe, expect, test } from "bun:test";

import { nextCronRun } from "../src/engine/cron";

describe("nextCronRun", () => {
  test("supports every-minute expressions", () => {
    const start = new Date("2026-04-28T00:00:00.000Z").getTime();
    expect(nextCronRun("* * * * *", start)).toBe(start + 60_000);
  });

  test("supports minute intervals", () => {
    const start = new Date("2026-04-28T00:06:20.000Z").getTime();
    expect(new Date(nextCronRun("*/5 * * * *", start)).getUTCMinutes()).toBe(10);
  });
});
