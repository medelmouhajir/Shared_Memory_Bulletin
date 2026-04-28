import { describe, expect, test } from "bun:test";

import { nextReconnectDelay } from "./ws";

describe("nextReconnectDelay", () => {
  test("grows exponentially for early attempts", () => {
    const first = nextReconnectDelay(1);
    const second = nextReconnectDelay(2);

    expect(first).toBeGreaterThanOrEqual(1_000);
    expect(first).toBeLessThan(1_250);
    expect(second).toBeGreaterThanOrEqual(2_000);
    expect(second).toBeLessThan(2_250);
  });

  test("caps delay at max backoff with jitter", () => {
    const delay = nextReconnectDelay(30);

    expect(delay).toBeGreaterThanOrEqual(15_000);
    expect(delay).toBeLessThan(15_250);
  });
});
