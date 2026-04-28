# OpenClaw v2.0 Release Checklist

## Required Validation

- `bun install`
- `bun run typecheck`
- `bun test`
- `bun run build`
- `docker compose up -d --build`
- `GET /health` returns `{ "ok": true }`
- WebSocket connects to `/ws` from an allowed origin.
- Create agent -> create memory -> trigger wake-up -> observe event stream -> mark finished.
- Restore a SQLite backup into a clean `data` directory and confirm API reads succeed.

## Security Review

- Replace the example `PASETO_SECRET_KEY`.
- Set `CORS_ORIGINS` to production origins only.
- Confirm write endpoints require bearer auth.
- Confirm `OPENCLAW_CLI_PATH` points to the intended binary.
- Confirm logs do not include bearer tokens or secret values.

## Operational Review

- Confirm Caddy hostname and HTTPS issuance.
- Confirm persistent `./data` volume.
- Confirm nightly backup destination and retention.
- Confirm service restart policy through Docker Compose or systemd.
