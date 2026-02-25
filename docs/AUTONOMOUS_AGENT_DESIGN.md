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
10. [Container Isolation & Runtime](#10-container-isolation--runtime)
11. [Multi-Agent Orchestration Patterns](#11-multi-agent-orchestration-patterns)
12. [Tool System Design](#12-tool-system-design)
13. [Skill System & Composable Extensions](#13-skill-system--composable-extensions)
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
| **Container-first isolation** | Security through OS-level container boundaries rather than application-level permission checks. Agents cannot escape their sandbox. |
| **Small enough to understand** | Prefer a single-process, minimal-dependency architecture over sprawling config-driven systems. Code-driven customization over configuration sprawl. |

---

## 2. Core Invariants

These invariants must hold at all times. The system should fail loudly if any are violated.

1. **Single-writer per session** — At most one active run per session at any instant.
2. **Append-only transcripts** — Session history is never mutated, only appended.
3. **Tool-boundary preemption only** — A running agent is never interrupted mid-tool-call; preemption happens between tool calls.
4. **Idempotent side effects** — External mutations are protected by idempotency keys; safe to retry.
5. **Mandatory handshake** — Every client connection begins with an authenticated `connect` frame before any work is dispatched.
6. **Container-per-invocation** — Each agent run executes in an ephemeral container (`--rm`) with explicit mount allowlists. No shared mutable state between runs except through the state layer.
7. **Secrets off-disk** — Credentials pass via stdin or environment injection at runtime; they are never written to the agent's filesystem or transcripts.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        INPUT SOURCES                        │
│  User Messages │ Webhooks │ Timers/Cron │ Heartbeats │ Hooks│
└───────┬─────────────┬──────────┬────────────┬──────────┬────┘
        │             │          │            │          │
        ▼             ▼          ▼            ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONTROL PLANE (GATEWAY)                   │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Protocol    │  │  Session      │  │  Queue Manager    │  │
│  │  Layer       │  │  Router       │  │  (Lane-Aware FIFO)│  │
│  │  (WebSocket) │  │              │  │                   │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                │                    │             │
│  ┌──────┴────────────────┴────────────────────┴──────────┐  │
│  │              Concurrency Governor                     │  │
│  │   Per-Session Serialization + Global Throttle Cap     │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  CONTAINER ISOLATION LAYER                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               AGENT RUNTIME (Ephemeral)                │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │  │
│  │  │  Context  │─▶│  LLM Call  │─▶│ Tool Execution   │   │  │
│  │  │  Loader   │  │  (Reason)  │  │ (Act)            │   │  │
│  │  └──────────┘  └────────────┘  └───────┬──────────┘   │  │
│  │                                        │              │  │
│  │                                 ┌──────▼──────┐       │  │
│  │                                 │ Observation  │       │  │
│  │                                 │ + Persist    │       │  │
│  │                                 └─────────────┘       │  │
│  └────────────────────────────────────────────────────────┘  │
│  Process isolation │ FS isolation │ Unprivileged user        │
│  Explicit mounts   │ Secrets via stdin │ Ephemeral (--rm)    │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                      STATE LAYER                             │
│                                                             │
│  Session Transcripts  │  Agent Workspace  │  IPC Channels   │
│  (JSONL)              │  (Files/Memory)   │  (File-based)   │
│  Session Metadata     │  Checkpoints      │  Task Snapshots │
│  (JSON/SQLite)        │                   │                 │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role |
|-----------|------|
| **Input Sources** | Normalize diverse triggers into a unified event format. |
| **Control Plane** | Single source of truth. Routes events, enforces invariants, manages sessions, governs concurrency. |
| **Container Layer** | OS-level isolation boundary. Each agent run is an ephemeral container with explicit filesystem mounts, process separation, and unprivileged execution. |
| **Agent Runtime** | Stateless worker inside the container executing the core loop: load context → call LLM → execute tools → persist. |
| **State Layer** | Durable, append-only storage. Transcripts, metadata, workspace files, IPC channels, and checkpoints. |

---

## 4. The Agent Runtime Loop

The agent runtime implements a **ReAct-style loop** (Reason → Act → Observe) with explicit
termination conditions and tool-boundary safety.

```
function agentLoop(session, input):
    context = loadContext(session)
    context.append(input)

    while not terminated:
        # REASON — Ask the LLM what to do next
        response = llm.call(context, tools=availableTools)

        # CHECK TERMINATION
        if response.isComplete or iterationCount >= maxIterations:
            persist(session, response.finalMessage)
            return response.finalMessage

        # ACT — Execute tool calls sequentially or in parallel
        for toolCall in response.toolCalls:
            # PREEMPTION CHECK (tool boundary)
            if queue.hasPendingMessage(session) and queueMode == "steer":
                inject(queue.dequeue(session), context)
                break

            observation = executeTool(toolCall)
            context.append(observation)

        iterationCount++

    persist(session, timeoutMessage)
    return timeoutMessage
```

### Loop Termination Conditions

| Condition | Behavior |
|-----------|----------|
| LLM emits final answer (no tool calls) | Return result, persist transcript |
| Max iterations reached | Return partial result with explanation |
| Steering message injected | Break current tool chain, process new input |
| Unrecoverable error | Log error, persist state, surface to user |
| User-initiated cancel | Abort at next tool boundary |

### Key Properties

- **Stateless runtime**: All durable state lives in the state layer. The runtime can crash and another worker can resume from the last checkpoint.
- **Bounded execution**: `maxIterations` and `maxBudgetUsd` prevent runaway loops and unbounded cost.
- **Tool-boundary safety**: Preemption only happens between tool calls, never mid-execution. This prevents partially-applied side effects.

### Recursive Generator Pattern (NanoClaw/Claude Agent SDK)

An alternative to the iterative while-loop is a **recursive async generator** pattern.
Each invocation represents one API turn:

```
async function* EZ(context, turnCount):
    # Prepare and trim context
    messages = trimToContextWindow(context)

    # Call LLM via streaming
    response = await streamingCall(messages, tools)

    # Yield assistant message to caller
    yield { type: "assistant", content: response }

    # Terminal condition: no tool calls = done
    if not response.hasToolCalls():
        return

    # Execute tools, yield observations
    for toolCall in response.toolCalls:
        result = await executeTool(toolCall)
        context.append(result)
        yield { type: "tool_result", content: result }

    # Recurse for next turn
    yield* EZ(context, turnCount + 1)
```

This pattern enables the caller to consume results as an **async iterable**, providing
natural backpressure and streaming output. The outer process can inject new messages
into the context between turns without breaking the loop.

### Streaming Input Mode

For long-lived agents that receive follow-up messages while running, pass an
`AsyncIterable` as the prompt source instead of a static string:

| Input Mode | Behavior | Agent Teams |
|------------|----------|-------------|
| Static string | Single turn; stdin closes after first result | Breaks — subagents killed prematurely |
| AsyncIterable | Multi-turn; stdin stays open | Works — subagents run to completion |

The streaming input mode enables piping new messages (from chat, webhooks, IPC) directly
into an active agent run, rather than queueing until the container exits.

---

## 5. Control Plane (Gateway)

The Gateway is the **central traffic controller** — the single source of truth for session state and the arbiter of concurrency.

### Protocol

Communication uses a typed WebSocket protocol with three frame types:

| Frame | Direction | Purpose |
|-------|-----------|---------|
| `request`  | client → gateway | `{ type: "req", id, method, params }` |
| `response` | gateway → client | `{ type: "res", id, ok, payload \| error }` |
| `event`    | gateway → client | `{ type: "event", event, payload }` |

**Mandatory handshake**: The first frame must be a `connect` request with authentication credentials. No work is dispatched before handshake completes.

**No event replay**: Events are fire-and-forget. Clients that miss events must explicitly refresh. This simplicity preserves invariant integrity.

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

All five input types are normalized into the same event format and processed by the same agent loop. The agent cannot distinguish between a user typing a message and a webhook firing — both are just "turns."

### Heartbeat Pattern

Heartbeats are the mechanism that makes agents appear "always thinking." At a configurable cadence (e.g., every 30 minutes), the system sends the agent a heartbeat event. The agent evaluates its context and either:

- Responds `HEARTBEAT_OK` (nothing to do)
- Takes proactive action (e.g., checking on a long-running deployment)

This is not continuous reasoning. It is a polling loop with a large interval.

---

## 7. Session & State Management

### Session as Isolation Boundary

A **session** is the fundamental unit of isolation. Each session has:

- A unique key (e.g., `agent:<agentId>:<sessionKey>`)
- An append-only transcript (JSONL)
- A metadata record
- An associated workspace (filesystem directory)

### Session Key Patterns

| Scenario | Key Pattern |
|----------|-------------|
| Primary DM | `agent:<agentId>:main` |
| Group chat | `agent:<agentId>:slack:<channelId>` |
| Secure DM | `agent:<agentId>:dm:<channelId>:<peerId>` |
| Scheduled task | `agent:<agentId>:cron:<jobId>` |

### State Architecture

```
~/.agent/
├── agents/
│   └── <agentId>/
│       ├── config.yaml              # Agent configuration
│       ├── workspace/               # Agent's working directory ("memory")
│       │   ├── memory.md            # Persistent notes
│       │   └── ...                  # Task-specific files
│       └── sessions/
│           ├── sessions.json        # Session metadata index
│           ├── <sessionId>.jsonl    # Append-only transcript
│           └── <sessionId>.jsonl    # ...
```

### State Persistence Model

| State Type | Storage | Durability | Access Pattern |
|------------|---------|------------|----------------|
| **Transcript** | JSONL files | Survives restart | Append-only, load on context |
| **Session metadata** | JSON index | Survives restart | Read/write by Gateway |
| **Workspace files** | Filesystem | Survives restart | Read/write by tools |
| **Checkpoints** | State snapshots | Survives restart | Resume from last checkpoint |
| **In-flight state** | Memory | Lost on crash | Reconstructed from transcript |

### Checkpoint Pattern

For long-running or multi-step workflows, the system persists state snapshots at each node boundary:

1. Agent completes a tool call → checkpoint persisted
2. System crashes → restart from last checkpoint
3. No repeated work, no lost context

This pattern (popularized by LangGraph) enables crash-safe resumption of complex multi-step workflows.

---

## 8. Hierarchical Memory Model

Agents need persistent memory that survives across sessions and invocations. A
hierarchical model (inspired by NanoClaw) provides scoped memory at multiple levels.

### Memory Hierarchy

```
┌─────────────────────────────────────────────┐
│              Global Memory                  │
│  Shared preferences, facts, system context  │
│  Writable: admin/main channel only          │
│  Readable: all groups                       │
├─────────────────────────────────────────────┤
│          Group/Context Memory               │
│  Per-group conversation history & context   │
│  Writable: owning group only               │
│  Readable: owning group only               │
├─────────────────────────────────────────────┤
│           Session Memory                    │
│  Per-session transcript & working state     │
│  Writable: active session only             │
│  Readable: active session only             │
└─────────────────────────────────────────────┘
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

---

## 9. Concurrency & Queue Model

### Two-Stage Lane Architecture

Concurrency control uses a **two-stage lane-aware FIFO queue**:

```
             ┌──────────────────────────────┐
             │       Per-Session Lanes       │
             │                              │
Input ──────▶│  session:abc  ──▶ [Run]      │
Input ──────▶│  session:def  ──▶ [Wait]     │──▶ Global Lane ──▶ Execute
Input ──────▶│  session:abc  ──▶ [Queued]   │    (maxConcurrent)
             │                              │
             └──────────────────────────────┘
```

**Stage 1 — Per-session serialization**: Each session has its own FIFO lane. Only one run per session is active. Additional inputs queue behind.

**Stage 2 — Global throttle**: All session lanes feed through a global lane with a configurable `maxConcurrent` cap. This prevents resource exhaustion (LLM rate limits, file I/O contention).

### Queue Modes

When a new message arrives while a run is already active for that session, the system
applies one of these policies:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `collect` | Coalesce queued messages into one follow-up turn | Default — batches rapid-fire user messages |
| `followup` | Queue as next turn after current run completes | Sequential processing, order-sensitive work |
| `steer` | Inject at next tool boundary, skip remaining tool calls | "Change course" — user overrides current plan |
| `steer-backlog` | Steer immediately AND preserve for follow-up | Override + don't lose the message |
| `interrupt` | Abort active run, execute new message | Emergency override (use sparingly) |

### Steering Mechanism

Steering is the safe alternative to hard interruption:

1. New message arrives while agent is executing tool calls
2. After the current tool call completes (tool boundary), the queue is checked
3. If a steering message exists, remaining tool calls are skipped
4. The steering message is injected into context before the next LLM call
5. The agent naturally incorporates the new instruction

This preserves tool-call atomicity while enabling mid-run course correction.

### Transport Safety

**Deduplication**: Short-lived cache keyed by `(channel, account, peer, session, messageId)` prevents duplicate deliveries from triggering multiple runs.

**Debouncing**: Rapid consecutive text messages are batched into a single agent turn via configurable `debounceMs`. Attachments and control commands bypass debouncing.

---

## 10. Container Isolation & Runtime

OS-level container isolation (as implemented by NanoClaw) provides stronger security
guarantees than application-level permission checks. Each agent invocation runs inside
an ephemeral container with explicit resource boundaries.

### Container Architecture

```
┌─── Host Process ───────────────────────────────────────┐
│                                                        │
│  Orchestrator ──spawn──▶ Container (ephemeral, --rm)   │
│       │                  ┌──────────────────────────┐  │
│       │ stdin (secrets)  │  Agent Runtime            │  │
│       │─────────────────▶│                          │  │
│       │                  │  /workspace/group (rw)   │  │
│       │◀─────────────────│  /workspace/project (ro) │  │
│       │ stdout (results) │  /workspace/global (ro)  │  │
│       │                  │  /workspace/ipc (rw)     │  │
│       │                  │                          │  │
│       │                  │  User: node (uid 1000)   │  │
│       │                  └──────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Mount Strategy

The mount system controls exactly what the agent can see and modify:

| Mount | Path in Container | Access | Purpose |
|-------|-------------------|--------|---------|
| Group folder | `/workspace/group` | Read-Write | Agent's working directory and memory |
| Project root | `/workspace/project` | Read-Only | Source code access without mutation |
| Global memory | `/workspace/global` | Read-Only | Shared context across all groups |
| IPC directory | `/workspace/ipc` | Read-Write | File-based inter-process communication |
| Sessions | `/home/node/.claude/` | Read-Write | SDK session persistence |
| Extra mounts | `/workspace/extra/*` | Configurable | User-specified additional directories |

### Mount Security

An **external allowlist** (`~/.config/nanoclaw/mount-allowlist.json`) stored outside the
project root controls which additional host paths can be mounted. This file is never
mounted into containers, preventing agents from modifying their own access rules.

**Default blocked patterns** (17 categories):
- SSH keys (`.ssh/`), Cloud credentials (`.aws/`, `.azure/`, `.gcloud/`)
- Kubernetes config (`.kube/`), Package manager credentials (`.npmrc`, `.pypirc`)
- Docker config, GPG keys, netrc, and other secrets

**Validation pipeline**:
1. Resolve symlinks via `realpathSync()` — prevents symlink-based escapes
2. Check against blocked patterns — reject sensitive paths
3. Verify allowed root directories — path must fall under approved roots
4. Sanitize container paths — reject `..` traversal and absolute paths
5. Enforce read-only for non-admin groups

### Container Lifecycle

1. **Build volume mounts** — Determine explicit mount list based on group type and allowlist
2. **Spawn container** — Ephemeral (`--rm`), unprivileged user, stdio pipes
3. **Inject secrets via stdin** — API keys and tokens pass through stdin, then are stripped
4. **Stream output** — Parse marker-delimited output (`OUTPUT_START`/`OUTPUT_END`) for
   real-time response streaming
5. **Timeout management** — Hard timeout with reset on streaming output; short idle
   timeout (10s) for tasks vs. 30 min for interactive sessions
6. **Cleanup** — Container auto-removes; orphan detection kills abandoned containers

### Per-Group Agent Customization

Each group receives its own copy of the agent-runner source code. The container
recompiles TypeScript on each start, enabling per-group tool configuration, custom
hooks, and behavior differences — without affecting other groups.

### Why Containers Over Application-Level Sandboxing

| Approach | Strength | Weakness |
|----------|----------|----------|
| App-level permissions | Fine-grained, low overhead | Bypassable via prompt injection |
| Container isolation | OS-enforced, defense-in-depth | Slight startup overhead |

Containers provide a **hard boundary** that holds even if the agent is fully compromised
by prompt injection. The agent cannot access files outside its mounts, regardless of
what the LLM decides to do.

---

## 11. Multi-Agent Orchestration Patterns

When a single agent is insufficient, these patterns compose multiple agents. All patterns
build on the same session, queue, and tool primitives.

### Pattern 1: Supervisor

```
                    ┌──────────────┐
                    │  Supervisor  │
                    │  Agent       │
                    └──────┬───────┘
                           │ delegates
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Research  │ │ Coding   │ │ Review   │
        │ Agent     │ │ Agent    │ │ Agent    │
        └──────────┘ └──────────┘ └──────────┘
```

A central supervisor receives the user request, decomposes it into subtasks, delegates
to specialized agents, monitors progress, validates outputs, and synthesizes a final
response.

**When to use**: Complex multi-domain workflows where reasoning transparency and quality
assurance matter more than latency.

### Pattern 2: Sequential Pipeline

```
Input ──▶ [Agent A] ──▶ [Agent B] ──▶ [Agent C] ──▶ Output
           Extract       Transform      Validate
```

Each agent processes the output of the previous agent. Simple, predictable, and easy to
debug.

**When to use**: Clear linear dependencies where each stage refines the previous output.

### Pattern 3: Fan-Out / Parallel

```
                    ┌──────────────┐
                    │ Orchestrator │
                    └──────┬───────┘
                           │ dispatches
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Worker A │ │ Worker B │ │ Worker C │
        └─────┬────┘ └─────┬────┘ └─────┬────┘
              │            │            │
              └────────────┼────────────┘
                           ▼
                    ┌──────────────┐
                    │  Aggregator  │
                    └──────────────┘
```

Independent tasks execute in parallel. An aggregator collects and synthesizes results.

**When to use**: Tasks with no inter-dependencies that benefit from parallel execution
(e.g., searching multiple sources, running tests in parallel).

### Pattern 4: Generator-Critic

```
        ┌──────────┐         ┌──────────┐
        │Generator │────────▶│  Critic  │
        │          │◀────────│          │
        └──────────┘ refine  └──────────┘
              │
              ▼ (when approved)
           Output
```

One agent generates output; another evaluates it against criteria. The loop repeats
until the critic approves or a max iteration limit is reached.

**When to use**: Tasks requiring quality assurance — code generation + review, content
creation + editorial pass, plan generation + validation.

### Pattern 5: Handoff / Delegation

```
User ──▶ [Triage Agent] ──handoff──▶ [Specialist Agent]
                                           │
                                     ──handoff──▶ [Another Specialist]
```

Agents dynamically transfer tasks to more appropriate specialists based on context.
Each agent decides whether to handle directly or delegate.

**When to use**: Customer support routing, multi-domain problem solving where the
required expertise isn't known upfront.

### Pattern 6: Hierarchical Teams

```
        ┌────────────────────┐
        │   Executive Agent  │
        └─────────┬──────────┘
                  │
        ┌─────────┼──────────┐
        ▼                    ▼
  ┌───────────┐        ┌───────────┐
  │ Team Lead │        │ Team Lead │
  │ (Backend) │        │ (Frontend)│
  └─────┬─────┘        └─────┬─────┘
        │                     │
   ┌────┼────┐           ┌────┼────┐
   ▼    ▼    ▼           ▼    ▼    ▼
  [W1] [W2] [W3]       [W4] [W5] [W6]
```

Nested supervisors managing groups of specialists. Higher-level agents make strategic
decisions; lower-level agents execute tactical tasks.

**When to use**: Large-scale systems that mirror organizational structure — e.g., a
software project with backend, frontend, and infrastructure teams.

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
| **System** | Shell execution, process management | High (safe inside containers) |
| **External** | API calls, message sending, deployments | High |
| **Browser** | Web navigation, form filling | Medium-High |
| **IPC** | Send message, schedule task, manage tasks | Medium (authorization-scoped) |

### MCP Server Pattern (NanoClaw)

Tools can be exposed via **Model Context Protocol (MCP) servers** running alongside the
agent. This decouples tool definitions from the agent runtime:

```
Agent Runtime
  │
  ├── stdio MCP Server (in-process or subprocess)
  │   ├── send_message     — Send to user/group
  │   ├── schedule_task    — Create cron/interval/one-time tasks
  │   ├── list_tasks       — View scheduled tasks
  │   ├── pause_task       — Pause execution
  │   ├── resume_task      — Resume execution
  │   └── cancel_task      — Delete task
  │
  └── SDK Built-in Tools
      ├── Bash (sandboxed in container)
      ├── File ops (Read, Write, Edit, Glob, Grep)
      ├── Web (WebSearch, WebFetch)
      └── Browser (Chromium automation)
```

The MCP server reads identity from environment variables (group folder, chat ID, admin
flag) and enforces authorization per-call. Subagents inherit MCP tool access via stdio
transport.

### Human-in-the-Loop Gates

High-risk tools can require human approval before execution:

```
toolCall = agent.nextAction()

if toolCall.tool.riskLevel == "high":
    approval = requestHumanApproval(toolCall)
    if not approval:
        context.append("Tool call denied by user")
        continue

result = executeTool(toolCall)
```

This makes orchestration synchronous at approval points. State must be checkpointed
before and after gates to survive arbitrarily long wait times.

---

## 13. Skill System & Composable Extensions

Skills are the mechanism for extending agent capabilities without bloating the core.
Two complementary approaches serve different purposes.

### Runtime Skills (Plugin-Style)

External tools loaded at runtime:

- **Workspace plugins**: Discovered from the agent's working directory
- **Managed plugins**: Installed and version-pinned by the operator
- **Community plugins**: Third-party (treat as untrusted code)

**Security warning**: Research shows ~26% of analyzed agent skills contain vulnerabilities
(Cisco, 2025). Always pin versions, scan for vulnerabilities, and sandbox execution.

### Code-Transform Skills (NanoClaw)

A more radical approach: skills are **source-code transformations** that modify the
installation itself. Each user's system becomes a unique composition of exactly the
features they need.

```
skills/add-telegram/
├── SKILL.md              # Instructions for AI-assisted application
├── manifest.yaml         # Metadata, dependencies, tests
├── add/                  # New files (copied directly)
│   └── src/channels/telegram.ts
├── modify/               # Full modified files (three-way merged)
│   ├── src/index.ts
│   └── src/index.ts.intent.md   # Structured merge guidance
└── tests/
    └── telegram.test.ts
```

### Three-Level Conflict Resolution

When skills modify the same files, conflicts are resolved through escalation:

| Level | Method | When Used |
|-------|--------|-----------|
| **1. Git** | `git merge-file` three-way merge | Deterministic, non-overlapping changes |
| **2. AI** | Claude Code reads intent docs + manifests | Overlapping changes that require context |
| **3. Human** | Manual resolution | Genuine application-level ambiguity |

### Shared Base Architecture

A clean snapshot of the core (`base/`) serves as the common ancestor for all
three-way merges:

```
.nanoclaw/
├── base/            # Clean core snapshot (stable merge ancestor)
├── state.yaml       # Applied skills, file hashes, structured outcomes
├── backup/          # Pre-operation safety copies
├── custom/          # User modification patches
└── resolutions/     # Verified conflict resolutions (hash-enforced)
```

### Key Skill Properties

- **Mandatory tests**: Tests run even after clean merges — textual merge success
  does not guarantee functional correctness.
- **Uninstall = replay**: Removing a skill replays all remaining skills from the
  clean base rather than attempting a reverse-patch.
- **Structured operations**: `package.json`, `.env`, and `docker-compose.yml` are
  never text-merged — they use deterministic aggregation (semver resolution, port
  collision detection, dedup).
- **Atomic backup/restore**: All files are backed up before modification; any failure
  triggers full rollback.
- **Deterministic replay**: Given `state.yaml`, an entire installation can be
  reproduced on a fresh machine without AI assistance (all resolutions cached).

### Intent Documentation

Each modified file includes a companion `.intent.md` with structured headings that
guide AI-assisted conflict resolution:

```markdown
## What this skill adds
Adds Telegram webhook route and message handler.

## Invariants
- Must not interfere with other channel routes
- Auth middleware must precede handler

## Must-keep sections
- Webhook verification flow (required by Telegram API)
```

---

## 14. Inter-Process Communication (IPC)

Agents running inside containers need to communicate with the host orchestrator and
with each other. File-based IPC provides a simple, auditable, container-compatible
mechanism.

### File-Based IPC Protocol (NanoClaw)

```
data/ipc/{groupFolder}/
├── messages/          # Agent → Host: send messages to users
│   └── {timestamp}.json
├── tasks/             # Agent → Host: schedule/manage tasks
│   └── {timestamp}.json
├── input/             # Host → Agent: follow-up messages
│   ├── {timestamp}.json
│   └── _close         # Sentinel: signal graceful shutdown
└── errors/            # Failed IPC files (audit trail)
    └── {source}-{filename}.json
```

### Authorization Model

IPC authorization is **identity-based** — the source group's filesystem namespace
implicitly identifies the caller:

| Operation | Admin Group | Regular Group |
|-----------|-------------|---------------|
| Send messages | Any chat | Own chat only |
| Schedule tasks | Any group | Own group only |
| Manage tasks | All tasks | Own tasks only |
| Register groups | Yes | No |

### Message Piping (Follow-Up Without Respawn)

Rather than spawning a new container for every follow-up message, the orchestrator
**pipes messages into active containers** via IPC files:

1. New message arrives for a group that has an active container
2. Message written as JSON to `data/ipc/{group}/input/{timestamp}.json`
3. Agent-runner polls `input/` directory at 500ms intervals
4. New messages are pushed into the `AsyncIterable` prompt stream
5. Agent processes them as additional turns without losing context

This avoids the cold-start cost of container spawning while maintaining the isolation
guarantee — the container is already running with the correct mounts.

### Graceful Shutdown via Sentinel

A special `_close` sentinel file signals the agent to wind down:

1. Container enters idle state (no pending work)
2. After idle timeout, host writes `_close` to `input/`
3. Agent-runner detects sentinel, ends the `AsyncIterable`
4. SDK completes gracefully, container exits
5. Docker's `--rm` flag cleans up automatically

This is safer than SIGTERM because it allows the agent to complete any final tool
calls and persist state.

### Atomic File Writes

All IPC files use temp-file-then-rename for crash safety:

```
write(data) → {path}.tmp → rename → {path}.json
```

This prevents the poller from reading partially-written files.

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
| **Container timeout** | Distinguish idle vs. stuck; cleanup accordingly | Hard timeout reached |

### Recovery Patterns

**Checkpoint-based recovery**: After a crash, the runtime loads the last checkpoint and
replays only the work performed since that checkpoint. No duplicate side effects thanks
to idempotency keys.

**Cursor rollback** (NanoClaw): The orchestrator maintains per-group message cursors.
On agent failure, if no output has been sent to the user yet, the cursor rolls back to
enable automatic retry. If output was already delivered, the cursor stays advanced to
prevent duplicate messages.

**Graceful degradation**: If a tool fails, the agent receives the error as an observation
and can reason about alternatives. The loop continues rather than crashing.

**Circuit breaker**: After N consecutive failures of the same tool, the tool is
temporarily disabled. The agent is informed and must find alternative approaches.

**Exponential backoff retry**: Failed message processing retries with `5s * 2^(attempt)`
backoff, up to a configurable max attempts before the message is dropped (but may be
retried on the next incoming activity).

**Orphan cleanup**: On startup, the system detects and stops abandoned containers from
previous crashed runs, preventing resource leaks.

**Dead letter queue**: Messages that repeatedly fail processing are moved to a dead letter
queue for human review rather than being silently dropped. IPC files that fail processing
move to an `errors/` directory with source attribution.

---

## 16. Security Model

### Threat Surface

| Threat | Mitigation |
|--------|------------|
| **Prompt injection** | Container isolation (hard boundary), input sanitization, output tag stripping, separate system/user channels |
| **Tool abuse** | Least-privilege permissions, HITL gates, rate limiting, IPC authorization checks |
| **Context leakage** | Session isolation, `dmScope` per-channel-peer, per-group filesystem namespaces |
| **Credential exposure** | Secrets via stdin only (never on disk), stripped from subprocess environments, container-isolated |
| **Plugin supply chain** | Version pinning, vulnerability scanning, sandboxed container execution |
| **Replay attacks** | Mandatory handshake, no automatic event replay, session-bound tokens |
| **Mount escape** | External allowlist (tamper-proof), symlink resolution, path traversal rejection, blocked patterns |
| **Cross-group escalation** | Per-group IPC namespaces, identity-based authorization, read-only enforcement for non-admin |

### Defense in Depth

```
Layer 1: Authentication     — Pairing codes, tokens, mandatory handshake
Layer 2: Authorization      — Per-tool permissions, IPC identity checks, HITL gates
Layer 3: Container Isolation — Process/filesystem/user separation, ephemeral --rm
Layer 4: Mount Security      — External allowlist, blocked patterns, symlink resolution
Layer 5: Secret Handling     — Stdin injection, environment stripping, never on disk
Layer 6: Session Isolation   — Per-group namespaces, dmScope, workspace boundaries
Layer 7: Validation          — Schema validation on all inputs/outputs
Layer 8: Auditing            — Append-only transcripts, IPC error trails, tool logs
Layer 9: Output Sanitization — Internal tag stripping before user-facing delivery
```

### Secure DM Mode

When multiple users can message the same agent, `dmScope: "per-channel-peer"` isolates
conversation context per sender and channel. Without this, User A's private messages
could leak into User B's context.

### Secret Handling Pipeline (NanoClaw)

Secrets follow a narrow, auditable path:

```
.env file ──read──▶ readEnvFile() ──stdin──▶ Container
                    (never loaded                │
                     into process.env)           ▼
                                          Agent Runtime
                                          (sdkEnv only)
                                                │
                                          Stripped from
                                          bash subprocesses
```

1. `.env` parsed with a custom reader that does NOT load into `process.env`
2. Only `ANTHROPIC_API_KEY` and `CLAUDE_CODE_OAUTH_TOKEN` are extracted
3. Injected into the container via stdin JSON
4. Passed only to the SDK environment — explicitly excluded from bash subprocess envs
5. Input object scrubbed after SDK initialization

### Channel Abstraction & Routing Security

A generic channel interface supports multiple messaging platforms:

```
interface Channel {
    name: string
    connect(): Promise<void>
    sendMessage(jid: string, text: string): Promise<void>
    ownsJid(jid: string): boolean
    disconnect(): Promise<void>
}
```

Outbound routing validates that a channel both owns and is connected to the target JID
before delivery. This prevents messages from being sent through the wrong channel.

---

## 17. Observability

### Three Pillars

| Pillar | What to Capture |
|--------|-----------------|
| **Tracing** | Full reasoning chain: input → thought → action → observation → output. Replay any agent decision path. |
| **Metrics** | Token usage, latency per turn, tool call success/failure rates, queue depth, session count, container lifecycle. |
| **Logging** | Append-only transcripts serve as structured logs. Every tool call, LLM response, and state transition is recorded. Per-group log files with ISO timestamps. |

### Evaluation Framework

Adopt a tiered evaluation strategy:

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
- **Turns to completion**: How many loop iterations to reach the answer?
- **Cost per task**: Total token spend per completed task
- **Error rate by category**: Transient vs. tool vs. LLM vs. state errors
- **Container utilization**: Active vs. idle time, orphan count, timeout frequency

---

## 18. Pattern Selection Guide

Use this decision tree to choose the right architecture for your use case:

```
Start
  │
  ├─ Is the task fully defined with clear steps?
  │   YES ──▶ Sequential Pipeline
  │   NO  ──┐
  │         │
  │   ├─ Does it require a single domain of expertise?
  │   │   YES ──▶ Single ReAct Agent
  │   │   NO  ──┐
  │   │         │
  │   │   ├─ Are subtasks independent (parallelizable)?
  │   │   │   YES ──▶ Fan-Out / Parallel
  │   │   │   NO  ──┐
  │   │   │         │
  │   │   │   ├─ Does output need iterative quality refinement?
  │   │   │   │   YES ──▶ Generator-Critic
  │   │   │   │   NO  ──┐
  │   │   │   │         │
  │   │   │   │   ├─ Is routing domain-dependent?
  │   │   │   │   │   YES ──▶ Handoff / Delegation
  │   │   │   │   │   NO  ──▶ Supervisor or Hierarchical
```

### Isolation Strategy Selection

```
Start
  │
  ├─ Do agents need shell/file access?
  │   NO  ──▶ Application-level sandboxing (sufficient)
  │   YES ──┐
  │         │
  │   ├─ Is the agent processing untrusted input?
  │   │   YES ──▶ Container isolation (mandatory)
  │   │   NO  ──┐
  │   │         │
  │   │   ├─ Multiple tenants/groups sharing one system?
  │   │   │   YES ──▶ Container + per-group namespaces
  │   │   │   NO  ──▶ Container (recommended) or process-level
```

### Complexity vs. Capability Tradeoff

```
Capability ▲
           │                              ┌─────────────┐
           │                        ┌─────│ Hierarchical│
           │                  ┌─────│     │   Teams     │
           │            ┌─────│     │     └─────────────┘
           │      ┌─────│     │ Supervisor
           │      │     │  Fan-Out    │
           │      │  Generator-       │
           │   Single  Critic         │
           │   Agent    │             │
           │      │     │             │
           └──────┴─────┴─────────────┴──────────▶ Complexity
```

**Rule of thumb**: Start with the simplest pattern that works. Graduate to more complex
patterns only when you hit concrete limitations. A single ReAct agent with good tools
handles a surprising range of tasks.

---

## 19. References

### Primary Sources

- [OpenClaw Architecture Part 1: Control Flow](https://theagentstack.substack.com/p/openclaw-architecture-part-1-control) — Hub-and-spoke Gateway architecture, input model, session isolation, protocol design
- [OpenClaw Architecture Part 2: Concurrency](https://theagentstack.substack.com/p/openclaw-architecture-part-2-concurrency) — Two-stage queue model, steering, deduplication, transport safety
- [NanoClaw](https://github.com/qwibitai/nanoclaw) — Container-isolated agent runtime, file-based IPC, hierarchical memory, skills-as-code-transforms, per-group namespace isolation

### Industry References

- [Microsoft Azure — AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — Supervisor, sequential, and parallel patterns for enterprise
- [Google Cloud — Choose a Design Pattern for Agentic AI](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system) — Decision framework for pattern selection
- [KDnuggets — 5 Essential Design Patterns for Agentic AI](https://www.kdnuggets.com/5-essential-design-patterns-for-building-robust-agentic-ai-systems) — ReAct, state graphs, generator-critic, multi-agent loops
- [Confluent — Four Design Patterns for Event-Driven Multi-Agent Systems](https://www.confluent.io/blog/event-driven-multi-agent-systems/) — Event-driven orchestration
- [OpenAI Agents SDK — Orchestrating Multiple Agents](https://openai.github.io/openai-agents-python/multi_agent/) — Handoff and delegation patterns
- [Speakeasy — Architecture Patterns for Agentic Applications](https://www.speakeasy.com/mcp/using-mcp/ai-agents/architecture-patterns) — Practical pattern guide
- [Kore.ai — Choosing the Right Orchestration Pattern](https://www.kore.ai/blog/choosing-the-right-orchestration-pattern-for-multi-agent-systems) — Multi-agent orchestration comparison

### Security

- Cisco AI Threat Research (2025) — 26% of 31,000 analyzed agent skills contained vulnerabilities

---

*Document generated 2026-02-25. This is a living reference — update as patterns mature and new invariants emerge.*
