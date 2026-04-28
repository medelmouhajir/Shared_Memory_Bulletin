export type Config = {
  port: number;
  host: string;
  pasetoSecretKey: string;
  dbPath: string;
  dbWal: boolean;
  schedulerTickMs: number;
  zombieThresholdMs: number;
  wakeUpAckTimeoutMs: number;
  wakeUpMaxRetries: number;
  openClawCliPath: string;
  corsOrigins: string[];
  otelEndpoint: string | null;
  otelServiceName: string;
};

function numberEnv(name: string, fallback: number): number {
  const value = Bun.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }
  return parsed;
}

export function loadConfig(): Config {
  return {
    port: numberEnv("PORT", 3000),
    host: Bun.env.HOST ?? "0.0.0.0",
    pasetoSecretKey:
      Bun.env.PASETO_SECRET_KEY ??
      "0000000000000000000000000000000000000000000000000000000000000000",
    dbPath: Bun.env.DB_PATH ?? "./data/openclaw.db",
    dbWal: (Bun.env.DB_WAL ?? "true") === "true",
    schedulerTickMs: numberEnv("SCHEDULER_TICK_MS", 1000),
    zombieThresholdMs: numberEnv("ZOMBIE_THRESHOLD_MS", 300_000),
    wakeUpAckTimeoutMs: numberEnv("WAKE_UP_ACK_TIMEOUT_MS", 30_000),
    wakeUpMaxRetries: numberEnv("WAKE_UP_MAX_RETRIES", 3),
    openClawCliPath: Bun.env.OPENCLAW_CLI_PATH ?? "openclaw",
    corsOrigins: (Bun.env.CORS_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    otelEndpoint: Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT || null,
    otelServiceName: Bun.env.OTEL_SERVICE_NAME ?? "openclaw",
  };
}
