# OpenClaw Operations

## Local Development

1. Install Bun 1.x.
2. Copy `.env.example` to `.env` and replace `PASETO_SECRET_KEY`.
3. Run `bun install`.
4. Run `bun run dev`.

The server listens on `http://localhost:3000` and the War Room dashboard listens on `http://localhost:5173`.

## Production With Docker Compose

1. Configure `.env`.
2. Update `Caddyfile` with the production hostname.
3. Run `docker compose up -d --build`.
4. Confirm `GET /health` returns `{ "ok": true }`.

## SQLite Backups

SQLite data lives in `./data`. The server is designed for WAL mode, so backups should use SQLite's backup API or a coordinated copy that includes `openclaw.db`, `openclaw.db-wal`, and `openclaw.db-shm`.

## Restore Check

Restore backups into a clean `data` directory and run:

```bash
bun run start
```

Then validate the agents, memories, events, schedules, and workflow graph endpoints.

## Observability

Server logs are structured JSON through pino. OpenTelemetry environment variables are reserved for optional trace export:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=openclaw
```

## PWA Operations Notes

- The web app ships with a generated service worker (`generateSW`) and web manifest for installability.
- Static frontend assets are precached for faster startup and standalone launches.
- Live API and WebSocket data are network-first by design in this phase, so full offline mode is not expected.
- After a deployment, verify:
  1. Browser install prompt is available on `https` origins.
  2. `manifest.webmanifest` loads successfully.
  3. Service worker is registered and active in browser application tooling.
