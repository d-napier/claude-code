# Autonomous Agentic System — Architecture Design Document

> A general-purpose reference architecture for building autonomous AI agents that
> reason, act, and persist across sessions. Synthesized from OpenClaw's control-plane
> architecture, industry patterns (ReAct, supervisor, fan-out), and production
> best practices (2025-2026).

---

## Table of Contents

1. [Design Goals](#1-design-goals)
2. [Core Invariants](#2-core-invariants)
3. [High-Level Architecture](#3-high-level-architecture)
4. [The Agent Runtime Loop](#4-the-agent-runtime-loop)
5. [Control Plane (Gateway)](#5-control-plane-gateway)
6. [Input Model — What Creates "Autonomy"](#6-input-model--what-creates-autonomy)
7. [Session & State Management](#7-session--state-management)
8. [Concurrency & Queue Model](#8-concurrency--queue-model)
9. [Multi-Agent Orchestration Patterns](#9-multi-agent-orchestration-patterns)
10. [Tool System Design](#10-tool-system-design)
11. [Error Handling & Recovery](#11-error-handling--recovery)
12. [Security Model](#12-security-model)
13. [Observability](#13-observability)
14. [Pattern Selection Guide](#14-pattern-selection-guide)
15. [References](#15-references)

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

---

## 2. Core Invariants

These invariants must hold at all times. The system should fail loudly if any are violated.

1. **Single-writer per session** — At most one active run per session at any instant.
2. **Append-only transcripts** — Session history is never mutated, only appended.
3. **Tool-boundary preemption only** — A running agent is never interrupted mid-tool-call; preemption happens between tool calls.
4. **Idempotent side effects** — External mutations are protected by idempotency keys; safe to retry.
5. **Mandatory handshake** — Every client connection begins with an authenticated `connect` frame before any work is dispatched.

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
│                     AGENT RUNTIME(S)                         │
│                                                             │
│  ┌──────────┐   ┌────────────┐   ┌────────────────────┐    │
│  │  Context  │──▶│  LLM Call  │──▶│  Tool Execution    │    │
│  │  Loader   │   │  (Reason)  │   │  (Act)             │    │
│  └──────────┘   └────────────┘   └────────┬───────────┘    │
│                                           │                 │
│                                    ┌──────▼──────┐         │
│                                    │  Observation │         │
│                                    │  + Persist   │         │
│                                    └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      STATE LAYER                             │
│                                                             │
│  Session Transcripts (JSONL)  │  Agent Workspace (Files)    │
│  Session Metadata (JSON)      │  Checkpoints                │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role |
|-----------|------|
| **Input Sources** | Normalize diverse triggers into a unified event format. |
| **Control Plane** | Single source of truth. Routes events, enforces invariants, manages sessions, governs concurrency. |
| **Agent Runtime** | Stateless worker executing the core loop: load context → call LLM → execute tools → persist. |
| **State Layer** | Durable, append-only storage. Transcripts, metadata, workspace files, and checkpoints. |

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
- **Bounded execution**: `maxIterations` prevents runaway loops and unbounded cost.
- **Tool-boundary safety**: Preemption only happens between tool calls, never mid-execution. This prevents partially-applied side effects.

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

## 8. Concurrency & Queue Model

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

## 9. Multi-Agent Orchestration Patterns

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

## 10. Tool System Design

### Design Principles

1. **Strict schemas**: Every tool has typed input/output schemas (e.g., TypeBox, JSON Schema). The runtime validates parameters before execution.
2. **Least privilege**: Tools are granted minimum necessary permissions. A search tool cannot write files; a file tool cannot execute shell commands.
3. **Idempotency**: Side-effecting tools accept idempotency keys. Safe to retry without duplicate mutations.
4. **Audit trail**: Every tool invocation is logged with inputs, outputs, duration, and caller identity.
5. **Rate limits**: Tools enforce per-agent and global rate limits to prevent abuse.

### Tool Categories

| Category | Examples | Risk Level |
|----------|----------|------------|
| **Read-only** | Search, file read, API query | Low |
| **Workspace-scoped** | File write (within workspace), note-taking | Medium |
| **System** | Shell execution, process management | High |
| **External** | API calls, message sending, deployments | High |
| **Browser** | Web navigation, form filling | Medium-High |

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

### Plugin / Skill System

External tools can be loaded from:

- **Workspace plugins**: Discovered from the agent's working directory
- **Managed plugins**: Installed and version-pinned by the operator
- **Community plugins**: Third-party (treat as untrusted code)

**Security warning**: Research shows ~26% of analyzed agent skills contain vulnerabilities
(Cisco, 2025). Always pin versions, scan for vulnerabilities, and sandbox execution.

---

## 11. Error Handling & Recovery

### Error Classification

| Error Type | Strategy | Example |
|------------|----------|---------|
| **Transient** | Retry with exponential backoff | Network timeout, rate limit |
| **Tool failure** | Log, surface to agent, let it adapt | API returns 500 |
| **LLM refusal** | Rephrase, reduce scope, escalate | Content policy violation |
| **State corruption** | Halt, alert, recover from checkpoint | Transcript parse error |
| **Unrecoverable** | Halt, persist state, notify user | Auth revoked, quota exhausted |

### Recovery Patterns

**Checkpoint-based recovery**: After a crash, the runtime loads the last checkpoint and
replays only the work performed since that checkpoint. No duplicate side effects thanks
to idempotency keys.

**Graceful degradation**: If a tool fails, the agent receives the error as an observation
and can reason about alternatives. The loop continues rather than crashing.

**Circuit breaker**: After N consecutive failures of the same tool, the tool is
temporarily disabled. The agent is informed and must find alternative approaches.

**Dead letter queue**: Messages that repeatedly fail processing are moved to a dead letter
queue for human review rather than being silently dropped.

---

## 12. Security Model

### Threat Surface

| Threat | Mitigation |
|--------|------------|
| **Prompt injection** | Input sanitization, separate system/user message channels, output validation |
| **Tool abuse** | Least-privilege permissions, HITL gates for high-risk actions, rate limiting |
| **Context leakage** | Session isolation, `dmScope` per-channel-peer mode for multi-user DMs |
| **Credential exposure** | Secrets never in transcripts, environment-variable injection at runtime |
| **Plugin supply chain** | Version pinning, vulnerability scanning, sandboxed execution |
| **Replay attacks** | Mandatory handshake, no automatic event replay, session-bound tokens |

### Defense in Depth

```
Layer 1: Authentication     — Pairing codes, tokens, mandatory handshake
Layer 2: Authorization      — Per-tool permissions, HITL approval gates
Layer 3: Isolation           — Session boundaries, workspace sandboxing
Layer 4: Validation          — Schema validation on all inputs/outputs
Layer 5: Auditing            — Append-only transcripts, tool invocation logs
Layer 6: Operational         — `security audit` diagnostics, rate limiting
```

### Secure DM Mode

When multiple users can message the same agent, `dmScope: "per-channel-peer"` isolates
conversation context per sender and channel. Without this, User A's private messages
could leak into User B's context.

---

## 13. Observability

### Three Pillars

| Pillar | What to Capture |
|--------|-----------------|
| **Tracing** | Full reasoning chain: input → thought → action → observation → output. Replay any agent decision path. |
| **Metrics** | Token usage, latency per turn, tool call success/failure rates, queue depth, session count. |
| **Logging** | Append-only transcripts serve as structured logs. Every tool call, LLM response, and state transition is recorded. |

### Evaluation Framework

Adopt a tiered evaluation strategy:

| Tier | Scope | Cadence |
|------|-------|---------|
| **PR gates** | Deterministic checks (schema validation, unit tests) | Every commit |
| **Nightly regression** | LLM-as-judge evaluation on benchmark tasks | Daily |
| **Production monitoring** | Live metrics, anomaly detection, user feedback | Continuous |

### Key Metrics

- **Task completion rate**: % of tasks successfully completed end-to-end
- **Tool selection accuracy**: Did the agent pick the right tool?
- **Parameter accuracy**: Were tool parameters correct?
- **Turns to completion**: How many loop iterations to reach the answer?
- **Cost per task**: Total token spend per completed task
- **Error rate by category**: Transient vs. tool vs. LLM vs. state errors

---

## 14. Pattern Selection Guide

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

## 15. References

### Primary Sources

- [OpenClaw Architecture Part 1: Control Flow](https://theagentstack.substack.com/p/openclaw-architecture-part-1-control) — Hub-and-spoke Gateway architecture, input model, session isolation, protocol design
- [OpenClaw Architecture Part 2: Concurrency](https://theagentstack.substack.com/p/openclaw-architecture-part-2-concurrency) — Two-stage queue model, steering, deduplication, transport safety

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
