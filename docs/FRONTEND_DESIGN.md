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
13. [Tool Registry](#13-tool-registry)
14. [Security & Permissions Console](#14-security--permissions-console)
15. [Observability & Analytics](#15-observability--analytics)
16. [Human-in-the-Loop Approval Queue](#16-human-in-the-loop-approval-queue)
17. [Settings & Configuration](#17-settings--configuration)
18. [Data Model & API Contract](#18-data-model--api-contract)
19. [State Management](#19-state-management)
20. [RBAC Enforcement](#20-rbac-enforcement)
21. [Responsive & Accessibility](#21-responsive--accessibility)
22. [Deployment](#22-deployment)

---

## 1. Design Goals

| Goal | Rationale |
|------|-----------|
| **Operational visibility** | Operators need a single pane of glass showing every running agent, queue depth, active sessions, cost, and errors — without reading logs. |
| **Direct manipulation** | Every entity visible in the UI (agents, sessions, tasks, integrations, memory) must be directly editable. Read-only dashboards breed shadow tooling. |
| **Real-time** | Agent status, conversation output, and metrics update live via WebSocket. No polling, no stale data. |
| **Human-in-the-loop** | High-risk tool calls surface as interactive approval cards. Operators approve or deny in the browser; the agent resumes immediately. |
| **Mobile-capable** | Critical views (dashboard, approvals, conversations) must work on mobile. Operators are not always at a desk. |
| **Composable** | Each view is a self-contained module. New integration channels, tool types, or agent patterns can be added without refactoring the shell. |

---

## 2. Architecture Overview

```
+--------------------------------------------------------------------+
|                          BROWSER CLIENT                            |
|                                                                    |
|  +----------+ +--------------+ +----------+ +------------------+  |
|  |Dashboard | |Agent Manager | |Session   | |Approval Queue    |  |
|  |          | |              | |Explorer  | |(HITL)            |  |
|  +----+-----+ +------+-------+ +----+-----+ +--------+---------+  |
|       |              |              |                 |            |
|  +----+--------------+--------------+-----------------+--------+  |
|  |              State Layer (Zustand Store)                     |  |
|  |   agents | sessions | tasks | metrics | approvals | ws      |  |
|  +------------------------+------------------------------------+  |
|                           |                                       |
|  +------------------------+------------------------------------+  |
|  |         Transport Layer (WebSocket + REST)                  |  |
|  |  WS: events, output, approvals                              |  |
|  |  REST: CRUD, config, bulk operations, state snapshot        |  |
|  +------------------------+------------------------------------+  |
+---------------------------+----------------------------------------+
                            | wss:// + https://
                            v
+--------------------------------------------------------------------+
|                        BACKEND API SERVER                          |
|                                                                    |
|  +----------+  +--------------+  +------------------------------+ |
|  |  REST    |  |  WebSocket   |  |  Auth (NextAuth session +    | |
|  |  Routes  |  |  Gateway     |  |  RBAC)                       | |
|  +----+-----+  +------+-------+  +------------------------------+ |
|       |               |                                           |
|  +----+---------------+------------------------------------------+|
|  |              Orchestrator (Control Plane)                     ||
|  |  GroupQueue | Scheduler | IPC Watcher | Channel Router        ||
|  +------------------------------+-----------------------------+--+|
|                                 |                               |
|  +------------------------------+--------------------------+    |
|  |  State Layer: SQLite/Postgres | Filesystem              |    |
|  +----------------------------------------------------------+    |
+--------------------------------------------------------------------+
```

The frontend never talks directly to agents. All communication flows through the
backend API server. The WebSocket connection carries real-time events; REST handles
CRUD, configuration, and state snapshots.

In-process SDK execution is the default mode. Container (hardened) mode is optional
and controlled per-agent via configuration.

---

## 3. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | RSC streaming for dashboard, API routes for BFF |
| **Language** | TypeScript | Shared types with backend SDK code |
| **UI Library** | shadcn/ui + Tailwind CSS v3 | Composable primitives, no vendor lock-in, accessible by default |
| **State** | Zustand | Lightweight, supports subscriptions, no boilerplate |
| **Real-time** | Native WebSocket + reconnection hook | No Socket.IO overhead; typed protocol |
| **Charts** | Recharts | React-native, composable, good perf for live data |
| **Tables** | TanStack Table v8 | Virtualized, sortable, filterable — handles 10k+ rows |
| **Code/Log Viewer** | Monaco Editor (lazy-loaded) | Syntax highlighting for CLAUDE.md, JSON transcripts |
| **Forms** | React Hook Form + Zod | Type-safe validation shared with backend schemas |
| **Date/Cron** | date-fns + cronstrue | Human-readable cron descriptions |
| **Notifications** | Sonner | Minimal toast library for real-time alerts |
| **Auth** | NextAuth.js v5 | OAuth + session-based RBAC; session cookies used for WS auth |

### Dependencies (`package.json` outline)

```json
{
  "dependencies": {
    "next": "^15.2",
    "react": "^19",
    "zustand": "^5",
    "@tanstack/react-table": "^8",
    "recharts": "^2.13",
    "tailwindcss": "^3",
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
  // Server -> Client events
  | { type: "agent:status";       payload: AgentStatusEvent }
  | { type: "agent:output";       payload: AgentOutputEvent }
  | { type: "agent:error";        payload: AgentErrorEvent }
  | { type: "session:update";     payload: SessionUpdateEvent }
  | { type: "queue:depth";        payload: QueueDepthEvent }
  | { type: "metrics:tick";       payload: MetricsTickEvent }
  | { type: "approval:request";   payload: ApprovalRequestEvent }
  | { type: "approval:resolved";  payload: ApprovalResolvedEvent }
  | { type: "task:fired";         payload: TaskFiredEvent }
  | { type: "task:completed";     payload: TaskCompletedEvent }
  | { type: "integration:status"; payload: IntegrationStatusEvent }

  // Client -> Server commands
  | { type: "approval:respond";   payload: ApprovalResponse }
  | { type: "agent:interrupt";    payload: { folder: string } }
  | { type: "session:subscribe";  payload: { sessionId: string } }
  | { type: "session:unsubscribe";payload: { sessionId: string } };
```

### WebSocket Authentication

NextAuth.js v5 session cookies are sent automatically on the WebSocket HTTP Upgrade
request. The backend validates the session cookie during the upgrade handshake — no
token in the URL is needed or allowed (tokens in URLs appear in server logs, browser
history, and Referer headers).

For split deployments where the Next.js frontend is on a different host than the
orchestrator: call a REST endpoint (`POST /api/auth/ws-ticket`) first to obtain a
short-lived one-time ticket, then connect to the WS with `?ticket=<value>`. The
backend validates the ticket and immediately discards it.

### Connection Hook

```typescript
// hooks/use-websocket.ts

function useWebSocket() {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  // Store timeout ID in a ref so cleanup works correctly under React Strict Mode
  // (double-invoke of effects). Clearing the ref in cleanup prevents a stale
  // timeout from reconnecting after the component unmounts.
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function connect() {
      // Session cookie is sent automatically on the Upgrade request.
      // Do NOT append ?token=... to this URL.
      const ws = new WebSocket(WS_URL);

      ws.onopen = async () => {
        setStatus("open");
        reconnectAttempt.current = 0;
        // After a reconnect, fetch a full state snapshot so the store is
        // consistent with reality before resuming live event processing.
        try {
          const snapshot = await fetch("/api/state/snapshot").then(r => r.json());
          useAppStore.getState().applySnapshot(snapshot);
        } catch (err) {
          console.error("Failed to fetch state snapshot after reconnect", err);
        }
      };

      ws.onmessage = (event) => {
        let msg: WSMessage;
        try {
          msg = JSON.parse(event.data) as WSMessage;
        } catch (err) {
          console.warn("Malformed WS message discarded", event.data, err);
          return;
        }
        dispatchWSEvent(msg);
      };

      ws.onclose = () => {
        setStatus("closed");
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
        reconnectAttempt.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      wsRef.current = ws;
    }

    connect();
    return () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
    };
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
  folder: string;
  status: "idle" | "running" | "queued" | "error" | "timeout";
  currentTool?: string;
  turnCount: number;
  costUsd: number;
  startedAt?: string;
}

interface AgentOutputEvent {
  folder: string;
  sessionId: string;
  // Content arrives as a complete message, not token-by-token deltas.
  // The frontend may animate display with a typewriter effect, but it
  // is rendering a full message string, not incremental tokens.
  messageType: "text" | "tool_call" | "tool_result" | "thinking";
  content: string;
  toolName?: string;
  timestamp: string;
}

interface AgentErrorEvent {
  folder: string;
  error: string;
  timestamp: string;
  sessionId?: string;
}

interface ApprovalRequestEvent {
  id: string;
  folder: string;
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: "medium" | "medium-high" | "high" | "critical";
  requestedAt: string;
  timeoutMs: number;
}

interface IntegrationStatusEvent {
  channel: string;
  folder: string;
  status: "connected" | "disconnected" | "error";
  detail?: string;
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
+-------------------------------------------------------------+
|  +--------+                                    +---------+  |
|  | Logo   |  Agent Orchestrator        [search] | * Admin |  |
|  +--------+                                    +---------+  |
+------------+------------------------------------------------+
|            |                                                |
|  Dashboard |  +------------------------------------------+  |
|  ----------|  |                                          |  |
|  Agents    |  |          MAIN CONTENT AREA               |  |
|  Sessions  |  |                                          |  |
|  Tasks     |  |   (each nav item renders its view here)  |  |
|  ----------|  |                                          |  |
|  Channels  |  |                                          |  |
|  Memory    |  |                                          |  |
|  Tools     |  |                                          |  |
|  ----------|  |                                          |  |
|  Security  |  |                                          |  |
|  Analytics |  |                                          |  |
|  Settings  |  |                                          |  |
|  ----------|  |                                          |  |
|  * 2 Pending|  |                                          |  |
|   Approvals |  +------------------------------------------+  |
|            |                                                |
+------------+------------------------------------------------+
|  WS: Connected | 3 agents running | Queue: 1 | $4.82 today  |
+-------------------------------------------------------------+
```

### Navigation Structure

| Section | Route | Description |
|---------|-------|-------------|
| Dashboard | `/` | System overview — live metrics, status grid, cost chart |
| Agents | `/agents` | Agent list, config, start/stop, live status |
| Sessions | `/sessions` | Session explorer — browse, search, view transcripts |
| Tasks | `/tasks` | Scheduled tasks — cron editor, run logs, pause/resume |
| Channels | `/channels` | Integration manager — WhatsApp, Slack, Telegram, webhooks |
| Memory | `/memory` | CLAUDE.md editor — global + per-group memory files |
| Tools | `/tools` | Tool registry — built-in tools, MCP servers, usage stats |
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
+-------------------------------------------------------------+
|  ACTIVE AGENTS     QUEUE DEPTH     SESSIONS TODAY    COST   |
|  +---------+       +---------+    +----------+    +------+  |
|  |    3    |       |    1    |    |    47    |    |$12.40|  |
|  | running |       | waiting |    | completed|    | 24h  |  |
|  +---------+       +---------+    +----------+    +------+  |
+-------------------------------------------------------------+
|                                                             |
|  AGENT STATUS GRID                    COST OVER TIME        |
|  +--------------------------+        +------------------+   |
|  | main       * Running     |        |  /\               |  |
|  |            Turn 12, $0.34|        | /  \   /\        |  |
|  | team-alpha o Idle        |        |/    \_/  \       |  |
|  |            Last: 3m ago  |        |           \      |  |
|  | research   * Running     |        |            \_    |  |
|  |            Turn 5, $0.12 |        |              --  |  |
|  | support    @ Queued      |        |     7d | 24h | 1h|  |
|  |            Position: 1   |        +------------------+   |
|  +--------------------------+                               |
|                                                             |
+-------------------------------------------------------------+
|                                                             |
|  RECENT ACTIVITY FEED                 PENDING APPROVALS     |
|  +--------------------------+        +------------------+   |
|  | 14:32 main: Completed    |        | ! Bash: rm -rf   |  |
|  |       session abc123     |        |   Agent: research |  |
|  | 14:31 team-alpha: Tool   |        |   [Approve] [Deny]|  |
|  |       call -- Edit file  |        |                   |  |
|  | 14:28 research: Started  |        | ! Write: /etc/   |  |
|  |       session def456     |        |   Agent: main     |  |
|  | 14:25 Webhook received   |        |   [Approve] [Deny]|  |
|  |       for team-alpha     |        |                   |  |
|  +--------------------------+        +------------------+   |
|                                                             |
+-------------------------------------------------------------+
|  ERROR LOG (Last 24h)                                       |
|  +------------------------------------------------------+   |
|  | 14:15 research -- error_max_turns (50 turns reached) |   |
|  | 12:03 support  -- container_timeout (30m exceeded)   |   |
|  | 09:41 main     -- tool_failure (WebFetch 503)        |   |
|  +------------------------------------------------------+   |
+-------------------------------------------------------------+
```

### Component Breakdown

| Component | Data Source | Update Frequency |
|-----------|------------|------------------|
| **KPI Cards** (4x) | `metrics:tick` WS event | Every 5 seconds |
| **Agent Status Grid** | `agent:status` WS events | Real-time |
| **Cost Chart** | REST `/api/metrics/cost` + WS ticks | Hybrid (initial load + live) |
| **Activity Feed** | `agent:output`, `session:update`, `task:fired` WS events | Real-time (virtualized, last 100) |
| **Pending Approvals** | `approval:request` WS events | Real-time |
| **Error Log** | REST `/api/metrics/errors` + `agent:error` WS events | Hybrid |

---

## 7. Agent Manager

### Agent List View (`/agents`)

A table of all registered agent groups with live status indicators.

| Column | Source | Interactive |
|--------|--------|-------------|
| Status indicator | WS `agent:status` | — |
| Group folder | DB `registered_groups` | Click -> detail view |
| Channel | DB `registered_groups.channel` | — |
| Active session | WS `agent:status` | Click -> session explorer |
| Turns / Cost | WS `agent:status` | — |
| Last active | DB `sessions` | — |
| Actions | — | [Start] [Stop] [Configure] [Logs] |

### Agent Detail View (`/agents/:folder`)

The `folder` value (e.g., `sales-team`) is the canonical identifier for all
agent-scoped routes and API calls.

```
+-------------------------------------------------------------+
|  <- Back to Agents                                          |
|                                                             |
|  team-alpha                                    * Running    |
|  Channel: WhatsApp | Trigger: @Andy | Registered: Jan 15   |
|                                                             |
|  +------------------------------------------------------+   |
|  |  Tabs: [Overview] [Configuration] [Sessions] [Logs]  |   |
|  +------------------------------------------------------+   |
|                                                             |
|  OVERVIEW TAB:                                              |
|  +---------------+  +---------------+  +---------------+   |
|  | Sessions: 142 |  | Cost: $34.20  |  | Errors: 3     |   |
|  | (30 days)     |  | (30 days)     |  | (30 days)     |   |
|  +---------------+  +---------------+  +---------------+   |
|                                                             |
|  ACTIVE SESSION                                             |
|  +------------------------------------------------------+   |
|  |  Turn 12 | $0.34 | 4m elapsed                        |   |
|  |  Current: Executing Bash "npm test"                   |   |
|  |  [View Live] [Stop] [Interrupt]                       |   |
|  +------------------------------------------------------+   |
|                                                             |
|  CONFIGURATION TAB:                                         |
|  +------------------------------------------------------+   |
|  |  Model:        [claude-sonnet-4-6    v]              |   |
|  |  Max turns:    [50                    ]              |   |
|  |  Max budget:   [$2.00                 ]              |   |
|  |  Trigger:      [@Andy                 ]              |   |
|  |  Timeout:      [30 minutes            ]              |   |
|  |  System prompt: [Edit in Monaco ^]                   |   |
|  |  Allowed tools: [x Read  x Write  x Edit  x Bash ...]|   |
|  |  MCP servers:   [agent v] [playwright v]             |   |
|  |  Extra mounts:  [/home/user/projects (ro)]           |   |
|  |                                                       |   |
|  |  [Save Configuration]  [Reset to Defaults]           |   |
|  +------------------------------------------------------+   |
+-------------------------------------------------------------+
```

### Agent Actions

| Action | Method | Effect |
|--------|--------|--------|
| **Start** | POST `/api/agents/:folder/start` | Enqueue a heartbeat message to wake the agent |
| **Stop** | POST `/api/agents/:folder/stop` | Graceful shutdown. In-process mode: waits for current turn to complete, then stops dispatching new turns. Container mode: writes `_close` sentinel. |
| **Interrupt** | POST `/api/agents/:folder/interrupt` | Immediate. Aborts the current `query()` call via AbortController. Partial results from the interrupted turn are discarded. |
| **Configure** | PUT `/api/agents/:folder` | Update agent config (applied on next run) |
| **Delete** | DELETE `/api/agents/:folder` | Deregister group (confirmation dialog) |

**Stop vs. Interrupt**: Stop is graceful — the running turn finishes before the agent
halts. Interrupt is immediate — the current turn is aborted mid-execution. In the
Agent Detail view, [Stop] is always visible; [Interrupt] is visible only when the
agent status is `running`.

---

## 8. Session Explorer

Each agent has exactly one active session at a time (identified by its `folder`).
The Session Explorer shows the history of sessions for each agent folder: all
completed past sessions plus the current active session if one exists.

### Session List View (`/sessions`)

A searchable, filterable table of all sessions across all agents.

```
+-------------------------------------------------------------+
|  Sessions                                                   |
|  +------------------------------------------------------+   |
|  | Search: [________________________] | Status: [All v] |   |
|  | Agent:  [All v] | Date: [Last 7d v] | Sort: [Recent] |   |
|  +------------------------------------------------------+   |
|                                                             |
|  +------+----------+--------+------+-------+----------+    |
|  |Status| Session  | Agent  |Turns | Cost  | Duration |    |
|  +------+----------+--------+------+-------+----------+    |
|  |  *   | abc-123  | main   |  24  | $0.82 | 12m 34s  |    |
|  |  v   | def-456  | alpha  |  18  | $0.41 |  8m 12s  |    |
|  |  x   | ghi-789  | research|  50  | $1.20 | 25m 01s  |    |
|  |  v   | jkl-012  | support|   6  | $0.09 |  2m 45s  |    |
|  +------+----------+--------+------+-------+----------+    |
|                                                             |
|  <- 1 2 3 ... 24 ->                                         |
+-------------------------------------------------------------+
```

### Session Detail (`/sessions/:id`)

Opens the full conversation transcript with tool call details.

```
+-------------------------------------------------------------+
|  Session abc-123                                * Running   |
|  Agent: main | Started: 14:20 | Turns: 24 | Cost: $0.82    |
|                                                             |
|  +------------------------------------------------------+   |
|  |  Tabs: [Transcript] [Tool Calls] [Metrics] [Raw]     |   |
|  +------------------------------------------------------+   |
|                                                             |
|  TRANSCRIPT TAB:                                            |
|  +------------------------------------------------------+   |
|  |  +---------------------------------------------+    |   |
|  |  | USER  14:20                                  |    |   |
|  |  | Refactor the auth module to use JWT tokens   |    |   |
|  |  +---------------------------------------------+    |   |
|  |                                                      |   |
|  |  +---------------------------------------------+    |   |
|  |  | ASSISTANT  14:20                             |    |   |
|  |  | I'll analyze the current auth module and     |    |   |
|  |  | refactor it to use JWT tokens.               |    |   |
|  |  |                                              |    |   |
|  |  |  +---------------------------------------+   |    |   |
|  |  |  | TOOL  Read  src/auth/index.ts         |   |    |   |
|  |  |  |   > 142 lines read                    |   |    |   |
|  |  |  +---------------------------------------+   |    |   |
|  |  |                                              |    |   |
|  |  |  +---------------------------------------+   |    |   |
|  |  |  | TOOL  Edit  src/auth/index.ts         |   |    |   |
|  |  |  |   > +24 / -8 lines (click to expand)  |   |    |   |
|  |  |  +---------------------------------------+   |    |   |
|  |  |                                              |    |   |
|  |  |  +---------------------------------------+   |    |   |
|  |  |  | TOOL  Bash  npm test                  |   |    |   |
|  |  |  |   > Exit 0 -- 12 tests passed (expand)|   |    |   |
|  |  |  +---------------------------------------+   |    |   |
|  |  |                                              |    |   |
|  |  | All tests pass. The auth module now uses JWT |    |   |
|  |  +---------------------------------------------+    |   |
|  +------------------------------------------------------+   |
|                                                             |
|  [Export Transcript]                                        |
+-------------------------------------------------------------+
```

### Transcript Entry Types

The backend decomposes SDK message types for display:

| Entry type | Source |
|------------|--------|
| `user` | Maps directly from SDK `SDKHumanMessage` |
| `assistant` | Text content extracted from `SDKAssistantMessage` |
| `tool_call` | Decomposed from `SDKAssistantMessage` tool_use content blocks |
| `tool_result` | Decomposed from `SDKAssistantMessage` tool_result content blocks |
| `system` | Maps directly from SDK `SDKSystemMessage` |
| `result` | Maps directly from SDK `SDKResultMessage` |

### Session Actions

| Action | API | Description |
|--------|-----|-------------|
| **Export** | GET `/api/sessions/:id/export` | Download as Markdown or JSONL |
| **Delete** | DELETE `/api/sessions/:id` | Remove transcript (confirmation required) |

---

## 9. Conversation View

For live, interactive conversations with agents (distinct from the read-only session
transcript). Accessed from the Agent Detail view via [View Live].

```
+-------------------------------------------------------------+
|  Chat: team-alpha                              * Connected  |
|  Queue mode: collect                                        |
+-------------------------------------------------------------+
|                                                             |
|  +-----------------------------------------------------+    |
|  |                   Message Thread                     |    |
|  |   (scrollable, virtualized, auto-scroll on new msg) |    |
|  |                                                     |    |
|  |   Messages render as chat bubbles with:             |    |
|  |   - Markdown rendering for text                     |    |
|  |   - Collapsible tool call cards                     |    |
|  |   - Inline code diffs for Edit operations           |    |
|  |   - Syntax-highlighted code blocks                  |    |
|  |   - Image previews for screenshots                  |    |
|  |                                                     |    |
|  |   Live indicator: "Processing..." when agent runs   |    |
|  |   or "Running: Bash npm test"                       |    |
|  |                                                     |    |
|  +-----------------------------------------------------+    |
|                                                             |
|  +---------------------------------------------+-------+    |
|  | Type a message...                           | Send  |    |
|  +---------------------------------------------+-------+    |
|  [Attach file] [Interrupt] [Clear context]                  |
+-------------------------------------------------------------+
```

### Agent Output Display

Agent output arrives via `agent:output` WebSocket events as complete messages (not
token-by-token deltas). The frontend may animate display with a typewriter effect,
but it is rendering a full `content` string per event, not incremental tokens. A
"Processing..." indicator is shown while `agent:status` reports `running`.

### Queue Mode Display

| Mode | UI Indicator | Send Button |
|------|-------------|-------------|
| `collect` | "Collecting messages — yours will be included in the next response" | Enabled; message is queued |
| `followup` | "Queued as next turn" | Enabled; message enters queue |
| `interrupt` | "Agent interrupted — processing your message" | Enabled; aborts current turn |

In `collect` mode the send button remains enabled but the message is held until the
current turn completes. The queue mode badge is always visible in the conversation
header.

---

## 10. Task Scheduler

### Task List View (`/tasks`)

```
+-------------------------------------------------------------+
|  Scheduled Tasks                              [+ New Task]  |
|                                                             |
|  +------+----------------+--------+----------+----------+   |
|  |Status| Task           | Agent  | Schedule | Next Run |   |
|  +------+----------------+--------+----------+----------+   |
|  |  *   | Daily standup  | main   | 0 9 * * *| Tomorrow |   |
|  |      | report         |        | (9am)    | 09:00    |   |
|  |  *   | Monitor deploys| devops | */30 * * | In 12m   |   |
|  |      |                |        | (30min)  |          |   |
|  |  o   | Quarterly audit| main   | once     | Mar 31   |   |
|  |  ||  | Weekly digest  | alpha  | 0 17 * *5| (Paused) |   |
|  +------+----------------+--------+----------+----------+   |
|                                                             |
|  [Pause Selected] [Resume Selected] [Delete Selected]       |
+-------------------------------------------------------------+
```

### Task Editor Dialog

```
+----------------------------------------------------+
|  Create Scheduled Task                             |
|                                                    |
|  Prompt:                                           |
|  +--------------------------------------------+   |
|  | Generate a daily standup summary from the   |   |
|  | team's recent messages and post it to the   |   |
|  | channel.                                    |   |
|  +--------------------------------------------+   |
|                                                    |
|  Target Agent:  [main           v]                 |
|  Schedule Type: (*) Cron  ( ) Interval  ( ) Once  |
|  Cron:          [0 9 * * 1-5     ]                 |
|                 "At 09:00 on every day-of-week     |
|                  from Monday through Friday"       |
|  Context Mode:  (*) Group  ( ) Isolated            |
|  Timezone:      [America/New_York v]               |
|                                                    |
|  [Cancel]                         [Create Task]    |
+----------------------------------------------------+
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
+-------------------------------------------------------------+
|  Integrations                                   [+ Add]     |
|                                                             |
|  MESSAGING CHANNELS                                         |
|  +------------------------------------------------------+   |
|  |  WhatsApp    * Connected   | 4 groups | [Configure]  |   |
|  |  Telegram    o Disconnected| --       | [Connect]    |   |
|  |  Slack       * Connected   | 2 groups | [Configure]  |   |
|  +------------------------------------------------------+   |
|                                                             |
|  WEBHOOKS                                                   |
|  +------------------------------------------------------+   |
|  |  GitHub     POST /webhook/github    | 47 events/24h |   |
|  |  Stripe     POST /webhook/stripe    |  3 events/24h |   |
|  |  [+ Add Webhook Endpoint]                            |   |
|  +------------------------------------------------------+   |
|                                                             |
|  MCP SERVERS                                                |
|  +------------------------------------------------------+   |
|  |  agent       * Connected   | 6 tools | In-process   |   |
|  |  playwright  * Connected   | 12 tools| Subprocess   |   |
|  |  database    o Pending     | --      | HTTP         |   |
|  |  [+ Add MCP Server]                                  |   |
|  +------------------------------------------------------+   |
|                                                             |
|  API KEYS                                                   |
|  +------------------------------------------------------+   |
|  |  Anthropic   ********hx4Q  | Valid | [Rotate]      |   |
|  |  OpenAI      Not configured |       | [Add]         |   |
|  +------------------------------------------------------+   |
+-------------------------------------------------------------+
```

### Channel Configuration Dialog

| Field | Type | Description |
|-------|------|-------------|
| Channel type | Select | WhatsApp, Telegram, Slack |
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
+-------------------------------------------------------------+
|  Memory Editor                                              |
|                                                             |
|  +--------------+  +----------------------------------+     |
|  | FILE TREE    |  | EDITOR (Monaco)                  |     |
|  |              |  |                                  |     |
|  | v global/    |  | # Global Agent Memory            |     |
|  |   CLAUDE.md <|  |                                  |     |
|  |              |  | ## Identity                      |     |
|  | v main/      |  | You are Andy, a helpful assistant|     |
|  |   CLAUDE.md  |  |                                  |     |
|  |   notes.md   |  | ## User Preferences              |     |
|  |              |  | - Prefer concise responses       |     |
|  | v team-alpha/|  | - Use bullet points for lists    |     |
|  |   CLAUDE.md  |  |                                  |     |
|  |   research/  |  | ## Known Facts                   |     |
|  |     report.md|  | - Production server: 10.0.1.5    |     |
|  |              |  | - Deploy branch: main             |     |
|  | v research/  |  |                                  |     |
|  |   CLAUDE.md  |  |                                  |     |
|  +--------------+  |                                  |     |
|                    | [Ln 1, Col 1] [Markdown] [UTF-8] |     |
|                    +----------------------------------+     |
|                                                             |
|  Last saved: 14:31:05  [Save] [Revert to last save]        |
|                                                             |
|  ! Non-admin agents cannot modify global/CLAUDE.md         |
+-------------------------------------------------------------+
```

### Features

- **Monaco Editor** with Markdown syntax highlighting and preview
- **File tree** showing the full `groups/` hierarchy
- **Diff view** comparing current content with the last saved version
- **Conflict detection**: On save, the request includes an `If-Match: <etag>` header.
  If the file was modified since it was loaded, the backend returns
  `412 Precondition Failed`. The UI shows a diff dialog so the operator can merge
  or overwrite.
- **Access control** badge showing which agents can read/write each file
- **Live preview** of how the markdown will render in agent context

---

## 13. Tool Registry

### Tool Inventory (`/tools`)

```
+-------------------------------------------------------------+
|  Tool Registry                                              |
|                                                             |
|  Tabs: [Built-in] [MCP Tools] [Usage Stats]                |
|                                                             |
|  BUILT-IN TOOLS:                                            |
|  +----------+----------+-----------+--------------------+   |
|  | Tool     | Risk     | Sandboxed | Usage (24h)        |   |
|  +----------+----------+-----------+--------------------+   |
|  | Read     | Low      | N/A       | ########..  847    |   |
|  | Edit     | Medium   | N/A       | #####.....  412    |   |
|  | Bash     | High     | * Yes     | ####......  356    |   |
|  | Write    | Medium   | N/A       | ###.......  201    |   |
|  | Glob     | Low      | N/A       | ######....  623    |   |
|  | Grep     | Low      | N/A       | #####.....  489    |   |
|  | WebSearch| Low      | N/A       | ##........  134    |   |
|  | WebFetch | Low      | N/A       | #.........   78    |   |
|  | Task     | Medium   | N/A       | #.........   67    |   |
|  | TodoWrite| Low      | N/A       | #.........   45    |   |
|  +----------+----------+-----------+--------------------+   |
|                                                             |
|  AGENT MCP TOOLS (click to expand input/output schema):    |
|  +------------------+----------+------------------------+   |
|  | send_message     | agent    | ##........  89         |   |
|  | schedule_task    | agent    | #.........  12         |   |
|  | list_tasks       | agent    | #.........   8         |   |
|  | pause_task       | agent    | ..........   3         |   |
|  | resume_task      | agent    | ..........   2         |   |
|  | cancel_task      | agent    | ..........   1         |   |
|  +------------------+----------+------------------------+   |
|                                                             |
|  EXTERNAL MCP TOOLS (e.g., Playwright):                    |
|  +------------------+----------+------------------------+   |
|  | browser_click    |playwright| ###.......  234        |   |
|  | browser_navigate |playwright| ##........  156        |   |
|  | browser_type     |playwright| ##........  142        |   |
|  +------------------+----------+------------------------+   |
+-------------------------------------------------------------+
```

---

## 14. Security & Permissions Console

### Permission Rules (`/security`)

```
+-------------------------------------------------------------+
|  Security Console                                           |
|                                                             |
|  Tabs: [Permissions] [Mount Allowlist] [Audit Log]          |
|                                                             |
|  PERMISSION RULES:                                          |
|  +------------+--------------+------------+--------------+  |
|  | Agent      | Tool         | Rule       | Behavior     |  |
|  +------------+--------------+------------+--------------+  |
|  | * (all)    | Read         | *          | v Allow      |  |
|  | * (all)    | Bash         | rm -rf *   | x Deny       |  |
|  | research   | Write        | *.md       | v Allow      |  |
|  | research   | Write        | *          | ? Ask        |  |
|  | main       | *            | *          | v Allow      |  |
|  +------------+--------------+------------+--------------+  |
|  [+ Add Rule]                                               |
|                                                             |
|  MOUNT ALLOWLIST:                                           |
|  +----------------------------+---------+--------------+    |
|  | Path                       | Access  | Description  |    |
|  +----------------------------+---------+--------------+    |
|  | ~/projects                 | rw      | Dev projects |    |
|  | ~/documents                | ro      | Reference    |    |
|  +----------------------------+---------+--------------+    |
|  [+ Add Path]                                               |
|  ! Stored at ~/.config/nanoclaw/mount-allowlist.json        |
|    (outside project root -- tamper-proof from agents)       |
|                                                             |
|  AUDIT LOG:                                                 |
|  +------------------------------------------------------+   |
|  | 14:32 main     | Edit  | src/auth.ts    | Allowed   |   |
|  | 14:31 research | Bash  | curl https://..| Denied    |   |
|  | 14:30 main     | Write | /etc/hosts     | Denied    |   |
|  | 14:28 alpha    | Bash  | npm test       | Allowed   |   |
|  +------------------------------------------------------+   |
|  [Export] [Filter by agent] [Filter by decision]            |
+-------------------------------------------------------------+
```

---

## 15. Observability & Analytics

### Analytics Dashboard (`/analytics`)

```
+-------------------------------------------------------------+
|  Analytics                          Period: [Last 30d v]    |
|                                                             |
|  COST BREAKDOWN                                             |
|  +------------------------------------------------------+   |
|  |  Total: $142.30                                       |   |
|  |  +-----------------------------------------------+   |   |
|  |  |  ####################  main       $62.10      |   |   |
|  |  |  ##########            team-alpha $34.50      |   |   |
|  |  |  ########              research   $28.20      |   |   |
|  |  |  ####                  support    $17.50      |   |   |
|  |  +-----------------------------------------------+   |   |
|  +------------------------------------------------------+   |
|                                                             |
|  TOKEN USAGE OVER TIME          MODEL DISTRIBUTION          |
|  +--------------------+        +--------------------+       |
|  |  Input --- Output  |        |  +--------------+  |       |
|  |      /\            |        |  | Sonnet  62%  |  |       |
|  |  /--/  \--\        |        |  | Haiku   28%  |  |       |
|  | /         \--      |        |  | Opus    10%  |  |       |
|  |/              \--  |        |  +--------------+  |       |
|  +--------------------+        +--------------------+       |
|                                                             |
|  PERFORMANCE                    ERROR ANALYSIS              |
|  +--------------------+        +--------------------+       |
|  | Avg turns: 18.4    |        | max_turns:     12  |       |
|  | Avg cost:  $0.34   |        | max_budget:     3  |       |
|  | Avg duration: 6m12s|        | execution:      8  |       |
|  | Success rate: 94.2%|        | timeout:        2  |       |
|  +--------------------+        | Total:         25  |       |
|                                +--------------------+       |
|                                                             |
|  TOP TOOLS (by call count)                                  |
|  +------------------------------------------------------+   |
|  | Read ####################################  4,230     |   |
|  | Grep ##########################           2,891     |   |
|  | Edit ##################                   2,012     |   |
|  | Bash #################                    1,847     |   |
|  | Glob ################                     1,623     |   |
|  +------------------------------------------------------+   |
+-------------------------------------------------------------+
```

### Exportable Reports

- CSV/JSON export of all metrics for a given period
- Per-agent breakdown of cost, tokens, sessions, errors
- Trend lines for week-over-week comparison

---

## 16. Human-in-the-Loop Approval Queue

The most time-critical view. When a high-risk tool call requires approval, it appears
here and as a browser Notification (active tab only, using the browser Notification
API).

### Approval Queue (`/approvals`)

```
+-------------------------------------------------------------+
|  Pending Approvals (2)                        [Auto-deny v] |
|                                                             |
|  +------------------------------------------------------+   |
|  |  ! HIGH RISK                         Requested 2m ago|   |
|  |                                                       |   |
|  |  Agent: research | Session: abc-123                   |   |
|  |  Tool:  Bash                                          |   |
|  |                                                       |   |
|  |  Command:                                             |   |
|  |  +-------------------------------------------+       |   |
|  |  | curl -X POST https://api.external.com/deploy|      |   |
|  |  |   -H "Authorization: Bearer $TOKEN"        |      |   |
|  |  |   -d '{"version": "2.1.0"}'               |      |   |
|  |  +-------------------------------------------+       |   |
|  |                                                       |   |
|  |  Context: Agent is deploying v2.1.0 as part of the   |   |
|  |  release workflow requested by @admin in the main     |   |
|  |  channel.                                             |   |
|  |                                                       |   |
|  |  [v Approve]  [x Deny]  [View Session]  T 4:58 left  |   |
|  +------------------------------------------------------+   |
|                                                             |
|  +------------------------------------------------------+   |
|  |  ! MEDIUM RISK                       Requested 8m ago|   |
|  |                                                       |   |
|  |  Agent: main | Session: def-456                       |   |
|  |  Tool:  Write                                         |   |
|  |  File:  /workspace/project/.env.production            |   |
|  |                                                       |   |
|  |  [v Approve]  [x Deny]  [View Session]  T 1:52 left  |   |
|  +------------------------------------------------------+   |
|                                                             |
|  RESOLVED (today):                                          |
|  +------------------------------------------------------+   |
|  | 14:20 | Approved | main     | Bash: git push         |   |
|  | 13:45 | Denied   | research | Write: /etc/crontab    |   |
|  | 11:30 | Expired  | alpha    | Bash: docker rm -f     |   |
|  +------------------------------------------------------+   |
+-------------------------------------------------------------+
```

### Approval Flow

```
Agent requests tool call
         |
         v
PreToolUse hook evaluates risk
         |
    +----+----+
    | Low     | High/Critical
    |         |
    v         v
Auto-allow   Create ApprovalRequest
             |
             +---> WS: approval:request -> Browser
             |
             v
         Wait (with timeout)
             |
    +--------+--------+
    |        |        |
    v        v        v
 Approve   Deny    Timeout
    |        |        |
    v        v        v
 Execute  Block    Expired (card
 tool     tool     moves to resolved
                   list with "Expired"
                   status; auto-deny
                   if configured)
```

### Concurrent Approval Handling

If two operators both attempt to approve the same request, first-write-wins on the
backend. The second operator receives a `409 Conflict` response and the card
automatically refreshes to show the request was already handled.

### Optimistic Updates

Approval responses use optimistic UI: the card is immediately marked as resolved when
the operator clicks Approve/Deny, with rollback if the server rejects.

---

## 17. Settings & Configuration

### System Settings (`/settings`)

```
+-------------------------------------------------------------+
|  Settings                                                   |
|                                                             |
|  Tabs: [General] [Users] [Environment] [Danger Zone]        |
|                                                             |
|  GENERAL:                                                   |
|  +------------------------------------------------------+   |
|  |  Assistant name:      [Andy                ]         |   |
|  |  Default model:       [claude-sonnet-4-6   v]        |   |
|  |  Max concurrent:      [5                   ]         |   |
|  |  Default max turns:   [50                  ]         |   |
|  |  Default budget (USD):[2.00                ]         |   |
|  |  Container timeout:   [30 minutes          ]         |   |
|  |  Heartbeat interval:  [30 minutes          ]         |   |
|  |  Message poll interval:[2 seconds          ]         |   |
|  |  Queue mode:          [collect             v]        |   |
|  |  Timezone:            [America/New_York    v]        |   |
|  +------------------------------------------------------+   |
|                                                             |
|  USERS:                                                     |
|  +--------+---------------+----------+------------------+   |
|  | Name   | Email         | Role     | Actions          |   |
|  +--------+---------------+----------+------------------+   |
|  | Admin  | admin@co.com  | admin    | [Edit] [Remove]  |   |
|  | Dev 1  | dev1@co.com   | operator | [Edit] [Remove]  |   |
|  | Dev 2  | dev2@co.com   | viewer   | [Edit] [Remove]  |   |
|  +--------+---------------+----------+------------------+   |
|  [+ Invite User]                                            |
|                                                             |
|  ROLES:                                                     |
|  +----------+------------------------------------------+    |
|  | admin    | Full access -- all views, all actions     |    |
|  | operator | Can approve, configure agents, view all   |    |
|  | viewer   | Read-only -- dashboard, sessions, analytics|    |
|  +----------+------------------------------------------+    |
|                                                             |
|  DANGER ZONE:                                               |
|  +------------------------------------------------------+   |
|  |  [Purge All Sessions]  [Stop All Agents]             |   |
|  |  [Reset to Factory Defaults]                          |   |
|  |  (each requires typed confirmation)                   |   |
|  +------------------------------------------------------+   |
+-------------------------------------------------------------+
```

---

## 18. Data Model & API Contract

### REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| **Agents** | | |
| GET | `/api/agents` | List all agent groups |
| GET | `/api/agents/:folder` | Get agent detail + config |
| POST | `/api/agents` | Register new agent group |
| PUT | `/api/agents/:folder` | Update agent config |
| DELETE | `/api/agents/:folder` | Deregister agent |
| POST | `/api/agents/:folder/start` | Wake agent |
| POST | `/api/agents/:folder/stop` | Graceful stop (waits for current turn or writes sentinel) |
| POST | `/api/agents/:folder/interrupt` | Immediate abort via AbortController |
| **Sessions** | | |
| GET | `/api/sessions` | List sessions (paginated, summary only — no transcript) |
| GET | `/api/sessions/:id` | Get session detail with transcript |
| DELETE | `/api/sessions/:id` | Delete session |
| GET | `/api/sessions/:id/export` | Export transcript |
| **State** | | |
| GET | `/api/state/snapshot` | Full state snapshot for WS reconnect (agent statuses, active sessions, pending approvals, queue depths) |
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
| GET | `/api/memory/:path` | Read file content (returns ETag) |
| PUT | `/api/memory/:path` | Write file content (accepts If-Match header) |
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
| **Auth** | | |
| POST | `/api/auth/ws-ticket` | Issue one-time WS ticket (split-deployment only) |
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
  folder: string;              // Canonical identifier (group folder name)
  name: string;
  channel: string;
  chatJid: string;
  trigger: string;
  isMain: boolean;
  config: AgentConfig;
  status: AgentStatus;
  addedAt: string;
  // No sessionId field -- each agent has at most one active session,
  // identified by the folder itself.
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
  queueMode: "collect" | "followup" | "interrupt";
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
  errorSubtype?: "max_turns" | "max_budget" | "execution" | "user_cancelled";
  // transcript is omitted from list responses; included in GET /api/sessions/:id
  transcript?: TranscriptEntry[];
}

interface TranscriptEntry {
  uuid: string;
  // user/assistant/system/result map directly from SDK message types.
  // tool_call and tool_result are decomposed from SDKAssistantMessage
  // content blocks for display purposes.
  type: "user" | "assistant" | "system" | "result" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  timestamp: string;
}

interface ScheduledTask {
  id: string;
  prompt: string;
  folder: string;              // Target agent folder
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
  folder: string;              // Agent folder (canonical identifier)
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: "medium" | "medium-high" | "high" | "critical";
  status: "pending" | "approved" | "denied" | "expired";
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  timeoutMs: number;
}

interface StateSnapshot {
  agents: Record<string, AgentStatusEvent>;
  activeSessions: Record<string, string>;  // folder -> sessionId
  pendingApprovals: ApprovalRequest[];
  queueDepths: Record<string, number>;     // folder -> depth
}
```

---

## 19. State Management

### Zustand Store Slices

All store collections use `Record<string, T>` (plain objects) rather than `Map`.
This is required for Zustand's shallow equality check to detect mutations: a new
object reference must be produced on every update, which plain spread syntax
guarantees. `Map` mutations are not detected by shallow equality.

```typescript
// stores/index.ts

interface AppStore {
  // Connection
  wsStatus: "connecting" | "open" | "closed";

  // Agents -- keyed by folder
  agents: Record<string, Agent>;
  updateAgentStatus: (event: AgentStatusEvent) => void;

  // Sessions -- keyed by session id
  sessions: Record<string, Session>;

  // Approvals -- keyed by approval id
  approvals: Record<string, ApprovalRequest>;
  addApproval: (req: ApprovalRequest) => void;
  resolveApproval: (id: string, decision: "approved" | "denied") => void;

  // Metrics
  metrics: MetricsTickEvent;

  // Live output -- keyed by sessionId, capped at 500 entries per session
  liveOutputs: Record<string, AgentOutputEvent[]>;
  appendOutput: (event: AgentOutputEvent) => void;
  evictSession: (sessionId: string) => void;

  // Tasks -- keyed by task id
  tasks: Record<string, ScheduledTask>;

  // Replace entire store state from a snapshot (called after WS reconnect)
  applySnapshot: (snapshot: StateSnapshot) => void;
}
```

### Immutable Update Pattern

```typescript
// Example: updateAgentStatus
updateAgentStatus: (event) => set((state) => ({
  agents: {
    ...state.agents,
    [event.folder]: {
      ...state.agents[event.folder],
      status: event.status,
      turnCount: event.turnCount,
      costUsd: event.costUsd,
      currentTool: event.currentTool,
      startedAt: event.startedAt,
    },
  },
})),

// Example: appendOutput with 500-entry eviction
appendOutput: (event) => set((state) => {
  const existing = state.liveOutputs[event.sessionId] ?? [];
  const updated = [...existing, event].slice(-500);
  return {
    liveOutputs: {
      ...state.liveOutputs,
      [event.sessionId]: updated,
    },
  };
}),

// Example: evict a session that is no longer visible
evictSession: (sessionId) => set((state) => {
  const { [sessionId]: _, ...rest } = state.liveOutputs;
  return { liveOutputs: rest };
}),
```

### Data Flow

```
WS Event arrives
       |
       v
dispatchWSEvent() -- routes by message type
       |
       +-- agent:status    -> store.updateAgentStatus()
       +-- agent:output    -> store.appendOutput()
       +-- agent:error     -> store.appendError() + toast + browser Notification
       +-- approval:request-> store.addApproval() + toast + browser Notification
       +-- metrics:tick    -> store.metrics = payload
       +-- session:update  -> store.sessions spread update
       +-- approval:resolved-> store.resolveApproval()
```

### Reconnect Reconciliation

On WebSocket reconnect (`ws.onopen`), the hook fetches `GET /api/state/snapshot`
and calls `store.applySnapshot(snapshot)`. This replaces the agents, activeSessions,
pendingApprovals, and queueDepths slices atomically before live events resume,
preventing stale state from surviving a disconnect.

---

## 20. RBAC Enforcement

Three roles are supported: `admin`, `operator`, `viewer`.

### Server Components

Protected routes are guarded using `auth()` from NextAuth.js v5 before rendering.
If the session role is insufficient, the component redirects to `/403`.

```typescript
// app/agents/[folder]/page.tsx (Server Component)
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AgentDetailPage() {
  const session = await auth();
  if (!session || session.user.role === "viewer") redirect("/403");
  // ...render
}
```

### API Route Middleware

A middleware function checks the session role on every API route request. Mutating
operations (POST, PUT, DELETE) require `operator` or `admin`. Approval actions
require at minimum `operator`.

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const session = await auth();
  const isWrite = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
  if (isWrite && session?.user.role === "viewer") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return NextResponse.next();
}
```

### UI Conditional Rendering

Action buttons are conditionally rendered based on the session role. Viewers see no
destructive or mutating controls.

```typescript
// components/agent-actions.tsx
const { data: session } = useSession();
const canOperate = session?.user.role !== "viewer";

return (
  <>
    {/* Always visible */}
    <Button onClick={handleViewLive}>View Live</Button>

    {/* Operator and admin only */}
    {canOperate && <Button onClick={handleStop}>Stop</Button>}
    {canOperate && isRunning && <Button onClick={handleInterrupt}>Interrupt</Button>}
    {canOperate && <Button onClick={handleConfigure}>Configure</Button>}
  </>
);
```

| Role | Dashboard | View Sessions | Approve/Deny | Configure | Start/Stop/Interrupt | Delete |
|------|-----------|---------------|--------------|-----------|----------------------|--------|
| viewer | Read | Read | No | No | No | No |
| operator | Read | Read | Yes | Yes | Yes | No |
| admin | Read | Read | Yes | Yes | Yes | Yes |

---

## 21. Responsive & Accessibility

### Breakpoints

| Breakpoint | Layout | Priority Views |
|------------|--------|----------------|
| Desktop (>=1280px) | Full sidebar + content | All views |
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

## 22. Deployment

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
| **Split** | Next.js on Vercel/Cloudflare | Orchestrator on VPS/Docker | Scalable — frontend CDN-cached; use WS ticket auth |
| **Containerized** | Docker | Docker Compose | Self-hosted — both in same network |

---

*Document revised 2026-02-25. Companion to
[AUTONOMOUS_AGENT_DESIGN.md](./AUTONOMOUS_AGENT_DESIGN.md) and
[IMPLEMENTATION_GUIDE_CLAUDE_AGENT_SDK.md](./IMPLEMENTATION_GUIDE_CLAUDE_AGENT_SDK.md).*
