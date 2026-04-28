import type { Schedule } from "@openclaw/types";

export function boolFromSql(value: number): boolean {
  return value === 1;
}

export function mapSchedule(row: Omit<Schedule, "enabled"> & { enabled: number }): Schedule {
  return {
    ...row,
    enabled: boolFromSql(row.enabled),
  };
}
