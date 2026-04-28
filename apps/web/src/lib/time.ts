export function relativeTime(timestamp: number | null): string {
  if (!timestamp) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatTime(timestamp: number | null): string {
  if (!timestamp) return "unscheduled";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp);
}

export function formatShortDate(timestamp: number | null): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

/** Human-readable countdown when `timestamp` is in the future; otherwise `null`. */
export function timeLeftUntil(timestamp: number | null): string | null {
  if (!timestamp) return null;
  const ms = timestamp - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / 86400000);
  if (days > 1) return `${days} days left`;
  if (days === 1) return "1 day left";
  const hours = Math.ceil(ms / 3600000);
  if (hours > 1) return `${hours} hours left`;
  if (hours === 1) return "1 hour left";
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `${minutes} min left`;
}

export function deadlineLabel(memory: {
  status: string;
  scheduled_at: number | null;
  finished_at: number | null;
}): string {
  if (memory.status === "finished" && memory.finished_at) {
    return formatShortDate(memory.finished_at);
  }
  if (memory.scheduled_at) {
    return formatShortDate(memory.scheduled_at);
  }
  return "—";
}
