# OpenClaw — Proactive Agent Orchestration Platform

> **Version:** 2.0 — War Room Edition  
> **Classification:** Complete Project Specification  
> **Last Revised:** April 2026

---

## 1. Executive Summary

OpenClaw is a **self-contained, proactive multi-agent orchestration platform** — the "central nervous system" for coordinated AI agent teams. It eliminates passive polling by replacing it with an event-driven, schedule-aware Wake-Up Engine that triggers agents at precisely the right moment via the OpenClaw CLI layer.

The system exposes a real-time **War Room Dashboard**: a Kanban board, Gantt timeline, live console, dependency graph, and health monitor — all streaming live state over WebSockets with zero polling on the frontend.

---

## 2. Design Philosophy

| Principle | Decision |
|---|---|
| **Zero polling** | WebSocket push for all state changes; clients never poll |
| **Single binary** | Bun runtime — JS runtime + package manager + bundler + test runner in one tool |
| **Embedded database** | Bun's native SQLite (`bun:sqlite`) — no separate DB process, no network round-trip |
| **Type-safe end-to-end** | TypeScript strict mode on both client and server; shared types via Hono RPC |
| **Minimal surface** | Hono framework (~12 kB, zero deps) replaces Express; no ORM bloat |
| **Resource-first** | Entire stack runs on a single 512 MB VPS or a developer laptop |

---

## 3. Technology Stack

