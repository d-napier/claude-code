# Frontend Application — Agent Orchestration & Management Console

> Design document for the web-based control surface that operators and users use to
> configure, monitor, and interact with the autonomous agent system described in
> [AUTONOMOUS_AGENT_DESIGN.md](./AUTONOMOUS_AGENT_DESIGN.md) and implemented via the
> [Claude Agent SDK guide](./IMPLEMENTATION_GUIDE_CLAUDE_AGENT_SDK.md).

---

## Table of Contents

1. [Design Goals](#1-design-goals)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Real-Time Communication Layer](#4-real-time-communication-layer)
5. [Application Layout & Navigation](#5-application-layout--navigation)
6. [Dashboard — System Overview](#6-dashboard--system-overview)
7. [Agent Manager](#7-agent-manager)
8. [Session Explorer](#8-session-explorer)
9. [Conversation View](#9-conversation-view)
10. [Task Scheduler](#10-task-scheduler)
11. [Integration Manager](#11-integration-manager)
12. [Memory Editor](#12-memory-editor)
13. [Tool & Skill Registry](#13-tool--skill-registry)
14. [Security & Permissions Console](#14-security--permissions-console)
15. [Observability & Analytics](#15-observability--analytics)
16. [Human-in-the-Loop Approval Queue](#16-human-in-the-loop-approval-queue)
17. [Settings & Configuration](#17-settings--configuration)
18. [Data Model & API Contract](#18-data-model--api-contract)
19. [State Management](#19-state-management)
20. [Responsive & Accessibility](#20-responsive--accessibility)
21. [Deployment](#21-deployment)

---

## 1. Design Goals

| Goal | Rationale |
|------|-----------|
| **Operational visibility** | Operators need a single pane of glass showing every running agent, queue depth, active sessions, cost, and errors — without reading logs. |
| **Direct manipulation** | Every entity visible in the UI (agents, sessions, tasks, integrations, memory) must be directly editable. Read-only dashboards breed shadow tooling. |
| **Real-time** | Agent status, conversation streams, and metrics update live via WebSocket. No polling, no stale data. |
| **Human-in-the-loop** | High-risk tool calls surface as interactive approval cards. Operators approve or deny in the browser; the agent resumes immediately. |
| **Mobile-capable** | Critical views (dashboard, approvals, conversations) must work on mobile. Operators are not always at a desk. |
| **Composable** | Each view is a self-contained module. New integration channels, tool types, or agent patterns can be added without refactoring the shell. |

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                          BROWSER CLIENT                            │
│                                                                    │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Dashboard │ │Agent Manager │ │Session   │ │Approval Queue    │  │
│  │          │ │              │ │Explorer  │ │(HITL)            │  │
│  └────┬─────┘ └──────┬───────┘ └────┬─────┘ └────────┬─────────┘  │
│       │              │              │                 │            │
│  ┌────┴──────────────┴──────────────┴─────────────────┴────────┐  │
│  │              State Layer (Zustand Store)                     │  │
│  │   agents │ sessions │ tasks │ metrics │ approvals │ ws      │  │
│  └────────────────────────┬────────────────────────────────────┘  │
│                           │                                       │
│  ┌────────────────────────┴────────────────────────────────────┐  │
│  │         Transport Layer (WebSocket + REST)                  │  │
│  │  WS: events, streaming, approvals                           │  │
│  │  REST: CRUD, config, bulk operations                        │  │
│  └────────────────────────┬────────────────────────────────────┘  │
└───────────────────────────┼────────────────────────────────────────┘
                            │ wss:// + https://
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                        BACKEND API SERVER                          │
│                                                                    │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │  REST    │  │  WebSocket   │  │  Auth (JWT + RBAC)           │ │
│  │  Routes  │  │  Gateway     │  │                              │ │
│  └────┬─────┘  └──────┬───────┘  └──────────────────────────────┘ │
│       │               │                                           │
│  ┌────┴───────────────┴──────────────────────────────────────────┐│
│  │              Orchestrator (Control Plane)                     ││
│  │  GroupQueue │ Scheduler │ IPC Watcher │ Channel Router        ││
│  └──────────────────────────┬────────────────────────────────────┘│
│                             │                                     │
│  ┌──────────────────────────┴───────────────────────────────────┐ │
│  │  State Layer: SQLite/Postgres │ Filesystem │ Container Mgr   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

The frontend never talks directly to agents or containers. All communication flows
through the backend API server, which owns the control plane. The WebSocket connection
carries real-time events; REST handles CRUD and configuration.

---

## 3. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | RSC streaming for dashboard, API routes for BFF |
| **Language** | TypeScript | Shared types with backend SDK code |
| **UI Library** | shadcn/ui + Tailwind CSS | Composable primitives, no vendor lock-in, accessible by default |
| **State** | Zustand | Lightweight, supports subscriptions, no boilerplate |
| **Real-time** | Native WebSocket + reconnection hook | No Socket.IO overhead; typed protocol |
| **Charts** | Recharts | React-native, composable, good perf for live data |
| **Tables** | TanStack Table v8 | Virtualized, sortable, filterable — handles 10k+ rows |
| **Code/Log Viewer** | Monaco Editor (lazy-loaded) | Syntax highlighting for CLAUDE.md, JSON transcripts |
| **Forms** | React Hook Form + Zod | Type-safe validation shared with backend schemas |
| **Date/Cron** | date-fns + cronstrue | Human-readable cron descriptions |
| **Notifications** | Sonner | Minimal toast library for real-time alerts |
| **Auth** | NextAuth.js v5 | OAuth + JWT, session-based RBAC |

### Dependencies (`package.json` outline)

```json
{
  "dependencies": {
    "next": "^15.2",
    "react": "^19",
    "zustand": "^5",
    "@tanstack/react-table": "^8",
    "recharts": "^2.15",
    "tailwindcss": "^4",
    "zod": "^3.24",
    "react-hook-form": "^7",
    "date-fns": "^4",
    "cronstrue": "^2",
    "sonner": "^2",
    "next-auth": "^5",
    "@monaco-editor/react": "^4"
  }
}
```

---

## 4. Real-Time Communication Layer

### WebSocket Protocol

The frontend establishes a single WebSocket connection on login. All real-time events
flow through it via a typed message protocol.

> **Note**: This is the *management console protocol* — a high-level event stream for
> the operator UI. It is distinct from the internal gateway protocol
> (`req`/`res`/`event` frames) described in
> [AUTONOMOUS_AGENT_DESIGN.md §5](./AUTONOMOUS_AGENT_DESIGN.md).

```typescript
// Shared types: shared/ws-types.ts

type WSMessage =
  // Server → Client events
  | { type: "agent:status";       payload: AgentStatusEvent }
  | { type: "agent:output";       payload: AgentOutputEvent }
  | { type: "session:update";     payload: SessionUpdateEvent }
  | { type: "queue:depth";        payload: QueueDepthEvent }
  | { type: "metrics:tick";       payload: MetricsTickEvent }
  | { type: "approval:request";   payload: ApprovalRequestEvent }
  | { type: "approval:resolved";  payload: ApprovalResolvedEvent }
  | { type: "task:fired";         payload: TaskFiredEvent }
  | { type: "task:completed";     payload: TaskCompletedEvent }
  | { type: "error:agent";        payload: AgentErrorEvent }
  | { type: "integration:status"; payload: IntegrationStatusEvent }

  // Client → Server commands
  | { type: "approval:respond";   payload: ApprovalResponse }
  | { type: "agent:interrupt";    payload: { agentId: string; sessionId: string } }
  | { type: "session:subscribe";  payload: { sessionId: string } }
  | { type: "session:unsubscribe";payload: { sessionId: string } };
```

### Connection Hook

```typescript
// hooks/use-websocket.ts

function useWebSocket() {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(`${WS_URL}?token=${getAuthToken()}`);

      ws.onopen = () => {
        setStatus("open");
        reconnectAttempt.current = 0;
      };

      ws.onmessage = (event) => {
        const msg: WSMessage = JSON.parse(event.data);
        // Dispatch to Zustand store based on message type
        dispatchWSEvent(msg);
      };

      ws.onclose = () => {
        setStatus("closed");
        // Exponential backoff reconnection
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
        reconnectAttempt.current++;
        setTimeout(connect, delay);
      };

      wsRef.current = ws;
    }

    connect();
    return () => wsRef.current?.close();
  }, []);

  const send = useCallback((msg: WSMessage) => {
    wsRef.current?.send(JSON.stringify(msg));
  }, []);

  return { status, send };
}
```

### Event Payloads

```typescript
interface AgentStatusEvent {
  agentId: string;
  groupFolder: string;
  status: "idle" | "running" | "queued" | "error" | "timeout";
  sessionId?: string;
  currentTool?: string;
  turnCount: number;
  costUsd: number;
  startedAt?: string;
}

interface AgentOutputEvent {
  agentId: string;
  sessionId: string;
  messageType: "text" | "tool_call" | "tool_result" | "thinking";
  content: string;
  toolName?: string;
  timestamp: string;
}

interface ApprovalRequestEvent {
  id: string;
  agentId: string;
  sessionId: string;
  groupFolder: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: "medium" | "medium-high" | "high" | "critical";
  requestedAt: string;
  timeoutMs: number;
}

interface MetricsTickEvent {
  activeAgents: number;
  queuedMessages: number;
  totalSessions: number;
  costLast24h: number;
  tokensLast24h: number;
  errorRate: number;
  uptimeSeconds: number;
}
```

---

## 5. Application Layout & Navigation

### Shell Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ┌────────┐                                    ┌─────────┐ │
│  │ Logo   │  Agent Orchestrator        [search] │ ● Admin │ │
│  └────────┘                                    └─────────┘ │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  Dashboard │  ┌──────────────────────────────────────────┐  │
│  ──────────│  │                                          │  │
│  Agents    │  │          MAIN CONTENT AREA               │  │
│  Sessions  │  │                                          │  │
│  Tasks     │  │   (each nav item renders its view here)  │  │
│  ──────────│  │                                          │  │
│  Channels  │  │                                          │  │
│  Memory    │  │                                          │  │
│  Tools     │  │                                          │  │
│  ──────────│  │                                          │  │
│  Security  │  │                                          │  │
│  Analytics │  │                                          │  │
│  Settings  │  │                                          │  │
│  ──────────│  │                                          │  │
│  ● 2 Pending│ │                                          │  │
│    Approvals│  └──────────────────────────────────────────┘  │
│            │                                                │
├────────────┴────────────────────────────────────────────────┤
│  WS: Connected │ 3 agents running │ Queue: 1 │ $4.82 today │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Structure

| Section | Route | Description |
|---------|-------|-------------|
| Dashboard | `/` | System overview — live metrics, status grid, cost chart |
| Agents | `/agents` | Agent list, config, start/stop, live status |
| Sessions | `/sessions` | Session explorer — browse, search, replay transcripts |
| Tasks | `/tasks` | Scheduled tasks — cron editor, run logs, pause/resume |
| Channels | `/channels` | Integration manager — WhatsApp, Slack, Telegram, webhooks |
| Memory | `/memory` | CLAUDE.md editor — global + per-group memory files |
| Tools | `/tools` | Tool & skill registry — MCP servers, permissions, usage stats |
| Security | `/security` | Permission rules, mount allowlists, audit log |
| Analytics | `/analytics` | Cost analysis, token usage, performance trends |
| Settings | `/settings` | System config, user management, environment |
| Approvals | `/approvals` | Human-in-the-loop approval queue (badge count in nav) |

### Persistent Status Bar

The bottom bar always shows: WebSocket connection state, active agent count, queue
depth, and rolling 24h cost. This gives operators situational awareness regardless
of which view they're in.

---

## 6. Dashboard — System Overview

The landing page gives operators a full picture in 5 seconds.

### Layout (4-Column Grid)

```
┌─────────────────────────────────────────────────────────────┐
│  ACTIVE AGENTS     QUEUE DEPTH     SESSIONS TODAY    COST   │
│  ┌─────────┐       ┌─────────┐    ┌──────────┐    ┌──────┐ │
│  │    3    │       │    1    │    │    47    │    │$12.40│ │
│  │ running │       │ waiting │    │ completed│    │ 24h  │ │
│  └─────────┘       └─────────┘    └──────────┘    └──────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AGENT STATUS GRID                    COST OVER TIME        │
│  ┌──────────────────────────┐        ┌──────────────────┐   │
│  │ main       ● Running    │        │  ╱\               │   │
│  │            Turn 12, $0.34│        │ ╱  \   ╱╲        │   │
│  │ team-alpha ○ Idle       │        │╱    \_╱  \       │   │
│  │            Last: 3m ago  │        │           ╲      │   │
│  │ research   ● Running    │        │            ╲_    │   │
│  │            Turn 5, $0.12 │        │              ──  │   │
│  │ support    ◉ Queued     │        │     7d │ 24h │ 1h│   │
│  │            Position: 1   │        └──────────────────┘   │
│  └──────────────────────────┘                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RECENT ACTIVITY FEED                 PENDING APPROVALS     │
│  ┌──────────────────────────┐        ┌──────────────────┐   │
│  │ 14:32 main: Completed    │        │ ⚠ Bash: rm -rf   │   │
│  │       session abc123     │        │   Agent: research │   │
│  │ 14:31 team-alpha: Tool   │        │   [Approve] [Deny]│  │
│  │       call — Edit file   │        │                   │   │
│  │ 14:28 research: Started  │        │ ⚠ Write: /etc/   │   │
│  │       session def456     │        │   Agent: main     │   │
│  │ 14:25 Webhook received   │        │   [Approve] [Deny]│  │
│  │       for team-alpha     │        │                   │   │
│  └──────────────────────────┘        └──────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ERROR LOG (Last 24h)                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 14:15 research — error_max_turns (50 turns reached)  │   │
│  │ 12:03 support  — container_timeout (30m exceeded)    │   │
│  │ 09:41 main     — tool_failure (WebFetch 503)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Data Source | Update Frequency |
|-----------|------------|------------------|
| **KPI Cards** (4x) | `metrics:tick` WS event | Every 5 seconds |
| **Agent Status Grid** | `agent:status` WS events | Real-time |
| **Cost Chart** | REST `/api/metrics/cost` + WS ticks | Hybrid (initial load + live) |
| **Activity Feed** | `agent:output`, `session:update`, `task:fired` WS events | Real-time (virtualized, last 100) |
| **Pending Approvals** | `approval:request` WS events | Real-time |
| **Error Log** | REST `/api/errors` + `error:agent` WS events | Hybrid |

---

## 7. Agent Manager

### Agent List View (`/agents`)

A table of all registered agent groups with live status indicators.

| Column | Source | Interactive |
|--------|--------|-------------|
| Status indicator (●/○/◉) | WS `agent:status` | — |
| Group name | DB `registered_groups` | Click → detail view |
| Channel | DB `registered_groups.channel` | — |
| Current session | WS `agent:status.sessionId` | Click → session explorer |
| Turns / Cost | WS `agent:status` | — |
| Last active | DB `sessions` | — |
| Actions | — | [Start] [Stop] [Configure] [Logs] |

### Agent Detail View (`/agents/:folder`)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Agents                                           │
│                                                             │
│  team-alpha                                    ● Running    │
│  Channel: WhatsApp │ Trigger: @Andy │ Registered: Jan 15   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tabs: [Overview] [Configuration] [Sessions] [Logs]  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  OVERVIEW TAB:                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ Sessions: 142 │  │ Cost: $34.20  │  │ Errors: 3     │   │
│  │ (30 days)     │  │ (30 days)     │  │ (30 days)     │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
│  ACTIVE SESSION                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Session: abc-123 │ Turn 12 │ $0.34 │ 4m elapsed    │   │
│  │  Current: Executing Bash "npm test"                   │   │
│  │  [View Live] [Interrupt]                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  CONFIGURATION TAB:                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Model:        [claude-sonnet-4-6    ▾]              │   │
│  │  Max turns:    [50                    ]              │   │
│  │  Max budget:   [$2.00                 ]              │   │
│  │  Trigger:      [@Andy                 ]              │   │
│  │  Timeout:      [30 minutes            ]              │   │
│  │  System prompt: [Edit in Monaco ↗]                   │   │
│  │  Allowed tools: [☑Read ☑Write ☑Edit ☑Bash ...]      │   │
│  │  MCP servers:   [agent ✓] [playwright ✓]             │   │
│  │  Extra mounts:  [/home/user/projects (ro)]           │   │
│  │                                                       │   │
│  │  [Save Configuration]  [Reset to Defaults]           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Agent Actions

| Action | Method | Effect |
|--------|--------|--------|
| **Start** | POST `/api/agents/:folder/start` | Enqueue a heartbeat message to wake the agent |
| **Stop** | POST `/api/agents/:folder/stop` | Write `_close` sentinel to IPC, abort controller |
| **Interrupt** | WS `agent:interrupt` | Interrupt at next tool boundary |
| **Configure** | PUT `/api/agents/:folder/config` | Update agent config (applied on next run) |
| **Delete** | DELETE `/api/agents/:folder` | Deregister group (confirmation dialog) |

---

## 8. Session Explorer

### Session List View (`/sessions`)

A searchable, filterable table of all sessions across all agents.

```
┌─────────────────────────────────────────────────────────────┐
│  Sessions                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Search: [________________________] │ Status: [All ▾] │   │
│  │ Agent:  [All ▾] │ Date: [Last 7d ▾] │ Sort: [Recent]│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────┬──────────┬────────┬──────┬───────┬────────────┐  │
│  │Status│ Session  │ Agent  │Turns │ Cost  │ Duration   │  │
│  ├──────┼──────────┼────────┼──────┼───────┼────────────┤  │
│  │  ●   │ abc-123  │ main   │  24  │ $0.82 │ 12m 34s    │  │
│  │  ✓   │ def-456  │ alpha  │  18  │ $0.41 │  8m 12s    │  │
│  │  ✗   │ ghi-789  │ research│ 50  │ $1.20 │ 25m 01s    │  │
│  │  ✓   │ jkl-012  │ support│   6  │ $0.09 │  2m 45s    │  │
│  └──────┴──────────┴────────┴──────┴───────┴────────────┘  │
│                                                             │
│  ← 1 2 3 ... 24 →                                          │
└─────────────────────────────────────────────────────────────┘
```

### Session Detail / Replay (`/sessions/:id`)

Opens the full conversation transcript with tool call details.

```
┌─────────────────────────────────────────────────────────────┐
│  Session abc-123                                ● Running   │
│  Agent: main │ Started: 14:20 │ Turns: 24 │ Cost: $0.82    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tabs: [Transcript] [Tool Calls] [Metrics] [Raw]     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  TRANSCRIPT TAB:                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ 👤 USER  14:20                                  │ │   │
│  │  │ Refactor the auth module to use JWT tokens      │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ 🤖 ASSISTANT  14:20                             │ │   │
│  │  │ I'll analyze the current auth module and        │ │   │
│  │  │ refactor it to use JWT tokens.                  │ │   │
│  │  │                                                  │ │   │
│  │  │  ┌───────────────────────────────────────────┐  │ │   │
│  │  │  │ 🔧 Read  src/auth/index.ts                │  │ │   │
│  │  │  │   ▸ 142 lines read                        │  │ │   │
│  │  │  └───────────────────────────────────────────┘  │ │   │
│  │  │                                                  │ │   │
│  │  │  ┌───────────────────────────────────────────┐  │ │   │
│  │  │  │ 🔧 Edit  src/auth/index.ts                │  │ │   │
│  │  │  │   ▸ +24 / -8 lines (click to expand diff) │  │ │   │
│  │  │  └───────────────────────────────────────────┘  │ │   │
│  │  │                                                  │ │   │
│  │  │  ┌───────────────────────────────────────────┐  │ │   │
│  │  │  │ 🔧 Bash  npm test                         │  │ │   │
│  │  │  │   ▸ Exit 0 — 12 tests passed (expand)     │  │ │   │
│  │  │  └───────────────────────────────────────────┘  │ │   │
│  │  │                                                  │ │   │
│  │  │ All tests pass. The auth module now uses JWT... │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  [Resume Session] [Fork Session] [Export Transcript]        │
└─────────────────────────────────────────────────────────────┘
```

### Session Actions

| Action | API | Description |
|--------|-----|-------------|
| **Resume** | POST `/api/sessions/:id/resume` | Continue with a new user message |
| **Fork** | POST `/api/sessions/:id/fork` | Clone session to try a different approach |
| **Export** | GET `/api/sessions/:id/export` | Download as Markdown or JSONL |
| **Delete** | DELETE `/api/sessions/:id` | Remove transcript (confirmation required) |
| **Rewind** | POST `/api/sessions/:id/rewind` | Restore files to a prior checkpoint |

---

## 9. Conversation View

For live, interactive conversations with agents (distinct from the read-only session replay).

```
┌─────────────────────────────────────────────────────────────┐
│  Chat: team-alpha                              ● Connected  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Message Thread                     │    │
│  │   (scrollable, virtualized, auto-scroll on new msg) │    │
│  │                                                     │    │
│  │   Messages render as chat bubbles with:             │    │
│  │   • Markdown rendering for text                     │    │
│  │   • Collapsible tool call cards                     │    │
│  │   • Inline code diffs for Edit operations           │    │
│  │   • Syntax-highlighted code blocks                  │    │
│  │   • Image previews for screenshots                  │    │
│  │                                                     │    │
│  │   Live indicator: "Agent is thinking..."            │    │
│  │   or "Agent is running: Bash npm test"              │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────┬───────┐    │
│  │ Type a message...                           │ Send  │    │
│  └─────────────────────────────────────────────┴───────┘    │
│  [Attach file] [Interrupt] [Clear context]                  │
└─────────────────────────────────────────────────────────────┘
```

### Live Streaming

Agent output streams token-by-token via `agent:output` WebSocket events. The UI
renders partial text using a typewriter effect and updates tool call cards in-place
as observations arrive.

### Queue Modes (Visible to User)

When a message is sent while the agent is active, the UI shows which queue mode
was applied:

| Mode | UI Indicator |
|------|-------------|
| `collect` | "Your message will be included in the next response" |
| `followup` | "Queued as next turn (position #2)" |
| `steer` | "Course correction sent — agent will redirect" |
| `steer-backlog` | "Course correction sent — agent will also process your message as a follow-up" |
| `interrupt` | "Agent interrupted — processing your message" |

---

## 10. Task Scheduler

### Task List View (`/tasks`)

```
┌─────────────────────────────────────────────────────────────┐
│  Scheduled Tasks                              [+ New Task]  │
│                                                             │
│  ┌──────┬────────────────┬────────┬──────────┬──────────┐   │
│  │Status│ Task           │ Agent  │ Schedule │ Next Run │   │
│  ├──────┼────────────────┼────────┼──────────┼──────────┤   │
│  │  ●   │ Daily standup  │ main   │ 0 9 * * *│ Tomorrow │   │
│  │      │ report         │        │ (9am)    │ 09:00    │   │
│  │  ●   │ Monitor deploys│ devops │ */30 * * │ In 12m   │   │
│  │      │                │        │ (30min)  │          │   │
│  │  ◌   │ Quarterly audit│ main   │ once     │ Mar 31   │   │
│  │  ⏸   │ Weekly digest  │ alpha  │ 0 17 * *5│ (Paused) │   │
│  └──────┴────────────────┴────────┴──────────┴──────────┘   │
│                                                             │
│  [Pause Selected] [Resume Selected] [Delete Selected]       │
└─────────────────────────────────────────────────────────────┘
```

### Task Editor Dialog

```
┌────────────────────────────────────────────────────┐
│  Create Scheduled Task                             │
│                                                    │
│  Prompt:                                           │
│  ┌──────────────────────────────────────────────┐  │
│  │ Generate a daily standup summary from the     │  │
│  │ team's recent messages and post it to the     │  │
│  │ channel.                                      │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Target Agent:  [main           ▾]                 │
│  Schedule Type: (●) Cron  ( ) Interval  ( ) Once  │
│  Cron:          [0 9 * * 1-5     ]                 │
│                 "At 09:00 on every day-of-week     │
│                  from Monday through Friday"       │
│  Context Mode:  (●) Group  ( ) Isolated            │
│  Timezone:      [America/New_York ▾]               │
│                                                    │
│  [Cancel]                         [Create Task]    │
└────────────────────────────────────────────────────┘
```

### Run Log

Each task has a run history showing:
- Timestamp, duration, cost, turn count
- Status (success / error / max_turns / timeout)
- Link to the session transcript
- Error details if failed

---

## 11. Integration Manager

### Channel Overview (`/channels`)

```
┌─────────────────────────────────────────────────────────────┐
│  Integrations                                   [+ Add]     │
│                                                             │
│  MESSAGING CHANNELS                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WhatsApp    ● Connected   │ 4 groups │ [Configure]  │   │
│  │  Telegram    ○ Disconnected│ —        │ [Connect]    │   │
│  │  Slack       ● Connected   │ 2 groups │ [Configure]  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  WEBHOOKS                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GitHub     POST /webhook/github    │ 47 events/24h │   │
│  │  Stripe     POST /webhook/stripe    │  3 events/24h │   │
│  │  [+ Add Webhook Endpoint]                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  MCP SERVERS                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  agent       ● Connected   │ 6 tools │ In-process   │   │
│  │  playwright  ● Connected   │ 12 tools│ Subprocess   │   │
│  │  database    ◌ Pending     │ —       │ HTTP         │   │
│  │  [+ Add MCP Server]                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  API KEYS                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Anthropic   ●●●●●●●●hx4Q  │ Valid │ [Rotate]      │   │
│  │  OpenAI      Not configured │       │ [Add]         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Channel Configuration Dialog

| Field | Type | Description |
|-------|------|-------------|
| Channel type | Select | WhatsApp, Telegram, Slack, Discord |
| Connection config | Channel-specific | QR code (WhatsApp), bot token (Telegram), OAuth (Slack) |
| Default trigger pattern | Text | e.g., `@Andy` |
| Auto-reconnect | Toggle | Reconnect on disconnect |
| Message retention | Select | 7d / 30d / 90d / unlimited |

### Webhook Configuration

| Field | Type | Description |
|-------|------|-------------|
| Endpoint path | Text | `/webhook/{name}` — auto-generated URL shown |
| Target agent | Select | Which group folder receives the event |
| Secret | Auto-generated | HMAC signature verification |
| Event filter | JSON | Optional JMESPath filter for payload |
| Active | Toggle | Enable/disable without deleting |

---

## 12. Memory Editor

An in-browser editor for the hierarchical CLAUDE.md memory files.

### Layout (`/memory`)

```
┌─────────────────────────────────────────────────────────────┐
│  Memory Editor                                              │
│                                                             │
│  ┌──────────────┐  ┌────────────────────────────────────┐   │
│  │ FILE TREE    │  │ EDITOR (Monaco)                    │   │
│  │              │  │                                    │   │
│  │ ▾ global/    │  │ # Global Agent Memory              │   │
│  │   CLAUDE.md ◀│  │                                    │   │
│  │              │  │ ## Identity                        │   │
│  │ ▾ main/      │  │ You are Andy, a helpful assistant. │   │
│  │   CLAUDE.md  │  │                                    │   │
│  │   notes.md   │  │ ## User Preferences                │   │
│  │              │  │ - Prefer concise responses          │   │
│  │ ▾ team-alpha/│  │ - Use bullet points for lists      │   │
│  │   CLAUDE.md  │  │                                    │   │
│  │   research/  │  │ ## Known Facts                     │   │
│  │     report.md│  │ - Production server: 10.0.1.5      │   │
│  │              │  │ - Deploy branch: main               │   │
│  │ ▾ research/  │  │                                    │   │
│  │   CLAUDE.md  │  │                                    │   │
│  └──────────────┘  │                                    │   │
│                    │ [Ln 1, Col 1] [Markdown] [UTF-8]   │   │
│                    └────────────────────────────────────┘   │
│                                                             │
│  [Save] [Revert] [View Diff] [History]                     │
│                                                             │
│  ⚠ Non-admin agents cannot modify global/CLAUDE.md          │
└─────────────────────────────────────────────────────────────┘
```

### Features

- **Monaco Editor** with Markdown syntax highlighting and preview
- **File tree** showing the full `groups/` hierarchy
- **Diff view** comparing current content with the last saved version
- **History** showing git log of changes to each file
- **Access control** badge showing which agents can read/write each file
- **Live preview** of how the markdown will render in agent context

---

## 13. Tool & Skill Registry

### Tool Inventory (`/tools`)

```
┌─────────────────────────────────────────────────────────────┐
│  Tool Registry                                              │
│                                                             │
│  Tabs: [Built-in] [MCP Tools] [Skills] [Usage Stats]       │
│                                                             │
│  BUILT-IN TOOLS:                                            │
│  ┌──────────┬──────────┬───────────┬────────────────────┐   │
│  │ Tool     │ Risk     │ Sandboxed │ Usage (24h)        │   │
│  ├──────────┼──────────┼───────────┼────────────────────┤   │
│  │ Read     │ Low      │ N/A       │ ████████░░  847    │   │
│  │ Edit     │ Medium   │ N/A       │ █████░░░░░  412    │   │
│  │ Bash     │ High     │ ● Yes     │ ████░░░░░░  356    │   │
│  │ Write    │ Medium   │ N/A       │ ███░░░░░░░  201    │   │
│  │ Glob     │ Low      │ N/A       │ ██████░░░░  623    │   │
│  │ Grep     │ Low      │ N/A       │ █████░░░░░  489    │   │
│  │ WebSearch│ Low      │ N/A       │ ██░░░░░░░░  134    │   │
│  │ WebFetch │ Low      │ N/A       │ █░░░░░░░░░   78    │   │
│  │ Task     │ Medium   │ N/A       │ █░░░░░░░░░   67    │   │
│  │ TodoWrite│ Low      │ N/A       │ █░░░░░░░░░   45    │   │
│  └──────────┴──────────┴───────────┴────────────────────┘   │
│                                                             │
│  AGENT MCP TOOLS (click to expand input/output schema):     │
│  ┌──────────────────┬──────────┬────────────────────────┐   │
│  │ send_message     │ agent    │ ██░░░░░░░░  89         │   │
│  │ schedule_task    │ agent    │ █░░░░░░░░░  12         │   │
│  │ list_tasks       │ agent    │ █░░░░░░░░░   8         │   │
│  │ pause_task       │ agent    │ ░░░░░░░░░░   3         │   │
│  │ resume_task      │ agent    │ ░░░░░░░░░░   2         │   │
│  │ cancel_task      │ agent    │ ░░░░░░░░░░   1         │   │
│  └──────────────────┴──────────┴────────────────────────┘   │
│                                                             │
│  EXTERNAL MCP TOOLS (e.g., Playwright):                     │
│  ┌──────────────────┬──────────┬────────────────────────┐   │
│  │ browser_click    │playwright│ ███░░░░░░░  234        │   │
│  │ browser_navigate │playwright│ ██░░░░░░░░  156        │   │
│  │ browser_type     │playwright│ ██░░░░░░░░  142        │   │
│  └──────────────────┴──────────┴────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Skill Management

For code-transform skills (NanoClaw pattern):

| Column | Description |
|--------|-------------|
| Skill name | e.g., `add-telegram` |
| Version | e.g., `1.0.0` |
| Status | Applied / Available / Conflict |
| Files modified | List of affected source files |
| Actions | [Apply] [Remove] [View Manifest] |

---

## 14. Security & Permissions Console

### Permission Rules (`/security`)

```
┌─────────────────────────────────────────────────────────────┐
│  Security Console                                           │
│                                                             │
│  Tabs: [Permissions] [Mount Allowlist] [Audit Log]          │
│                                                             │
│  PERMISSION RULES:                                          │
│  ┌────────────┬──────────────┬────────────┬──────────────┐  │
│  │ Agent      │ Tool         │ Rule       │ Behavior     │  │
│  ├────────────┼──────────────┼────────────┼──────────────┤  │
│  │ * (all)    │ Read         │ *          │ ✓ Allow      │  │
│  │ * (all)    │ Bash         │ rm -rf *   │ ✗ Deny       │  │
│  │ research   │ Write        │ *.md       │ ✓ Allow      │  │
│  │ research   │ Write        │ *          │ ? Ask        │  │
│  │ main       │ *            │ *          │ ✓ Allow      │  │
│  └────────────┴──────────────┴────────────┴──────────────┘  │
│  [+ Add Rule]                                               │
│                                                             │
│  MOUNT ALLOWLIST:                                           │
│  ┌────────────────────────────┬─────────┬──────────────┐    │
│  │ Path                       │ Access  │ Description  │    │
│  ├────────────────────────────┼─────────┼──────────────┤    │
│  │ ~/projects                 │ rw      │ Dev projects │    │
│  │ ~/documents                │ ro      │ Reference    │    │
│  └────────────────────────────┴─────────┴──────────────┘    │
│  [+ Add Path]                                               │
│  ⚠ Stored at ~/.config/nanoclaw/mount-allowlist.json        │
│    (outside project root — tamper-proof from agents)         │
│                                                             │
│  AUDIT LOG:                                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 14:32 main     │ Edit  │ src/auth.ts    │ Allowed   │   │
│  │ 14:31 research │ Bash  │ curl https://..│ Denied    │   │
│  │ 14:30 main     │ Write │ /etc/hosts     │ Denied    │   │
│  │ 14:28 alpha    │ Bash  │ npm test       │ Allowed   │   │
│  └──────────────────────────────────────────────────────┘   │
│  [Export] [Filter by agent] [Filter by decision]            │
└─────────────────────────────────────────────────────────────┘
```

---

## 15. Observability & Analytics

### Analytics Dashboard (`/analytics`)

```
┌─────────────────────────────────────────────────────────────┐
│  Analytics                          Period: [Last 30d ▾]    │
│                                                             │
│  COST BREAKDOWN                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Total: $142.30                                       │   │
│  │  ┌───────────────────────────────────────────────┐    │   │
│  │  │  ████████████████████  main       $62.10      │    │   │
│  │  │  ██████████            team-alpha $34.50      │    │   │
│  │  │  ████████              research   $28.20      │    │   │
│  │  │  ████                  support    $17.50      │    │   │
│  │  └───────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  TOKEN USAGE OVER TIME          MODEL DISTRIBUTION          │
│  ┌──────────────────────┐      ┌──────────────────────┐     │
│  │  Input ─── Output    │      │  ┌──────────────┐    │     │
│  │      ╱╲              │      │  │ Sonnet  62%  │    │     │
│  │  ╱──╱  ╲──╲          │      │  │ Haiku   28%  │    │     │
│  │ ╱         ╲──        │      │  │ Opus    10%  │    │     │
│  │╱              ╲──    │      │  └──────────────┘    │     │
│  └──────────────────────┘      └──────────────────────┘     │
│                                                             │
│  PERFORMANCE                    ERROR ANALYSIS              │
│  ┌──────────────────────┐      ┌──────────────────────┐     │
│  │ Avg turns: 18.4      │      │ max_turns:     12    │     │
│  │ Avg cost:  $0.34     │      │ max_budget:     3    │     │
│  │ Avg duration: 6m 12s │      │ execution:      8    │     │
│  │ Success rate: 94.2%  │      │ timeout:        2    │     │
│  │ Tool accuracy: 97.1% │      │ Total:         25    │     │
│  └──────────────────────┘      └──────────────────────┘     │
│                                                             │
│  TOP TOOLS (by call count)                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Read ████████████████████████████████████  4,230     │   │
│  │ Grep ██████████████████████████           2,891     │   │
│  │ Edit ██████████████████                   2,012     │   │
│  │ Bash █████████████████                    1,847     │   │
│  │ Glob ████████████████                     1,623     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Exportable Reports

- CSV/JSON export of all metrics for a given period
- Per-agent breakdown of cost, tokens, sessions, errors
- Trend lines for week-over-week comparison

---

## 16. Human-in-the-Loop Approval Queue

The most time-critical view. When a high-risk tool call requires approval, it appears
here and as a notification toast.

### Approval Queue (`/approvals`)

```
┌─────────────────────────────────────────────────────────────┐
│  Pending Approvals (2)                        [Auto-deny ▾] │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ⚠ HIGH RISK                         Requested 2m ago│   │
│  │                                                       │   │
│  │  Agent: research │ Session: abc-123                   │   │
│  │  Tool:  Bash                                          │   │
│  │                                                       │   │
│  │  Command:                                             │   │
│  │  ┌───────────────────────────────────────────────┐    │   │
│  │  │ curl -X POST https://api.external.com/deploy  │    │   │
│  │  │   -H "Authorization: Bearer $TOKEN"           │    │   │
│  │  │   -d '{"version": "2.1.0"}'                   │    │   │
│  │  └───────────────────────────────────────────────┘    │   │
│  │                                                       │   │
│  │  Context: Agent is deploying v2.1.0 as part of the   │   │
│  │  release workflow requested by @admin in the main     │   │
│  │  channel.                                             │   │
│  │                                                       │   │
│  │  [✓ Approve]  [✗ Deny]  [View Session]  ⏱ 4:58 left │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ⚠ MEDIUM RISK                       Requested 8m ago│  │
│  │                                                       │   │
│  │  Agent: main │ Session: def-456                       │   │
│  │  Tool:  Write                                         │   │
│  │  File:  /workspace/project/.env.production            │   │
│  │                                                       │   │
│  │  [✓ Approve]  [✗ Deny]  [View Session]  ⏱ 1:52 left │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  RESOLVED (today):                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 14:20 │ Approved │ main     │ Bash: git push        │   │
│  │ 13:45 │ Denied   │ research │ Write: /etc/crontab   │   │
│  │ 11:30 │ Timeout  │ alpha    │ Bash: docker rm -f    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Approval Flow

```
Agent requests tool call
         │
         ▼
PreToolUse hook evaluates risk
         │
    ┌────┴────┐
    │ Low     │ High/Critical
    │         │
    ▼         ▼
Auto-allow   Create ApprovalRequest
             │
             ├──▶ WS: approval:request → Browser
             │
             ▼
         Wait (with timeout)
             │
    ┌────────┼────────┐
    │        │        │
    ▼        ▼        ▼
 Approve   Deny    Timeout
    │        │        │
    ▼        ▼        ▼
 Execute  Block    Auto-deny
 tool     tool     (configurable)
```

### Mobile Push

Approval requests trigger browser push notifications (via Service Worker) so
operators can approve from their phone. The notification deep-links to the
approval card.

---

## 17. Settings & Configuration

### System Settings (`/settings`)

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                    │
│                                                             │
│  Tabs: [General] [Users] [Environment] [Danger Zone]        │
│                                                             │
│  GENERAL:                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Assistant name:      [Andy                ]         │   │
│  │  Default model:       [claude-sonnet-4-6   ▾]        │   │
│  │  Max concurrent:      [5                   ]         │   │
│  │  Default max turns:   [50                  ]         │   │
│  │  Default budget (USD):[2.00                ]         │   │
│  │  Container timeout:   [30 minutes          ]         │   │
│  │  Heartbeat interval:  [30 minutes          ]         │   │
│  │  Message poll interval:[2 seconds          ]         │   │
│  │  Queue mode:          [collect             ▾]        │   │
│  │  Timezone:            [America/New_York    ▾]        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  USERS:                                                     │
│  ┌────────┬───────────────┬──────────┬──────────────────┐   │
│  │ Name   │ Email         │ Role     │ Actions          │   │
│  ├────────┼───────────────┼──────────┼──────────────────┤   │
│  │ Admin  │ admin@co.com  │ admin    │ [Edit] [Remove]  │   │
│  │ Dev 1  │ dev1@co.com   │ operator │ [Edit] [Remove]  │   │
│  │ Dev 2  │ dev2@co.com   │ viewer   │ [Edit] [Remove]  │   │
│  └────────┴───────────────┴──────────┴──────────────────┘   │
│  [+ Invite User]                                            │
│                                                             │
│  ROLES:                                                     │
│  ┌──────────┬──────────────────────────────────────────┐    │
│  │ admin    │ Full access — all views, all actions      │    │
│  │ operator │ Can approve, configure agents, view all   │    │
│  │ viewer   │ Read-only — dashboard, sessions, analytics│    │
│  └──────────┴──────────────────────────────────────────┘    │
│                                                             │
│  DANGER ZONE:                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [Purge All Sessions]  [Stop All Agents]             │   │
│  │  [Reset to Factory Defaults]                          │   │
│  │  (each requires typed confirmation)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 18. Data Model & API Contract

### REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| **Agents** | | |
| GET | `/api/agents` | List all agent groups |
| GET | `/api/agents/:folder` | Get agent detail |
| POST | `/api/agents` | Register new agent group |
| PUT | `/api/agents/:folder` | Update agent config |
| DELETE | `/api/agents/:folder` | Deregister agent |
| POST | `/api/agents/:folder/start` | Wake agent |
| POST | `/api/agents/:folder/stop` | Stop agent |
| **Sessions** | | |
| GET | `/api/sessions` | List sessions (paginated, filterable) |
| GET | `/api/sessions/:id` | Get session detail + transcript |
| POST | `/api/sessions/:id/resume` | Resume session |
| POST | `/api/sessions/:id/fork` | Fork session |
| POST | `/api/sessions/:id/rewind` | Rewind to checkpoint |
| DELETE | `/api/sessions/:id` | Delete session |
| GET | `/api/sessions/:id/export` | Export transcript |
| **Tasks** | | |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/pause` | Pause task |
| POST | `/api/tasks/:id/resume` | Resume task |
| GET | `/api/tasks/:id/logs` | Get run history |
| **Integrations** | | |
| GET | `/api/channels` | List channels |
| POST | `/api/channels` | Add channel |
| PUT | `/api/channels/:id` | Update channel |
| DELETE | `/api/channels/:id` | Remove channel |
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |
| DELETE | `/api/webhooks/:id` | Delete webhook |
| GET | `/api/mcp-servers` | List MCP servers |
| **Memory** | | |
| GET | `/api/memory` | List all memory files |
| GET | `/api/memory/:path` | Read file content |
| PUT | `/api/memory/:path` | Write file content |
| GET | `/api/memory/:path/history` | File change history |
| **Security** | | |
| GET | `/api/security/rules` | List permission rules |
| PUT | `/api/security/rules` | Update rules |
| GET | `/api/security/allowlist` | Get mount allowlist |
| PUT | `/api/security/allowlist` | Update allowlist |
| GET | `/api/security/audit` | Query audit log |
| **Metrics** | | |
| GET | `/api/metrics/overview` | Current KPIs |
| GET | `/api/metrics/cost` | Cost time series |
| GET | `/api/metrics/tokens` | Token usage time series |
| GET | `/api/metrics/tools` | Tool usage breakdown |
| GET | `/api/metrics/errors` | Error breakdown |
| **Approvals** | | |
| GET | `/api/approvals/pending` | List pending approvals |
| POST | `/api/approvals/:id/approve` | Approve tool call |
| POST | `/api/approvals/:id/deny` | Deny tool call |
| **Settings** | | |
| GET | `/api/settings` | Get system settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Core Data Types

```typescript
interface Agent {
  folder: string;              // Primary key
  name: string;
  channel: string;
  chatJid: string;
  trigger: string;
  isMain: boolean;
  sessionId?: string;
  config: AgentConfig;
  status: AgentStatus;
  addedAt: string;
}

interface AgentConfig {
  model: string;
  maxTurns: number;
  maxBudgetUsd: number;
  timeoutMs: number;
  allowedTools: string[];
  systemPromptAppend?: string;
  mcpServers: Record<string, McpServerConfig>;
  additionalMounts: Mount[];
  queueMode: "collect" | "followup" | "steer" | "steer-backlog" | "interrupt";
}

interface Session {
  id: string;
  agentFolder: string;
  status: "active" | "completed" | "error" | "timeout";
  turns: number;
  costUsd: number;
  durationMs: number;
  startedAt: string;
  completedAt?: string;
  errorSubtype?: "max_turns" | "max_budget" | "execution" | "user_cancelled" | "steered";
  transcript: TranscriptEntry[];
}

interface TranscriptEntry {
  uuid: string;
  type: "user" | "assistant" | "system" | "result" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  timestamp: string;
}
// "system" and "result" map to SDK's SDKSystemMessage and SDKResultMessage.
// "tool_call" and "tool_result" are display decompositions of SDKAssistantMessage
// content blocks (which contain both text and tool_use blocks).

interface ScheduledTask {
  id: string;
  prompt: string;
  groupFolder: string;
  scheduleType: "cron" | "interval" | "once";
  scheduleValue: string;
  contextMode: "group" | "isolated";
  status: "active" | "paused" | "completed";
  nextRun?: string;
  lastRun?: string;
  createdAt: string;
}

interface ApprovalRequest {
  id: string;
  agentId: string;
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: "medium" | "medium-high" | "high" | "critical";
  status: "pending" | "approved" | "denied" | "timeout";
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  timeoutMs: number;
}
```

---

## 19. State Management

### Zustand Store Slices

```typescript
// stores/index.ts

interface AppStore {
  // Connection
  wsStatus: "connecting" | "open" | "closed";

  // Agents
  agents: Map<string, Agent>;
  updateAgentStatus: (event: AgentStatusEvent) => void;

  // Sessions
  sessions: Map<string, Session>;
  activeSessionId?: string;

  // Approvals
  pendingApprovals: ApprovalRequest[];
  addApproval: (req: ApprovalRequest) => void;
  resolveApproval: (id: string, decision: "approved" | "denied") => void;

  // Metrics
  metrics: MetricsTickEvent;

  // Live output
  liveOutputs: Map<string, AgentOutputEvent[]>;
  appendOutput: (event: AgentOutputEvent) => void;

  // Tasks
  tasks: ScheduledTask[];
}
```

### Data Flow

```
WS Event arrives
       │
       ▼
dispatchWSEvent() — routes by message type
       │
       ├── agent:status    → store.updateAgentStatus()
       ├── agent:output    → store.appendOutput()
       ├── approval:request→ store.addApproval() + toast notification
       ├── metrics:tick    → store.metrics = payload
       ├── session:update  → store.sessions.set()
       └── error:agent     → store.appendError() + toast
```

### Optimistic Updates

Approval responses use optimistic UI: the card is immediately marked as resolved
when the operator clicks Approve/Deny, with rollback if the server rejects.

---

## 20. Responsive & Accessibility

### Breakpoints

| Breakpoint | Layout | Priority Views |
|------------|--------|----------------|
| Desktop (≥1280px) | Full sidebar + content | All views |
| Tablet (768-1279px) | Collapsible sidebar | Dashboard, Approvals, Conversations |
| Mobile (< 768px) | Bottom tab bar, stacked cards | Dashboard, Approvals, Conversations |

### Mobile-First Views

- **Dashboard**: KPI cards stack vertically, agent grid becomes a card list
- **Approvals**: Full-screen approval cards with large tap targets
- **Conversations**: Native chat-style layout, bottom-anchored input
- **Others**: Redirect to desktop with "best viewed on larger screen" message

### Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | All interactive elements focusable, logical tab order |
| Screen readers | ARIA labels on status indicators, live regions for WS updates |
| Color contrast | WCAG 2.1 AA — all text, status colors have sufficient contrast |
| Reduced motion | `prefers-reduced-motion` disables typewriter effect, chart animations |
| Focus indicators | Visible focus rings on all interactive elements |

---

## 21. Deployment

### Build & Deploy

```bash
# Development
npm run dev          # Next.js dev server with HMR

# Production
npm run build        # Static optimization + RSC prerender
npm run start        # Production server

# Docker
docker build -t agent-console .
docker run -p 3000:3000 \
  -e API_URL=http://orchestrator:8080 \
  -e WS_URL=ws://orchestrator:8080/ws \
  agent-console
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | Backend orchestrator REST endpoint |
| `WS_URL` | Yes | Backend orchestrator WebSocket endpoint |
| `NEXTAUTH_SECRET` | Yes | Auth session encryption key |
| `NEXTAUTH_URL` | Yes | Public URL of the frontend |
| `AUTH_PROVIDER` | No | `github` / `google` / `credentials` (default: `credentials`) |

### Architecture Options

| Deployment | Frontend | Backend | Notes |
|------------|----------|---------|-------|
| **Single-process** | Next.js API routes serve both | Embedded | Simplest — for single-operator setups |
| **Split** | Next.js on Vercel/Cloudflare | Orchestrator on VPS/Docker | Scalable — frontend CDN-cached |
| **Containerized** | Docker | Docker Compose | Self-hosted — both in same network |

---

*Document generated 2026-02-25. Companion to
[AUTONOMOUS_AGENT_DESIGN.md](./AUTONOMOUS_AGENT_DESIGN.md) and
[IMPLEMENTATION_GUIDE_CLAUDE_AGENT_SDK.md](./IMPLEMENTATION_GUIDE_CLAUDE_AGENT_SDK.md).*
