export function nextCronRun(cronExpr: string, from = Date.now()): number {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error("Only five-field cron expressions are supported");
  }

  const [minute] = parts;
  if (!minute) throw new Error("Invalid cron expression");

  if (minute.startsWith("*/")) {
    const interval = Number(minute.slice(2));
    if (!Number.isInteger(interval) || interval <= 0) {
      throw new Error("Invalid cron minute interval");
    }
    const date = new Date(from);
    date.setSeconds(0, 0);
    date.setMinutes(date.getMinutes() + (interval - (date.getMinutes() % interval || interval)));
    return date.getTime();
  }

  if (minute === "*") {
    return from + 60_000;
  }

  const fixedMinute = Number(minute);
  if (!Number.isInteger(fixedMinute) || fixedMinute < 0 || fixedMinute > 59) {
    throw new Error("Invalid cron minute field");
  }

  const date = new Date(from);
  date.setSeconds(0, 0);
  if (date.getMinutes() >= fixedMinute) {
    date.setHours(date.getHours() + 1);
  }
  date.setMinutes(fixedMinute);
  return date.getTime();
}