### 3.1 Backend

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | [Bun](https://bun.sh) v1.x | 3–5× faster than Node.js for I/O-heavy workloads; native SQLite, native WebSocket, built-in test runner; single install |
| **HTTP / WebSocket** | [Hono](https://hono.dev) v4.x | < 12 kB, zero dependencies, Web Standards API, first-class TypeScript, runs identically on Bun / Cloudflare Workers / Node.js |
| **Database** | `bun:sqlite` (SQLite WAL mode) | Embedded, no separate process, Write-Ahead Logging enables concurrent reads, suitable up to ~100 k writes/day |
| **Scheduler** | Custom cron engine (pure TS) backed by SQLite `scheduled_at` column | No Redis, no external queue; Bun's `setInterval` heartbeat (1 s) scans due rows |
| **Process execution** | `Bun.spawn()` | Spawns `openclaw agent` CLI process; captures stdout/stderr streams piped to WebSocket broadcast |
| **Auth** | PASETO v4 tokens (via `paseto` npm package) | Stateless, modern alternative to JWT; verified on every request via Hono middleware |
| **Validation** | [Zod](https://zod.dev) v3 | Schema validation on all API inputs; shared schemas imported by frontend |

### 3.2 Frontend

| Layer | Technology | Rationale |
|---|---|---|
| **UI Framework** | React 19 + TypeScript | Server Components ready; concurrent rendering for streaming data |
| **Build Tool** | Vite 6 | Sub-second HMR; native ESM; minimal config |
| **Server State** | [TanStack Query](https://tanstack.com/query) v5 | Native WebSocket + streaming fetch support added in v5; DevTools; mutations with rollback |
| **Client State** | [Zustand](https://zustand-demo.pmnd.rs) v5 | < 1 kB; replaces Redux for ephemeral UI state (selected card, open panels, console scroll) |
| **Routing** | [TanStack Router](https://tanstack.com/router) v1 | File-based, fully type-safe, co-located with TanStack Query for prefetch |
| **Styling** | Tailwind CSS v4 (CSS-first config) | Lightning CSS compiler; up to 5× faster builds than v3; no JS config file |
| **UI Components** | Radix UI Primitives + custom design system | Accessible headless primitives; zero style lock-in |
| **Charts / Gantt** | [Recharts](https://recharts.org) (timeline) + custom SVG (dependency graph) | Lightweight; composable; avoids D3 bundle weight for simple use cases |
| **Terminal emulator** | [xterm.js](https://xtermjs.org) | Industry-standard; renders ANSI colors from CLI stdout streams |
| **Icons** | [Lucide React](https://lucide.dev) | Tree-shakeable SVG icons |

### 3.3 Infrastructure

| Concern | Approach |
|---|---|
| **Deployment** | Single `bun run start` command; Dockerfile (Bun official image, ~90 MB) |
| **Reverse proxy** | Caddy v2 (auto HTTPS, HTTP/2, WebSocket proxy in 5 lines) |
| **Process manager** | `systemd` unit or `docker compose` for production restart |
| **Backups** | SQLite `.backup` API called nightly via Bun cron; outputs to local path or S3-compatible store |
| **Observability** | Structured JSON logs via `pino`; OpenTelemetry traces exported to local Jaeger (optional) |

---

## 4. Database Schema

All tables use SQLite with WAL mode enabled (`PRAGMA journal_mode=WAL`).

```sql
-- Agents registry
CREATE TABLE agents (
  id          TEXT PRIMARY KEY,          -- e.g. "agent-planner"
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'idle',  -- idle | active | zombie | offline
  last_seen   INTEGER,                   -- Unix ms timestamp
  created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Memory items (tasks, questions, updates, info, schedules)
CREATE TABLE memories (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  type         TEXT NOT NULL CHECK(type IN ('task','question','update','info','schedule')),
  title        TEXT NOT NULL,
  body         TEXT,
  priority     INTEGER NOT NULL DEFAULT 2 CHECK(priority BETWEEN 1 AND 5),
  assigned_to  TEXT REFERENCES agents(id),
  created_by   TEXT REFERENCES agents(id),
  status       TEXT NOT NULL DEFAULT 'created'
               CHECK(status IN ('created','scheduled','triggered','seen','inprogress','finished','fail')),
  scheduled_at INTEGER,                  -- Unix ms; NULL = trigger immediately
  triggered_at INTEGER,
  seen_at      INTEGER,
  finished_at  INTEGER,
  retry_count  INTEGER NOT NULL DEFAULT 0,
  max_retries  INTEGER NOT NULL DEFAULT 3,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Task dependency graph edges
CREATE TABLE dependencies (
  upstream_id   TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  downstream_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  PRIMARY KEY (upstream_id, downstream_id)
);

-- Immutable audit log of all state transitions
CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id  TEXT REFERENCES memories(id),
  agent_id   TEXT REFERENCES agents(id),
  event_type TEXT NOT NULL,              -- status_change | wake_up | retry | zombie_detected | etc.
  payload    TEXT,                       -- JSON blob
  ts         INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Scheduler entries (cron or one-shot)
CREATE TABLE schedules (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  memory_id   TEXT REFERENCES memories(id) ON DELETE CASCADE,
  cron_expr   TEXT,                      -- NULL for one-shot
  next_run_at INTEGER NOT NULL,
  last_run_at INTEGER,
  enabled     INTEGER NOT NULL DEFAULT 1
);

-- Indexes for hot query paths
CREATE INDEX idx_memories_status      ON memories(status);
CREATE INDEX idx_memories_assigned    ON memories(assigned_to);
CREATE INDEX idx_memories_scheduled   ON memories(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_events_memory        ON events(memory_id);
CREATE INDEX idx_schedules_next_run   ON schedules(next_run_at) WHERE enabled = 1;
```

---

## 5. API Reference

All routes are prefixed `/api/v1`. Responses are JSON. Auth header: `Authorization: Bearer <paseto-token>`.

### 5.1 Agents

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/agents` | List all agents with current status |
| `GET` | `/api/v1/agents/status` | Real-time pulse — active / idle / zombie breakdown |
| `POST` | `/api/v1/agents` | Register a new agent |
| `PATCH` | `/api/v1/agents/:id/heartbeat` | Agent self-reports liveness (updates `last_seen`) |
| `DELETE` | `/api/v1/agents/:id` | Deregister agent |

### 5.2 Memories

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/memories` | List memories (filterable by `status`, `assigned_to`, `type`) |
| `POST` | `/api/v1/memories` | Create a memory item; triggers wake-up if `assigned_to` is set |
| `GET` | `/api/v1/memories/:id` | Fetch single memory with full audit trail |
| `PATCH` | `/api/v1/memories/:id` | Update status, body, priority, or assignee |
| `DELETE` | `/api/v1/memories/:id` | Soft-delete (marks `status = 'fail'`) |
| `POST` | `/api/v1/memories/:id/trigger` | Manually force a wake-up signal to assigned agent |

### 5.3 Scheduler

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/scheduler` | Schedule a memory for a future timestamp or cron expression |
| `GET` | `/api/v1/scheduler` | List all active schedule entries with `next_run_at` |
| `PATCH` | `/api/v1/scheduler/:id` | Enable / disable / reschedule an entry |
| `DELETE` | `/api/v1/scheduler/:id` | Remove schedule entry |

**Request body for `POST /api/v1/scheduler`:**
```json
{
  "memory_id": "abc123",
  "scheduled_at": 1780000000000,
  "cron_expr": null
}
```

### 5.4 Workflow

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/workflow/graph` | Returns full dependency DAG as `{ nodes: [], edges: [] }` |
| `POST` | `/api/v1/workflow/dependencies` | Add a dependency edge `{ upstream_id, downstream_id }` |
| `DELETE` | `/api/v1/workflow/dependencies` | Remove a dependency edge |

### 5.5 Events & Logs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/events` | Paginated event log (filter by `memory_id`, `agent_id`, `event_type`) |
| `GET` | `/api/v1/events/stream` | **Server-Sent Events** stream of live event log (fallback to WebSocket) |

### 5.6 WebSocket Gateway

```
ws://host/ws
```

Single multiplexed WebSocket connection. Messages are JSON with a `type` discriminant:

| Server → Client `type` | Payload |
|---|---|
| `memory:created` | Full memory object |
| `memory:updated` | `{ id, patch }` diff |
| `agent:status` | Agent object with new status |
| `wake_up:sent` | `{ memory_id, agent_id, ts }` |
| `wake_up:acked` | `{ memory_id, agent_id, ts }` |
| `zombie:detected` | `{ agent_id, memory_id, idle_ms }` |
| `console:output` | `{ agent_id, line, stream: 'stdout'|'stderr' }` |

| Client → Server `type` | Purpose |
|---|---|
| `subscribe` | Subscribe to specific `agent_id` or `memory_id` channels |
| `unsubscribe` | Unsubscribe from channels |

---

## 6. Core Engine: The Wake-Up System

### 6.1 Status Flow

```
created
  │
  ├─[has scheduled_at]──► scheduled ──[timer fires]──►┐
  │                                                    │
  └─[immediate]────────────────────────────────────────┤
                                                       ▼
                                                   triggered
                                                       │
                                          [agent ACKs via PATCH]
                                                       ▼
                                                     seen
                                                       │
                                          [agent begins work]
                                                       ▼
                                                  inprogress
                                                       │
                                        ┌──────────────┴──────────────┐
                                        ▼                             ▼
                                    finished                         fail
```

### 6.2 Wake-Up Engine (Scheduler Heartbeat)

The engine runs inside the Bun process on a **1-second interval**:

```typescript
// Pseudocode — executed every 1000ms via setInterval
async function schedulerTick() {
  const now = Date.now();

  // 1. Find all due scheduled memories
  const due = db.query(`
    SELECT m.* FROM memories m
    JOIN schedules s ON s.memory_id = m.id
    WHERE s.next_run_at <= ?
      AND s.enabled = 1
      AND m.status IN ('created', 'scheduled')
  `).all(now);

  for (const memory of due) {
    // 2. Check dependency gate
    const blocked = db.query(`
      SELECT 1 FROM dependencies d
      JOIN memories u ON u.id = d.upstream_id
      WHERE d.downstream_id = ?
        AND u.status NOT IN ('finished')
      LIMIT 1
    `).get(memory.id);

    if (blocked) continue; // Dependency not cleared yet

    // 3. Fire wake-up
    await triggerWakeUp(memory);

    // 4. Update schedule next_run_at if cron, else disable
    updateScheduleAfterRun(memory.id, now);
  }

  // 5. Zombie detection
  detectZombies(now);
}
```

### 6.3 Wake-Up Execution

```typescript
async function triggerWakeUp(memory: Memory) {
  // Update status to triggered
  db.run(`UPDATE memories SET status='triggered', triggered_at=? WHERE id=?`,
    [Date.now(), memory.id]);

  // Spawn CLI process
  const proc = Bun.spawn([
    'openclaw', 'agent',
    '--agent', memory.assigned_to,
    '--message', `You have a new task: ${memory.title}. Check your inbox.`
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Stream output to all WebSocket subscribers
  streamProcessOutput(proc, memory.assigned_to);

  // Log the event
  logEvent(memory.id, memory.assigned_to, 'wake_up:sent');

  // Broadcast to WebSocket clients
  broadcast({ type: 'wake_up:sent', memory_id: memory.id, agent_id: memory.assigned_to });

  // Schedule retry if no ACK within threshold
  scheduleRetryCheck(memory.id, WAKE_UP_ACK_TIMEOUT_MS);
}
```

### 6.4 Zombie Detection

An agent is declared a **zombie** when it holds a memory in `inprogress` status and has not sent a heartbeat within the configured threshold (default: 5 minutes).

```typescript
function detectZombies(now: number) {
  const threshold = now - ZOMBIE_THRESHOLD_MS; // default 5 * 60 * 1000

  const zombies = db.query(`
    SELECT m.id as memory_id, a.id as agent_id, a.last_seen
    FROM memories m
    JOIN agents a ON a.id = m.assigned_to
    WHERE m.status = 'inprogress'
      AND (a.last_seen IS NULL OR a.last_seen < ?)
  `).all(threshold);

  for (const z of zombies) {
    db.run(`UPDATE agents SET status='zombie' WHERE id=?`, [z.agent_id]);
    logEvent(z.memory_id, z.agent_id, 'zombie:detected');
    broadcast({ type: 'zombie:detected', ...z });
  }
}
```

---

## 7. Frontend Architecture

### 7.1 Application Structure

```
src/
├── main.tsx                  # Vite entry; TanStack Router + Query providers
├── routes/
│   ├── __root.tsx            # Layout: sidebar + WebSocket provider
│   ├── index.tsx             # Redirect → /kanban
│   ├── kanban.tsx            # Kanban board view
│   ├── timeline.tsx          # Gantt / scheduler timeline view
│   ├── graph.tsx             # Dependency graph view
│   ├── console.tsx           # Live terminal console view
│   └── agents.tsx            # Agent pulse / health monitor view
├── components/
│   ├── KanbanBoard/
│   │   ├── Board.tsx         # Column layout (created → finished)
│   │   ├── Card.tsx          # Memory card with status badge + drag handle
│   │   └── CardDetail.tsx    # Slide-over panel with full memory detail
│   ├── Timeline/
│   │   ├── GanttChart.tsx    # Recharts-based horizontal timeline
│   │   └── ScheduleRow.tsx   # Single agent row with task bars
│   ├── Graph/
│   │   ├── DependencyGraph.tsx  # SVG DAG with force layout
│   │   └── GraphNode.tsx
│   ├── Console/
│   │   ├── LiveTerminal.tsx  # xterm.js instance; receives console:output WS events
│   │   └── AgentFilter.tsx
│   ├── Agents/
│   │   ├── PulseGrid.tsx     # Grid of agent cards with status animation
│   │   └── AgentCard.tsx     # Status badge, last_seen, current task
│   └── shared/
│       ├── StatusBadge.tsx   # Pulse (urgent) | Triggered | Executing animations
│       ├── WsProvider.tsx    # WebSocket context; reconnect with exponential backoff
│       └── CommandPalette.tsx # Keyboard-driven quick actions (⌘M)
├── hooks/
│   ├── useMemories.ts        # TanStack Query + WS cache invalidation
│   ├── useAgents.ts
│   ├── useWorkflowGraph.ts
│   └── useWebSocket.ts       # Low-level WS hook; message routing
├── store/
│   └── ui.ts                 # Zustand: selected card, open panels, filter state
├── lib/
│   ├── api.ts                # Typed fetch client (wraps Hono RPC types)
│   ├── ws.ts                 # WebSocket singleton + topic subscriptions
│   └── time.ts               # Relative time formatting utilities
└── types/
    └── index.ts              # Re-exports from shared types package
```

### 7.2 Real-Time Data Strategy

TanStack Query manages all server state. WebSocket events invalidate the query cache, triggering background refetches only for affected query keys — no full-page reloads, no stale data.

```typescript
// hooks/useMemories.ts
export function useMemories(filters?: MemoryFilters) {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsub = subscribe(['memory:created', 'memory:updated'], (msg) => {
      queryClient.invalidateQueries({ queryKey: ['memories', filters] });
      // Optimistic update for known memory:updated events
      if (msg.type === 'memory:updated') {
        queryClient.setQueryData(
          ['memory', msg.id],
          (old: Memory) => ({ ...old, ...msg.patch })
        );
      }
    });
    return unsub;
  }, [queryClient, filters, subscribe]);

  return useQuery({
    queryKey: ['memories', filters],
    queryFn: () => api.memories.list(filters),
    staleTime: 30_000,
  });
}
```

### 7.3 Status Badge Animations (CSS)

```css
/* Urgent — red pulse ring */
@keyframes pulse-ring {
  0%   { transform: scale(1);    opacity: 1; }
  100% { transform: scale(1.8);  opacity: 0; }
}

.badge-urgent::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--color-red-500);
  animation: pulse-ring 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Triggered — amber shimmer */
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

.badge-triggered {
  background: linear-gradient(90deg, #f59e0b 25%, #fcd34d 50%, #f59e0b 75%);
  background-size: 200% auto;
  animation: shimmer 2s linear infinite;
}

/* Executing — rotating border */
@keyframes spin-border {
  to { --angle: 360deg; }
}

.badge-executing {
  border: 2px solid transparent;
  background: conic-gradient(from var(--angle), #3b82f6, #a855f7, #3b82f6) border-box;
  animation: spin-border 1s linear infinite;
}
```

---

## 8. Feature Specifications

### 8.1 Kanban Board

- Six columns representing the status lifecycle: `created → scheduled → triggered → seen → inprogress → finished / fail`
- Cards are draggable (via `@dnd-kit/core`) — drag triggers a `PATCH /memories/:id` call
- Cards display: title, assignee avatar, priority indicator, age badge, type icon
- Clicking a card opens a slide-over panel with: full body text, audit timeline, dependency list, manual wake-up button, raw JSON toggle
- Column headers show live count badges that pulse when count increases

### 8.2 Scheduler / Timeline (Gantt View)

- Horizontal timeline per agent showing task bars with scheduled and expected completion windows
- Bars are color-coded by memory type and status
- Zoom controls: 1-hour, 6-hour, 24-hour, 7-day views
- "Now" line scrolled into view by default
- Clicking a bar opens the same card detail panel as the Kanban

### 8.3 Dependency Graph

- Force-directed SVG DAG rendered with D3-force layout packaged inside a React component
- Nodes: agents (hexagons) and memories (rounded rectangles)
- Edges: directional arrows with animated dashes for active dependency locks
- Zoom + pan via pointer events
- Blocked nodes highlighted in amber; completed nodes dimmed
- `GET /api/v1/workflow/graph` powers the initial load; WebSocket events animate state changes live

### 8.4 Live Console

- xterm.js terminal with full ANSI color and Unicode support
- Left sidebar lists connected agents with last activity timestamp
- Selecting an agent filters the terminal to show only that agent's output
- Toggle "all agents" mode streams multiplexed output with agent-prefixed lines
- Auto-scroll with a "pause" button when manually scrolling up
- Download button exports current buffer as `.log` file

### 8.5 Health Monitor (Agent Pulse)

- Grid of agent cards showing: name, status badge, last heartbeat delta ("3s ago"), current task title
- Zombie agents shown with red border and alert icon; manual "Re-trigger" button sends wake-up
- Aggregate stats bar: Active / Idle / Zombie / Offline counts
- Threshold configuration panel (sets `ZOMBIE_THRESHOLD_MS` via API)

### 8.6 Intelligence Feed

- Chronological feed of `update` and `info` type memories
- Provides context for the next agent in a workflow chain
- Filterable by agent and memory type
- Each feed item shows: sender agent, timestamp, body preview, link to full memory

### 8.7 Command Palette (⌘M / Ctrl+M)

- Fuzzy-search across all agents and memories
- Actions: Create task, Assign to agent, Trigger wake-up, Navigate to view
- Keyboard-navigable with arrow keys and Enter

---

## 9. Agent Interaction Protocol

### 9.1 Full Lifecycle (Plan → Wake → Act → Report)

```
┌────────────┐     POST /memories          ┌─────────────────┐
│  Agent A   │ ──────────────────────────► │  Orchestrator   │
│ (Planner)  │   { type: "task",           │                 │
└────────────┘     assigned_to: "agent-b", │  1. Persists    │
                   priority: 1 }           │  2. Checks deps │
                                           │  3. Fires       │
                                           │     Bun.spawn() │
                                           └────────┬────────┘
                                                    │  openclaw agent
                                                    │  --agent agent-b
                                                    │  --message "..."
                                                    ▼
                                           ┌────────────────┐
                                           │    Agent B     │
                                           │                │
                                           │  PATCH status  │
                                           │  → "seen"      │
                                           │  → "inprogress"│
                                           │                │
                                           │  POST /memories│
                                           │  { type: "info"│
                                           │    status:     │
                                           │    "finished" }│
                                           └────────────────┘
```

### 9.2 Agent SDK (Minimal Client)

Agents that integrate with the REST API need only a minimal HTTP client. A reference TypeScript SDK is provided:

```typescript
// openclaw-sdk/index.ts
export class OpenClawAgent {
  constructor(
    private readonly baseUrl: string,
    private readonly agentId: string,
    private readonly token: string,
  ) {}

  /** Call every 30s to prevent zombie detection */
  async heartbeat() {
    await fetch(`${this.baseUrl}/api/v1/agents/${this.agentId}/heartbeat`, {
      method: 'PATCH',
      headers: this.headers(),
    });
  }

  async getInbox() {
    const res = await fetch(
      `${this.baseUrl}/api/v1/memories?assigned_to=${this.agentId}&status=triggered,seen`,
      { headers: this.headers() }
    );
    return res.json() as Promise<Memory[]>;
  }

  async ack(memoryId: string) {
    return this.patchStatus(memoryId, 'seen');
  }

  async startWork(memoryId: string) {
    return this.patchStatus(memoryId, 'inprogress');
  }

  async finish(memoryId: string, result?: string) {
    await fetch(`${this.baseUrl}/api/v1/memories/${memoryId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ status: 'finished', body: result }),
    });
  }

  async report(title: string, body: string, assignTo?: string) {
    await fetch(`${this.baseUrl}/api/v1/memories`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        type: 'update',
        title,
        body,
        created_by: this.agentId,
        assigned_to: assignTo,
      }),
    });
  }

  private patchStatus(memoryId: string, status: MemoryStatus) {
    return fetch(`${this.baseUrl}/api/v1/memories/${memoryId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ status }),
    });
  }

  private headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}
```

---

## 10. Configuration

All configuration is via environment variables. A `.env.example` is committed to the repo.

```bash
# Server
PORT=3000
HOST=0.0.0.0

# Auth
PASETO_SECRET_KEY=<64-char hex>        # Generate: openssl rand -hex 32

# Database
DB_PATH=./data/openclaw.db
DB_WAL=true                           # Enable WAL mode

# Scheduler
SCHEDULER_TICK_MS=1000                # How often scheduler heartbeat runs
ZOMBIE_THRESHOLD_MS=300000            # 5 minutes
WAKE_UP_ACK_TIMEOUT_MS=30000          # 30 seconds before retry
WAKE_UP_MAX_RETRIES=3

# CLI
OPENCLAW_CLI_PATH=openclaw            # Path to openclaw binary

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:5173

# Optional: OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=openclaw
```

---

## 11. Project File Structure

```
openclaw/
├── .env.example
├── .gitignore
├── bun.lockb
├── package.json                  # Workspace root
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile
├── Caddyfile
│
├── packages/
│   └── types/                    # Shared TypeScript types (Memory, Agent, Event, etc.)
│       ├── package.json
│       └── src/index.ts
│
├── apps/
│   ├── server/                   # Bun + Hono backend
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts          # Entry: Bun.serve() + Hono + WebSocket
│   │   │   ├── db/
│   │   │   │   ├── client.ts     # bun:sqlite instance + WAL setup
│   │   │   │   └── migrations.ts # Schema creation and versioned migrations
│   │   │   ├── routes/
│   │   │   │   ├── agents.ts
│   │   │   │   ├── memories.ts
│   │   │   │   ├── scheduler.ts
│   │   │   │   ├── workflow.ts
│   │   │   │   └── events.ts
│   │   │   ├── engine/
│   │   │   │   ├── scheduler.ts  # setInterval heartbeat + due task scanner
│   │   │   │   ├── wake-up.ts    # Bun.spawn() + retry logic
│   │   │   │   └── zombie.ts     # Zombie detection + alerting
│   │   │   ├── ws/
│   │   │   │   ├── handler.ts    # WebSocket upgrade + message routing
│   │   │   │   └── broadcast.ts  # Topic-based broadcast to subscribers
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       # PASETO token verification
│   │   │   │   └── logger.ts     # pino structured logging
│   │   │   └── lib/
│   │   │       └── events.ts     # Event log writer
│   │   └── tests/
│   │       ├── scheduler.test.ts
│   │       ├── wake-up.test.ts
│   │       └── zombie.test.ts
│   │
│   └── web/                      # Vite + React frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/                  # (see Section 7.1)
│
└── sdk/                          # openclaw-sdk npm package
    ├── package.json
    └── src/
        └── index.ts              # OpenClawAgent class
```

---

## 12. Docker Compose (Development + Production)

```yaml
# docker-compose.yml
services:
  server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data           # SQLite persistence
    environment:
      - NODE_ENV=production
    env_file: .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [server]
    restart: unless-stopped

volumes:
  caddy_data:
```

```dockerfile
# Dockerfile
FROM oven/bun:1-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb ./
COPY apps/server/package.json ./apps/server/
COPY packages/types/package.json ./packages/types/
RUN bun install --frozen-lockfile --production

FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN bun run build:server

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

---

## 13. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Scheduler tick accuracy** | ± 50 ms (1 s tick interval) |
| **WebSocket message latency** | < 10 ms (localhost); < 100 ms (LAN) |
| **API P99 response time** | < 50 ms for all read endpoints |
| **Concurrent WebSocket clients** | 500+ on a single Bun process (tested) |
| **Memory footprint** | < 150 MB RSS under normal load |
| **SQLite throughput** | 10 k writes/s in WAL mode on SSD |
| **Cold start time** | < 300 ms (Bun native binary; no JVM overhead) |
| **Test coverage** | ≥ 80% on engine/ and routes/ directories |
| **Zombie detection delay** | Within 2 × `SCHEDULER_TICK_MS` of threshold crossing |

---

## 14. Security Considerations

- All API routes protected by PASETO v4 Bearer token middleware
- Agent IDs are opaque random hex strings; no sequential integer IDs exposed
- `Bun.spawn()` arguments are array-form (never shell-interpolated) to prevent command injection
- SQLite parameterized queries throughout; no string concatenation in SQL
- WebSocket origin validated against `CORS_ORIGINS` on upgrade
- Rate limiting via Hono middleware: 100 req/min per IP on write endpoints
- HTTPS enforced by Caddy in production; HTTP redirected
- Secrets loaded from environment only; never logged
- `ZOMBIE_THRESHOLD_MS` and retry counts are server-side config; not client-settable per request

---

## 15. Roadmap (Post-MVP)

| Phase | Feature |
|---|---|
| **v2.1** | Multi-tenant support (namespaced agents per team) |
| **v2.2** | Webhook triggers as alternative to CLI spawn |
| **v2.3** | Agent capability declarations (skills manifest) for auto-assignment |
| **v2.4** | AI-assisted triage: auto-priority and auto-assign using embeddings on task body |
| **v2.5** | Export workflow as YAML playbook; import and replay |
| **v3.0** | Distributed mode: multiple Bun nodes coordinated via SQLite Litestream replication |

---

## 16. Glossary

| Term | Definition |
|---|---|
| **Memory** | The fundamental unit of work — a typed, stateful record (task / question / update / info / schedule) |
| **Wake-Up** | The act of spawning the `openclaw agent --message` CLI command to notify an assigned agent |
| **Zombie** | An agent holding an `inprogress` memory that has not sent a heartbeat within `ZOMBIE_THRESHOLD_MS` |
| **Dependency Gate** | A check that prevents a downstream memory from triggering until all upstream memories reach `finished` |
| **Pulse** | An agent's `PATCH /heartbeat` call; absence for > threshold triggers zombie classification |
| **Intelligence Feed** | A chronological stream of `update` and `info` memories providing context between agents |
| **War Room** | The unified dashboard combining Kanban, Timeline, Graph, Console, and Pulse views |
