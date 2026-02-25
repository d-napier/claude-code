# Autonomous Agentic System — Architecture Design Document

> A general-purpose reference architecture for building autonomous AI agents that
> reason, act, and persist across sessions. Synthesized from OpenClaw's control-plane
> architecture, NanoClaw's container-isolated runtime, industry patterns (ReAct,
> supervisor, fan-out), and production best practices (2025-2026).

---

## Table of Contents

1. [Design Goals](#1-design-goals)
2. [Core Invariants](#2-core-invariants)
3. [High-Level Architecture](#3-high-level-architecture)
4. [The Agent Runtime Loop](#4-the-agent-runtime-loop)
5. [Control Plane (Gateway)](#5-control-plane-gateway)
6. [Input Model — What Creates "Autonomy"](#6-input-model--what-creates-autonomy)
7. [Session & State Management](#7-session--state-management)
8. [Hierarchical Memory Model](#8-hierarchical-memory-model)
9. [Concurrency & Queue Model](#9-concurrency--queue-model)
10. [Execution Models & Isolation](#10-execution-models--isolation)
11. [Multi-Agent Orchestration Patterns](#11-multi-agent-orchestration-patterns)
12. [Tool System Design](#12-tool-system-design)
13. [Code-Transform Skills](#13-code-transform-skills)
14. [Inter-Process Communication (IPC)](#14-inter-process-communication-ipc)
15. [Error Handling & Recovery](#15-error-handling--recovery)
16. [Security Model](#16-security-model)
17. [Observability](#17-observability)
18. [Pattern Selection Guide](#18-pattern-selection-guide)
19. [References](#19-references)

---

## 1. Design Goals

| Goal | Rationale |
|------|-----------|
| **Deterministic autonomy** | Autonomous behavior emerges from explicit event sources and a consistent loop — not from continuous reasoning or emergence. |
| **Session isolation** | Each conversation/task is an independent boundary. One session's failure never contaminates another. |
| **Single-writer correctness** | Only one agent run touches a given session at a time, eliminating interleaving bugs, duplicate sends, and contradictory actions. |
| **Least agency** | Agents are granted the minimum autonomy required for their task. Permissions are scoped, not blanket. |
| **Crash-safe persistence** | State survives restarts. Disk-based transcripts and checkpoints allow exact recovery. |
| **Composability** | Single-agent, multi-agent, and hybrid patterns share the same primitives (sessions, queues, tools, protocols). |
| **Small enough to understand** | Prefer a minimal-dependency architecture over sprawling config-driven systems. Code-driven customization over configuration sprawl. |

---

## 2. Core Invariants

These invariants must hold at all times. The system should fail loudly if any are violated.

1. **Single-writer per session** — At most one active run per session at any instant.
2. **Append-only transcripts** — Session history is never mutated, only appended.
3. **Between-turn preemption only** — A running agent turn is not interrupted. Preemption (abort/steer) happens between SDK invocations, not mid-turn.
4. **Idempotent side effects** — External mutations are protected by idempotency keys; safe to retry.
5. **Mandatory handshake** — Every client connection begins with an authenticated `connect` frame before any work is dispatched.
6. **Secrets via environment only** — Credentials are injected via environment variables at runtime and are never written to transcripts or agent filesystems. The host process `.env` file is not mounted into containers in container-isolated mode.

---

## 3. High-Level Architecture

```
+-------------------------------------------------------------+
|                        INPUT SOURCES                        |
|  User Messages | Webhooks | Timers/Cron | Heartbeats | Hooks |
+-------+-------------+----------+------------+----------+----+
        |             |          |            |          |
        v             v          v            v          v
+-------------------------------------------------------------+
|                    CONTROL PLANE (GATEWAY)                  |
|                                                             |
|  +-----------+  +-------------+  +---------------------+   |
|  |  Protocol  |  |  Session    |  |  Queue Manager      |   |
|  |  Layer     |  |  Router     |  |  (Lane-Aware FIFO)  |   |
|  | (WebSocket)|  |             |  |                     |   |
|  +-----+------+  +------+------+  +---------+-----------+   |
|        |                |                   |               |
|  +-----+----------------+-------------------+----------+    |
|  |              Concurrency Governor                   |    |
|  |   Per-Session Serialization + Global Throttle Cap   |    |
|  +------------------------------+----------------------+    |
+-----------------------------+-------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                  EXECUTION LAYER                            |
|                                                             |
|  In-Process (default)       Container-Isolated (hardened)  |
|  +--------------------+     +----------------------------+ |
|  |  SDK subprocess    |     |  Docker container (--rm)   | |
|  |  in orchestrator   |     |  explicit mounts           | |
|  |  process           |     |  unprivileged user         | |
|  +--------------------+     +----------------------------+ |
|                                                             |
|  Both models expose the same interface to the orchestrator: |
|  configure -> query()/createSession() -> consume stream     |
+-------------------------------------------------------------+
                              |
             +-----------+----+----+-----------+
             v           v        v           v
+-------------------------------------------------------------+
|                      STATE LAYER                            |
|                                                             |
|  Session Transcripts  |  Agent Workspace  |  IPC Channels  |
|  (JSONL)              |  (Files/Memory)   |  (File-based)  |
|  Session Metadata     |  Checkpoints      |  Dead-Letter   |
|  (JSON/SQLite)        |                   |  Store         |
+-------------------------------------------------------------+
```

### Component Responsibilities

| Component | Role |
|-----------|------|
| **Input Sources** | Normalize diverse triggers into a unified event format. |
| **Control Plane** | Single source of truth. Routes events, enforces invariants, manages sessions, governs concurrency. |
| **Execution Layer** | Runs the SDK as either an in-process subprocess or inside a Docker container. See §10 for tradeoffs. |
| **State Layer** | Durable, append-only storage. Transcripts, metadata, workspace files, IPC channels, and checkpoints. |

---

## 4. The Agent Runtime Loop

### The SDK as a Black Box

The `@anthropic-ai/claude-agent-sdk` wraps a Claude CLI subprocess with JSON-lines
over stdin/stdout. It implements the full ReAct loop (Reason → Act → Observe)
**internally** — the developer does not control tool execution, context injection, or
the step-by-step reasoning cycle. The SDK exposes two surfaces:

- **V1 — `query()`**: Single-turn or batch. Accepts a prompt, returns when the agent
  reaches a stopping condition or `maxTurns` is exhausted.
- **V2 — `createSession()` + `send()` / `stream()`** *(preview/unstable)*: Multi-turn.
  Creates a persistent session that can receive follow-up inputs without re-initializing
  context.

The developer configures the SDK (system prompt, tools, hooks, max turns), calls
`query()` or `createSession()`, and consumes the resulting message stream. That is the
extent of orchestrator control over the inner loop.

### What the Orchestrator Controls

The orchestrator owns the **message-dispatch loop** — the outer cycle that feeds work
into the SDK and processes its output:

```
orchestrator loop:

  1. Receive input event (user message, webhook, timer, hook)
  2. Acquire session lane (single-writer guarantee)
  3. Configure SDK: system prompt, tools, hooks, maxTurns
  4. Dispatch to SDK: query(prompt) or session.send(message)
  5. Consume output stream: persist assistant messages, tool results
  6. Persist transcript and session metadata
  7. Release session lane
  8. Return to step 1
```

The SDK handles everything inside step 4. The orchestrator handles everything outside it.

### Hooks

The SDK provides callback hooks that fire during the internal loop:

| Hook | When It Fires | Orchestrator Use |
|------|---------------|-----------------|
| `PreToolUse` | Before each tool call | Approve/deny, log, inject context |
| `PostToolUse` | After each tool call | Audit, persist observations |
| `Stop` | When the loop terminates | Persist final state, trigger follow-up |
| `PreCompact` | When context approaches limits | Archive transcript segments |

Hooks are the only mechanism for the orchestrator to observe or influence the internal
loop. They cannot inject mid-turn messages; they can only approve/deny the current action
or record state.

### Bounded Execution

- **`maxTurns`**: SDK-native option. Limits the number of internal reasoning turns.
  When reached, the SDK stops and returns a partial result.
- **Budget tracking**: `maxBudgetUsd` is application-layer logic. The orchestrator
  accumulates `cost_usd` values from the SDK's output stream and halts dispatch when
  the budget is exceeded. This is not a native SDK option.

### Context Window Management

When the agent's context approaches the model's context limit, the SDK fires the
`PreCompact` hook before compacting. The orchestrator should use this hook to archive
older transcript segments to the state layer. Archived segments are no longer in the
active context window but remain available for retrieval tools.

Keep `CLAUDE.md` files concise. Recommended maximums: global `CLAUDE.md` under 2000
tokens, per-group `CLAUDE.md` under 2000 tokens. Verbose instruction files consume
context budget that the agent needs for actual task work.

### Session Model

Each agent has **one active session per group folder**. The session is identified by
its group folder path. In V2 multi-turn mode, the session persists between turns —
the agent can be `idle` (no active SDK call) while the session remains `active`
(context preserved in SDK subprocess memory or resumed via `sessionId`).

---

## 5. Control Plane (Gateway)

The Gateway is the **central traffic controller** — the single source of truth for
session state and the arbiter of concurrency.

### Protocol

Communication uses a typed WebSocket protocol with three frame types:

| Frame | Direction | Purpose |
|-------|-----------|---------|
| `request`  | client → gateway | `{ type: "req", id, method, params }` |
| `response` | gateway → client | `{ type: "res", id, ok, payload \| error }` |
| `event`    | gateway → client | `{ type: "event", event, payload }` |

**Mandatory handshake**: The first frame must be a `connect` request with authentication
credentials. No work is dispatched before handshake completes.

**No event replay**: Events are fire-and-forget. Clients that miss events must explicitly
refresh. This simplicity preserves invariant integrity.

> **Note**: This is the *internal gateway protocol* between input sources and the
> control plane. The management console (see [FRONTEND_DESIGN.md](./FRONTEND_DESIGN.md))
> uses a separate, higher-level event protocol with typed domain events
> (`agent:status`, `approval:request`, etc.).

### Gateway Responsibilities

1. **Authenticate** incoming connections (pairing codes, tokens).
2. **Normalize** inputs from all sources into a unified event format.
3. **Route** events to the correct session.
4. **Enforce** single-writer per session via lane-aware queuing.
5. **Throttle** global concurrency to prevent resource exhaustion.
6. **Expose** session state to UI clients (clients never parse transcripts directly).

---

## 6. Input Model — What Creates "Autonomy"

A key architectural insight: **autonomy is not emergence — it is the union of multiple
explicit input sources feeding a consistent processing loop.**

```
"If it looks like the agent had an idea at 3 AM, a timer, schedule,
 webhook, or hook created an event — and the agent ran a standard turn."
```

### Input Types

| Input Type | Trigger | Example |
|------------|---------|---------|
| **User messages** | Human sends a message via any channel | Slack DM, web chat, CLI |
| **Heartbeats** | Periodic timer (default: 30 min) | Agent checks for pending work, responds `HEARTBEAT_OK` if idle |
| **Webhooks** | External system calls a URL | GitHub push event, payment notification |
| **Scheduled timers** | Cron expression fires | Daily report generation at 9 AM |
| **Hooks** | Internal event automation | Post-commit hook triggers code review agent |

All five input types are normalized into the same event format and processed by the
same orchestrator dispatch loop. The agent cannot distinguish between a user typing
a message and a webhook firing — both are just "turns."

### Heartbeat Pattern

Heartbeats are the mechanism that makes agents appear "always thinking." At a
configurable cadence (e.g., every 30 minutes), the system sends the agent a heartbeat
event. The agent evaluates its context and either:

- Responds `HEARTBEAT_OK` (nothing to do)
- Takes proactive action (e.g., checking on a long-running deployment)

This is not continuous reasoning. It is a polling loop with a large interval.

---

## 7. Session & State Management

### Canonical Status Types

These types are the source of truth across all companion documents.

```
AgentStatus   = "idle" | "running" | "queued" | "error" | "timeout"

SessionStatus = "active" | "completed" | "error" | "timeout"

SessionErrorSubtype = "max_turns" | "max_budget" | "execution" | "user_cancelled"

TaskStatus    = "active" | "paused" | "completed"
```

### AgentStatus vs. SessionStatus

An agent's status and its session's status are distinct:

- An agent is `running` only during an active SDK `query()` or `session.send()` call.
- An agent is `idle` when no SDK call is in flight. Its session may still be `active`
  (context preserved, resumable via session ID).
- A session is `active` from creation until it completes, times out, or errors — it
  spans multiple agent turns.

### Session as Isolation Boundary

A **session** is the fundamental unit of isolation. Each session has:

- A unique key (e.g., `agent:<agentId>:<sessionKey>`)
- An append-only transcript (JSONL)
- A metadata record
- An associated workspace (filesystem directory)

Each agent has at most one active session per group folder at a time.

### Session Key Patterns

| Scenario | Key Pattern |
|----------|-------------|
| Primary DM | `agent:<agentId>:main` |
| Group chat | `agent:<agentId>:slack:<channelId>` |
| Secure DM | `agent:<agentId>:dm:<channelId>:<peerId>` |
| Scheduled task | `agent:<agentId>:cron:<jobId>` |

### State Architecture

```
autonomous-agent/
├── src/                              # Orchestrator source code
│   ├── index.ts                      # Main entry point
│   ├── agent-runner.ts               # SDK wrapper
│   ├── group-queue.ts                # Concurrency manager
│   └── ...
├── groups/
│   ├── global/
│   │   └── CLAUDE.md                 # Global memory (admin-writable)
│   └── {name}/
│       ├── CLAUDE.md                 # Per-group memory
│       └── ...                       # Group workspace files
├── data/
│   ├── ipc/{groupFolder}/            # File-based IPC
│   │   ├── messages/
│   │   ├── tasks/
│   │   ├── input/
│   │   └── dead-letter/              # Failed messages awaiting review
│   ├── sessions/{groupFolder}/
│   │   └── .claude/                  # SDK session persistence
│   └── agent.db                      # SQLite (cursors, tasks, groups)
├── container/
│   ├── Dockerfile
│   └── agent-runner/                 # In-container agent runner
└── .claude/
    ├── settings.json
    └── CLAUDE.md                     # Project-level instructions
```

### State Persistence Model

| State Type | Storage | Durability | Access Pattern |
|------------|---------|------------|----------------|
| **Transcript** | JSONL files | Survives restart | Append-only, load on context |
| **Session metadata** | JSON index | Survives restart | Read/write by Gateway |
| **Workspace files** | Filesystem | Survives restart | Read/write by tools |
| **Checkpoints** | State snapshots | Survives restart | Resume from last checkpoint |
| **In-flight state** | SDK subprocess memory | Lost on crash (in-process mode) | Reconstructed from transcript or resumed via session ID |

### Checkpoint Pattern

For long-running or multi-step workflows, the system persists state snapshots at each
node boundary:

1. Agent completes a tool call → checkpoint persisted
2. System crashes → restart from last checkpoint
3. No repeated work, no lost context

This pattern (popularized by LangGraph) enables crash-safe resumption of complex
multi-step workflows.

---

## 8. Hierarchical Memory Model

Agents need persistent memory that survives across sessions and invocations. A
hierarchical model provides scoped memory at multiple levels.

### Memory Hierarchy

```
+---------------------------------------------+
|              Global Memory                  |
|  Shared preferences, facts, system context  |
|  Writable: admin/main channel only          |
|  Readable: all groups                       |
+---------------------------------------------+
|          Group/Context Memory               |
|  Per-group conversation history & context   |
|  Writable: owning group only                |
|  Readable: owning group only                |
+---------------------------------------------+
|           Session Memory                    |
|  Per-session transcript & working state     |
|  Writable: active session only              |
|  Readable: active session only              |
+---------------------------------------------+
```

### Implementation

| Level | Storage | Scope | Writability |
|-------|---------|-------|-------------|
| **Global** | `groups/global/CLAUDE.md` | All agents, all groups | Admin only |
| **Group** | `groups/{name}/CLAUDE.md` | Single group context | Owning group |
| **Session** | Session transcript (JSONL) | Single conversation | Active run |
| **Files** | `groups/{name}/*.md` | Group-scoped documents | Owning group |

### Key Properties

- **Automatic context loading**: The runtime loads both global and group-level memory
  files automatically when starting a run, providing the agent with persistent context
  without explicit retrieval.
- **Write isolation**: Non-admin groups cannot modify global memory, preventing
  accidental or malicious corruption of shared context.
- **File-based simplicity**: Memory is stored as markdown files on disk — human-readable,
  version-controllable, and trivially backed up.
- **Size discipline**: Keep CLAUDE.md files under 2000 tokens each. The SDK's
  `PreCompact` hook is the signal that context is under pressure; proactive compactness
  prevents reaching that point.

---

## 9. Concurrency & Queue Model

### Two-Stage Lane Architecture

Concurrency control uses a **two-stage lane-aware FIFO queue**:

```
             +------------------------------+
             |       Per-Session Lanes       |
             |                              |
Input -------> session:abc  --> [Run]       |
Input -------> session:def  --> [Wait]      |--> Global Lane --> Execute
Input -------> session:abc  --> [Queued]    |    (maxConcurrent)
             |                              |
             +------------------------------+
```

**Stage 1 — Per-session serialization**: Each session has its own FIFO lane. Only one
run per session is active. Additional inputs queue behind.

**Stage 2 — Global throttle**: All session lanes feed through a global lane with a
configurable `maxConcurrent` cap. This prevents resource exhaustion (API rate limits,
file I/O contention).

### API Rate Limit Considerations

The orchestrator's `maxConcurrent` cap should be set **below** the Anthropic API's
concurrent request limit for the account. The SDK handles HTTP 429 retries internally,
but the orchestrator should independently track cumulative token usage from `cost_usd`
fields in the output stream for budget enforcement. Do not rely on the SDK to stop
itself when a cost budget is reached.

### Queue Modes

When a new message arrives while a run is already active for that session, the system
applies one of these policies:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `collect` | Coalesce queued messages into one follow-up turn when the current run ends | Default — batches rapid-fire user messages |
| `followup` | Queue as the next turn to be dispatched after current run completes | Sequential processing, order-sensitive work |
| `interrupt` | Abort the active run via `AbortController`, then re-dispatch the new message | Emergency override; use sparingly |

`steer` and `steer-backlog` modes require injecting messages into a running SDK turn,
which the SDK does not support. Use `interrupt` when mid-run course correction is
required, or `followup` when ordering matters and the current turn should complete.

### Transport Safety

**Deduplication**: Short-lived cache keyed by `(channel, account, peer, session, messageId)`
prevents duplicate deliveries from triggering multiple runs.

**Debouncing**: Rapid consecutive text messages are batched into a single agent turn
via configurable `debounceMs`. Attachments and control commands bypass debouncing.

---

## 10. Execution Models & Isolation

The SDK can be run in two execution models. Choose based on your security and latency
requirements.

### Model A — In-Process (Default)

```
+--- Orchestrator Process ----------------------------+
|                                                     |
|  Orchestrator ----spawn----> SDK subprocess         |
|       |                      (JSON-lines stdio)     |
|       |<--- message stream -----------------------+ |
|       |                                           | |
|       +--- state layer (files, SQLite) -----------+ |
+-----------------------------------------------------+
```

The SDK runs as a subprocess within the orchestrator's process. All filesystem access
is governed by the SDK's built-in permission system and the orchestrator's configuration.

**Tradeoffs**:

| Property | In-Process |
|----------|------------|
| Latency | Low (no container startup) |
| Isolation | SDK subprocess boundary only |
| Security | Suitable for trusted, single-tenant deployments |
| Complexity | Lower |
| State | SDK subprocess memory persists during a turn |

### Model B — Container-Isolated (Hardened)

```
+--- Orchestrator Process ---------------------------+
|                                                    |
|  Orchestrator ----docker run --rm----> Container   |
|       |                  +------------------+      |
|       | (stdio)          |  SDK subprocess  |      |
|       |<-----------------|                  |      |
|       |                  | /workspace (rw)  |      |
|       |                  | /project   (ro)  |      |
|       |                  | /global    (ro)  |      |
|       |                  |                  |      |
|       |                  | uid: node (1000) |      |
|       |                  +------------------+      |
+----------------------------------------------------+
```

The SDK runs inside an ephemeral Docker container (`--rm`) with explicit filesystem
mounts. Each `query()` call uses one container; the container exits when the call
completes. There is no long-lived container kept running between calls.

**Tradeoffs**:

| Property | Container-Isolated |
|----------|--------------------|
| Latency | Higher (container startup per call) |
| Isolation | OS-level process and filesystem boundary |
| Security | Defense-in-depth; suitable for multi-tenant or untrusted workloads |
| Complexity | Higher (Dockerfile, mount management, allowlist) |
| State | No in-memory state between calls; all state via mounts |

### Mount Strategy (Container Mode)

| Mount | Path in Container | Access | Purpose |
|-------|-------------------|--------|---------|
| Group folder | `/workspace/group` | Read-Write | Agent's working directory and memory |
| Project root | `/workspace/project` | Read-Only | Source code access without mutation |
| Global memory | `/workspace/global` | Read-Only | Shared context across all groups |
| Sessions | `/home/node/.claude/` | Read-Write | SDK session persistence |
| Extra mounts | `/workspace/extra/*` | Configurable | User-specified additional directories |

### Mount Security (Container Mode)

An **external allowlist** (`~/.config/nanoclaw/mount-allowlist.json`) stored outside
the project root controls which additional host paths can be mounted. This file is
never mounted into containers, preventing agents from modifying their own access rules.

**Default blocked patterns**: SSH keys (`.ssh/`), cloud credentials (`.aws/`, `.azure/`,
`.gcloud/`), Kubernetes config (`.kube/`), package manager credentials (`.npmrc`,
`.pypirc`), Docker config, GPG keys, netrc, and similar secrets.

**Validation pipeline**:
1. Resolve symlinks via `realpathSync()` — prevents symlink-based escapes
2. Check against blocked patterns — reject sensitive paths
3. Verify allowed root directories — path must fall under approved roots
4. Sanitize container paths — reject `..` traversal and absolute paths
5. Enforce read-only for non-admin groups

### Choosing a Model

```
Start
  |
  +-- Is this a multi-tenant or untrusted-input deployment?
  |   YES --> Container-Isolated (mandatory)
  |   NO  --+
  |         |
  |   +-- Does the agent have shell/file access to sensitive paths?
  |   |   YES --> Container-Isolated (recommended)
  |   |   NO  --> In-Process (sufficient)
```

---

## 11. Multi-Agent Orchestration Patterns

When a single agent is insufficient, these patterns compose multiple agents. All
patterns build on the same session, queue, and tool primitives.

### Pattern 1: Single Agent (Default)

A single agent handles the full task end-to-end using its tool set. This is the correct
starting point. A single ReAct agent with good tools handles a surprising range of tasks.

**When to use**: Tasks within a single domain, bounded scope, or where full transparency
of reasoning is more important than parallelism.

### Pattern 2: Supervisor

```
                    +--------------+
                    |  Supervisor  |
                    |  Agent       |
                    +---------+----+
                              | delegates
             +-----------+----+----+-----------+
             v           v        v           v
       +----------+ +----------+ +----------+
       | Research  | | Coding   | | Review   |
       | Agent     | | Agent    | | Agent    |
       +----------+ +----------+ +----------+
```

A central supervisor receives the user request, decomposes it into subtasks, dispatches
each to a specialized agent via `query()`, monitors progress, validates outputs, and
synthesizes a final response. Each subagent is a separate SDK invocation.

**When to use**: Complex multi-domain workflows where reasoning transparency and quality
assurance matter more than latency.

### Pattern 3: Fan-Out / Parallel

```
                    +--------------+
                    | Orchestrator |
                    +-------+------+
                            | dispatches (parallel query() calls)
             +-----------+--+--+-----------+
             v           v     v           v
       +----------+ +----------+ +----------+
       | Worker A | | Worker B | | Worker C |
       +-----+----+ +-----+----+ +-----+----+
             |            |            |
             +------------+------------+
                          v
                    +--------------+
                    |  Aggregator  |
                    +--------------+
```

Independent tasks execute in parallel via concurrent `query()` calls. An aggregator
collects and synthesizes results. Each worker is a separate SDK invocation.

**When to use**: Tasks with no inter-dependencies that benefit from parallel execution
(e.g., searching multiple sources, running tests across codebases).

### Pattern Limitations

Patterns requiring **direct inter-agent communication** (streaming state to a peer,
mid-run handoff, generator-critic loops with shared context) are not supported natively
by the SDK. Agents can coordinate only by reading and writing to the shared state layer
between turns. Design patterns accordingly.

---

## 12. Tool System Design

### Design Principles

1. **Strict schemas**: Every tool has typed input/output schemas (e.g., TypeBox, JSON Schema, Zod). The runtime validates parameters before execution.
2. **Least privilege**: Tools are granted minimum necessary permissions. A search tool cannot write files; a file tool cannot execute shell commands.
3. **Idempotency**: Side-effecting tools accept idempotency keys. Safe to retry without duplicate mutations.
4. **Audit trail**: Every tool invocation is logged with inputs, outputs, duration, and caller identity.
5. **Rate limits**: Tools enforce per-agent and global rate limits to prevent abuse.
6. **Authorization-scoped**: Tool access varies by group identity — admin groups get broader access than regular groups.

### Tool Categories

| Category | Examples | Risk Level |
|----------|----------|------------|
| **Read-only** | Search, file read, API query | Low |
| **Workspace-scoped** | File write (within workspace), note-taking | Medium |
| **IPC** | Send message, schedule task, manage tasks | Medium (authorization-scoped) |
| **Browser** | Web navigation, form filling | Medium-High |
| **System** | Shell execution, process management | High (safer inside containers) |
| **External** | API calls, message sending, deployments | High |
| **Destructive** | `rm -rf`, force push, production deploys, data deletion | Critical (always requires approval) |

### MCP Server Pattern

Tools are exposed via **Model Context Protocol (MCP) servers** running alongside the
agent. This decouples tool definitions from the agent runtime:

```
Agent Runtime
  |
  +-- stdio MCP Server (in-process or subprocess)
  |   +-- send_message     -- Send to user/group
  |   +-- schedule_task    -- Create cron/interval/one-time tasks
  |   +-- list_tasks       -- View scheduled tasks
  |   +-- pause_task       -- Pause execution
  |   +-- resume_task      -- Resume execution
  |   +-- cancel_task      -- Delete task
  |
  +-- SDK Built-in Tools
      +-- Bash (sandboxed in container mode)
      +-- File ops (Read, Write, Edit, Glob, Grep)
      +-- Web (WebSearch, WebFetch)
      +-- Task (subagent spawner)
      +-- TodoWrite (progress tracking)
      +-- Browser (Chromium automation)
```

The MCP server reads identity from environment variables (group folder, chat ID, admin
flag) and enforces authorization per-call. Subagents inherit MCP tool access via stdio
transport.

### Human-in-the-Loop Gates

The `PreToolUse` hook is the integration point for HITL gates. Tools at or above a
configurable risk threshold require human approval before execution. `critical`-level
operations always require approval regardless of configuration.

```
PreToolUse hook fires:
  if toolCall.riskLevel >= approvalThreshold or toolCall.riskLevel == "critical":
      wait for human approval
      if denied: return { deny: true, reason: "..." }
  return { allow: true }
```

State must be checkpointed before approval gates to survive arbitrarily long wait times.

---

## 13. Code-Transform Skills

Code-transform skills (the NanoClaw pattern) allow agent capabilities to be extended
via source-code transformations applied at install time. Each skill modifies the
installation to add exactly the features it provides, with three-way merge conflict
resolution and mandatory test verification.

This architecture supports code-transform skills as a tool-type but does not prescribe
their implementation. See the NanoClaw documentation for the full specification.

---

## 14. Inter-Process Communication (IPC)

Agents need to communicate with the host orchestrator. File-based IPC provides a
simple, auditable mechanism that works with both execution models.

### File-Based IPC Protocol

```
data/ipc/{groupFolder}/
+-- messages/          # Agent -> Host: send messages to users
|   +-- {timestamp}-{random}.json
+-- tasks/             # Agent -> Host: schedule/manage tasks
|   +-- {timestamp}-{random}.json
+-- input/             # Host -> Agent: follow-up messages
|   +-- {timestamp}-{random}.json
|   +-- _close         # Sentinel: signal graceful shutdown
+-- dead-letter/       # Failed messages awaiting operator review
    +-- {source}-{filename}.json
```

The `{random}` suffix prevents filename collisions when multiple messages arrive within
the same millisecond.

### Authorization Model

IPC authorization is **identity-based** — the source group's filesystem namespace
implicitly identifies the caller:

| Operation | Admin Group | Regular Group |
|-----------|-------------|---------------|
| Send messages | Any chat | Own chat only |
| Schedule tasks | Any group | Own group only |
| Manage tasks | All tasks | Own tasks only |
| Register groups | Yes | No |

### Graceful Shutdown via Sentinel

A special `_close` sentinel file signals the agent to wind down:

1. Container/process enters idle state (no pending work)
2. After idle timeout, host writes `_close` to `input/`
3. Agent-runner detects sentinel and ends its read loop
4. SDK completes gracefully, process/container exits

This is safer than SIGTERM because it allows the agent to complete any final tool
calls and persist state before exit.

### Atomic File Writes

All IPC files use temp-file-then-rename for crash safety:

```
write(data) -> {path}.tmp -> rename -> {path}.json
```

This prevents the reader from consuming partially-written files.

---

## 15. Error Handling & Recovery

### Error Classification

| Error Type | Strategy | Example |
|------------|----------|---------|
| **Transient** | Retry with exponential backoff | Network timeout, rate limit |
| **Tool failure** | Log, surface to agent, let it adapt | API returns 500 |
| **LLM refusal** | Rephrase, reduce scope, escalate | Content policy violation |
| **State corruption** | Halt, alert, recover from checkpoint | Transcript parse error |
| **Unrecoverable** | Halt, persist state, notify user | Auth revoked, quota exhausted |
| **Timeout** | Distinguish idle vs. stuck; cleanup accordingly | Hard timeout reached |

### Recovery Patterns

**Checkpoint-based recovery**: After a crash, the runtime loads the last checkpoint and
replays only the work performed since that checkpoint. No duplicate side effects thanks
to idempotency keys.

**Cursor rollback**: The orchestrator maintains per-group message cursors. On agent
failure, if no output has been sent to the user yet, the cursor rolls back to enable
automatic retry. If output was already delivered, the cursor stays advanced to prevent
duplicate messages.

**Graceful degradation**: If a tool fails, the agent receives the error as an observation
and can reason about alternatives. The loop continues rather than crashing.

**Circuit breaker**: After N consecutive failures of the same tool, the tool is
temporarily disabled. The agent is informed and must find alternative approaches.

**Exponential backoff retry**: Failed message processing retries with `5s × 2^(attempt-1)`
backoff (5s, 10s, 20s, 40s, 80s), up to `maxRetries` (default: 3) before the message
moves to the dead-letter store.

**Orphan cleanup**: On startup, the system detects and stops abandoned containers or
SDK subprocesses from previous crashed runs, preventing resource leaks.

### Dead-Letter Store

Messages that fail after `maxRetries` attempts are moved to the dead-letter store rather
than being silently dropped:

| Field | Contents |
|-------|----------|
| `originalMessage` | Full original message payload |
| `errorDetails` | Last error encountered |
| `retryCount` | Number of attempts made |
| `timestamp` | Time of final failure |

Dead-letter entries are stored in `data/ipc/{groupFolder}/dead-letter/`. Operators can
replay or dismiss entries via the management console. Default retention: 7 days.

---

## 16. Security Model

### Threat Surface

| Threat | Mitigation |
|--------|------------|
| **Prompt injection** | Execution model isolation, input sanitization, output tag stripping, separate system/user channels |
| **Tool abuse** | Least-privilege permissions, HITL gates, rate limiting, IPC authorization checks |
| **Context leakage** | Session isolation, `dmScope` per-channel-peer, per-group filesystem namespaces |
| **Credential exposure** | Secrets via environment variables only; never written to transcripts; not mounted in containers |
| **Plugin supply chain** | Version pinning, vulnerability scanning, sandboxed execution |
| **Replay attacks** | Mandatory handshake, no automatic event replay, session-bound tokens |
| **Mount escape** (container mode) | External allowlist, symlink resolution, path traversal rejection, blocked patterns |
| **Cross-group escalation** | Per-group IPC namespaces, identity-based authorization, read-only enforcement for non-admin |

### Defense in Depth

```
Layer 1: Authentication   -- API keys, session tokens, mandatory handshake
Layer 2: Authorization    -- RBAC, per-agent permission scopes, IPC identity checks
Layer 3: Isolation        -- Container boundaries (container mode) or SDK subprocess
                             boundary (in-process mode) — see §10 for tradeoffs
Layer 4: Input Validation -- PreToolUse hooks for dangerous operations,
                             secret sanitization, schema validation
Layer 5: Auditing         -- PostToolUse logging, append-only transcripts,
                             dead-letter store, IPC audit trail
```

### Secret Handling

Secrets follow a narrow, auditable path:

- In-process mode: API keys are injected as environment variables to the SDK subprocess
  at spawn time. They are not inherited by bash subprocesses spawned by tools.
- Container mode: Secrets are injected via the container's environment at `docker run`
  time. The host `.env` file is read by the orchestrator but is never mounted into the
  container.

In both modes, secrets are never written to transcripts, IPC files, or workspace files.

### Secure DM Mode

When multiple users can message the same agent, `dmScope: "per-channel-peer"` isolates
conversation context per sender and channel. Without this, User A's private messages
could leak into User B's context.

---

## 17. Observability

### Three Pillars

| Pillar | What to Capture |
|--------|-----------------|
| **Tracing** | Full reasoning chain: input → thought → action → observation → output. Replay any agent decision path. |
| **Metrics** | Token usage, cost per turn, latency per turn, tool call success/failure rates, queue depth, session count. |
| **Logging** | Append-only transcripts serve as structured logs. Every tool call, LLM response, and state transition is recorded. Per-group log files with ISO timestamps. |

### Evaluation Framework

| Tier | Scope | Cadence |
|------|-------|---------|
| **PR gates** | Deterministic checks (schema validation, unit tests) | Every commit |
| **Skill tests** | Individual + pairwise skill combination tests | Every skill change |
| **Nightly regression** | LLM-as-judge evaluation on benchmark tasks | Daily |
| **Production monitoring** | Live metrics, anomaly detection, user feedback | Continuous |

### Key Metrics

- **Task completion rate**: % of tasks successfully completed end-to-end
- **Tool selection accuracy**: Did the agent pick the right tool?
- **Parameter accuracy**: Were tool parameters correct?
- **Turns to completion**: How many SDK turns to reach the answer?
- **Cost per task**: Total token spend per completed task (`cost_usd` accumulation)
- **Error rate by category**: Transient vs. tool vs. LLM vs. state errors
- **Dead-letter volume**: Messages per day reaching the dead-letter store

---

## 18. Pattern Selection Guide

### Orchestration Pattern

```
Start
  |
  +-- Is the task within a single domain with clear scope?
  |   YES --> Single Agent
  |   NO  --+
  |         |
  |   +-- Are subtasks independent (parallelizable)?
  |   |   YES --> Fan-Out / Parallel
  |   |   NO  --+
  |   |         |
  |   |   +--> Supervisor
```

### Execution Model

```
Start
  |
  +-- Multi-tenant or untrusted input?
  |   YES --> Container-Isolated (mandatory)
  |   NO  --+
  |         |
  |   +-- Agent has shell/file access to sensitive paths?
  |   |   YES --> Container-Isolated (recommended)
  |   |   NO  --> In-Process (sufficient)
```

### Capability vs. Complexity

```
Capability ^
           |                    +-----------+
           |               +---| Supervisor |
           |         +-----+   +-----------+
           |   +-----| Fan-Out
           |   | Single
           |   | Agent
           |   |
           +---+----------------------------> Complexity
```

**Rule of thumb**: Start with the simplest pattern that works. Graduate to more complex
patterns only when you hit concrete limitations.

---

## 19. References

### Companion Documents

- [Implementation Guide (Claude Agent SDK)](./IMPLEMENTATION_GUIDE_CLAUDE_AGENT_SDK.md) — SDK-level implementation of this architecture using `@anthropic-ai/claude-agent-sdk`
- [Frontend Design — Agent Orchestration Console](./FRONTEND_DESIGN.md) — Web-based management UI for operators

### Primary Sources

- [OpenClaw Architecture Part 1: Control Flow](https://theagentstack.substack.com/p/openclaw-architecture-part-1-control) — Hub-and-spoke Gateway architecture, input model, session isolation, protocol design
- [OpenClaw Architecture Part 2: Concurrency](https://theagentstack.substack.com/p/openclaw-architecture-part-2-concurrency) — Two-stage queue model, deduplication, transport safety
- [NanoClaw](https://github.com/qwibitai/nanoclaw) — Container-isolated agent runtime, file-based IPC, hierarchical memory, skills-as-code-transforms, per-group namespace isolation

### Industry References

- [Microsoft Azure — AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — Supervisor, sequential, and parallel patterns for enterprise
- [Google Cloud — Choose a Design Pattern for Agentic AI](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system) — Decision framework for pattern selection
- [KDnuggets — 5 Essential Design Patterns for Agentic AI](https://www.kdnuggets.com/5-essential-design-patterns-for-building-robust-agentic-ai-systems) — ReAct, state graphs, generator-critic, multi-agent loops
- [Confluent — Four Design Patterns for Event-Driven Multi-Agent Systems](https://www.confluent.io/blog/event-driven-multi-agent-systems/) — Event-driven orchestration
- [Speakeasy — Architecture Patterns for Agentic Applications](https://www.speakeasy.com/mcp/using-mcp/ai-agents/architecture-patterns) — Practical pattern guide

### Security

- Cisco AI Threat Research (2025) — 26% of 31,000 analyzed agent skills contained vulnerabilities

---

*Document updated 2026-02-25. This is a living reference — update as patterns mature and new invariants emerge.*
