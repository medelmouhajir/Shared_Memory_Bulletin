import type { AgentStatus, MemoryStatus } from "@openclaw/types";

type Props = {
  status: AgentStatus | MemoryStatus;
};

const tone: Record<string, string> = {
  created: "badge-neutral",
  scheduled: "badge-scheduled",
  triggered: "badge-triggered",
  seen: "badge-neutral",
  inprogress: "badge-executing",
  finished: "badge-success",
  fail: "badge-fail",
  idle: "badge-neutral",
  active: "badge-success",
  zombie: "badge-urgent",
  offline: "badge-fail",
};

export function StatusBadge({ status }: Props) {
  return <span className={`status-badge ${tone[status] ?? "badge-neutral"}`}>{status}</span>;
}
