# OpenClaw

OpenClaw is a self-contained proactive multi-agent orchestration platform. It combines a Bun/Hono backend, SQLite WAL storage, a schedule-aware wake-up engine, typed REST APIs, WebSocket event streaming, a React War Room dashboard, and a small agent SDK.

## Quick Start

```bash
cp .env.example .env
bun install
bun run dev
```

## Workspace

- `apps/server` - Bun + Hono API, SQLite, scheduler, wake-up engine, WebSocket gateway.
- `apps/web` - Vite + React War Room dashboard.
- `packages/types` - shared TypeScript types and Zod schemas.
- `sdk` - minimal OpenClaw agent client.
- `examples/basic-agent` - reference polling agent loop.

## Validation

```bash
bun run typecheck
bun test
```

## Web App UX and PWA

- The War Room UI is responsive across desktop, tablet, and mobile breakpoints.
- The web client is installable as a Progressive Web App (PWA) with generated manifest and service worker.
- This baseline PWA setup focuses on installability and static asset caching only; API/offline data behavior is intentionally not enabled in this phase.

This environment did not have Bun installed during scaffolding, so npm was used only to resolve dependencies and run `tsc` checks.
