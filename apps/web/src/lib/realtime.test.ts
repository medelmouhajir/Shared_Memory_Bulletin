import { describe, expect, test } from "bun:test";

import { DISCONNECTED_REFETCH_INTERVAL_MS, getRealtimeRefetchInterval } from "./realtime";

describe("getRealtimeRefetchInterval", () => {
  test("returns polling interval when websocket is disconnected", () => {
    expect(getRealtimeRefetchInterval(false)).toBe(DISCONNECTED_REFETCH_INTERVAL_MS);
  });

  test("disables polling when websocket is connected", () => {
    expect(getRealtimeRefetchInterval(true)).toBe(false);
  });
});
