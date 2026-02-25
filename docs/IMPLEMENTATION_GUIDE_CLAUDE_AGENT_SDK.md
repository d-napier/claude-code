# Building an Autonomous Agent System with the Claude Agent SDK

> A practical implementation guide for building the architecture described in
> [AUTONOMOUS_AGENT_DESIGN.md](./AUTONOMOUS_AGENT_DESIGN.md) using the
> `@anthropic-ai/claude-agent-sdk` TypeScript package. See also the
> [Frontend Design](./FRONTEND_DESIGN.md) for the management console UI.

---

## Table of Contents

1. [SDK Overview & Mental Model](#1-sdk-overview--mental-model)
2. [Project Structure](#2-project-structure)
3. [The Agent Runtime Loop](#3-the-agent-runtime-loop)
4. [Multi-Turn Sessions](#4-multi-turn-sessions)
5. [Hierarchical Memory via CLAUDE.md](#5-hierarchical-memory-via-claudemd)
6. [Concurrency & Group Queue](#6-concurrency--group-queue)
7. [Tool Configuration & MCP Servers](#7-tool-configuration--mcp-servers)
8. [Subagents & Multi-Agent Orchestration](#8-subagents--multi-agent-orchestration)
9. [Hooks — Intercepting Agent Behavior](#9-hooks--intercepting-agent-behavior)
10. [Input Sources & Autonomy](#10-input-sources--autonomy)
11. [Container Isolation (Optional)](#11-container-isolation-optional)
12. [File-Based IPC](#12-file-based-ipc)
13. [Security Implementation](#13-security-implementation)
14. [Error Handling & Recovery](#14-error-handling--recovery)
15. [Observability & Logging](#15-observability--logging)
16. [Structured Output](#16-structured-output)
17. [Full System Wiring](#17-full-system-wiring)
18. [SDK API Quick Reference](#18-sdk-api-quick-reference)

---

## 1. SDK Overview & Mental Model

The Claude Agent SDK wraps a CLI subprocess that runs an internal recursive async
generator (`EZ()`). Your code communicates with it via JSON-lines over stdin/stdout.

```
Your Code
  │
  │  query({ prompt, options })
  ▼
┌─────────────────────────────────┐
│  SDK Layer (sdk.mjs)            │
│  Spawns CLI subprocess          │
│  Returns AsyncGenerator<Msg>    │
└────────────┬────────────────────┘
             │ stdin/stdout (JSON-lines)
             ▼
┌─────────────────────────────────┐
│  CLI Layer (cli.js)             │
│  EZ() recursive generator       │
│  Tool execution                 │
│  Anthropic API calls            │
└─────────────────────────────────┘
```

**Key insight**: The SDK handles the full ReAct loop internally. You don't implement
tool execution — the SDK does. Your job is to configure what tools are available,
set permissions, define hooks, and consume the message stream.

### Two API Surfaces

| API | Stability | Best For |
|-----|-----------|----------|
| **V1**: `query()` | Stable | Single-turn, batch, cron tasks, and multi-turn via `resume` |
| **V2**: `createSession()` + `send()`/`stream()` | Preview (`unstable_`) | Multi-turn interactive sessions with explicit turn control |

V1 and V2 serve different use cases. **V1 `query()`** is the primary API for this
system. It handles one turn per call and supports multi-turn conversations through
the `resume: sessionId` option — each call resumes the same persisted transcript.
**V2 `createSession()`** provides a stateful session object with explicit
`send()`/`stream()` methods for sequential turn-taking; it is preview-stability and
suited for interactive agent shells where the caller directly controls when each
turn fires.

The primary execution model in this guide is in-process V1 `query()`.

---

## 2. Project Structure

```
autonomous-agent/
├── src/
│   ├── index.ts              # Orchestrator — message loop, startup, shutdown
│   ├── config.ts             # Configuration constants and env loading
│   ├── agent-runner.ts       # Wraps SDK query() calls
│   ├── group-queue.ts        # Per-group concurrency with global cap
│   ├── scheduler.ts          # Cron/interval/one-time task scheduling
│   ├── ipc.ts                # File-based IPC watcher and authorization
│   ├── router.ts             # Message routing and channel abstraction
│   ├── db.ts                 # SQLite — messages, sessions, tasks, state
│   ├── memory.ts             # Hierarchical CLAUDE.md management
│   ├── hooks/
│   │   ├── security.ts       # PreToolUse: block dangerous ops
│   │   ├── audit.ts          # PostToolUse: log all actions
│   │   ├── secrets.ts        # PreToolUse: sanitize credentials
│   │   └── compact.ts        # PreCompact: archive transcripts
│   ├── channels/
│   │   ├── types.ts          # Channel interface
│   │   ├── whatsapp.ts       # WhatsApp via baileys
│   │   ├── telegram.ts       # Telegram via grammy
│   │   └── slack.ts          # Slack via bolt
│   └── tools/
│       └── mcp-server.ts     # Custom MCP tools (send_message, schedule_task)
├── groups/
│   ├── global/CLAUDE.md      # Global memory (shared, admin-writable)
│   └── {name}/CLAUDE.md      # Per-group memory
├── data/
│   ├── sessions/             # SDK transcript persistence (via resume)
│   ├── ipc/                  # File-based IPC directories
│   └── dead-letter/          # Failed messages after max retries
├── container/                # Optional: container isolation mode
│   ├── Dockerfile
│   └── agent-runner/
├── .claude/
│   ├── settings.json         # Project-level SDK settings
│   └── CLAUDE.md             # Project instructions
├── package.json
└── tsconfig.json
```

---

## 3. The Agent Runtime Loop

The SDK runs the ReAct loop internally. Your wrapper function configures it and
consumes the message stream.

### V1: query() — The Primary API

`query()` is used for all agent invocations in this system, both single-turn batch
tasks and multi-turn conversations (via `resume`). One call to `query()` equals one
turn. The SDK's internal ReAct loop handles tool calls within that turn; your code
resumes the session for the next turn by calling `query()` again with the same
`sessionId`.

```typescript
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";

interface AgentResult {
  text: string;
  sessionId: string;
  cost: number;
}

async function runAgent(
  prompt: string,
  groupFolder: string,
  sessionId?: string,
  abortController?: AbortController
): Promise<AgentResult> {
  const q = query({
    prompt,
    options: {
      // Resume prior conversation if session exists
      resume: sessionId,

      // Model and budget controls
      // top-level options.model uses full model IDs
      model: "claude-sonnet-4-6",
      maxTurns: 50,
      maxBudgetUsd: 2.0,

      // Tool configuration
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep",
                      "WebSearch", "WebFetch", "Task"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,

      // Load CLAUDE.md from group directory and parents
      settingSources: ["project"],
      cwd: `./groups/${groupFolder}`,

      // System prompt
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: "You are a helpful assistant. Respond concisely."
      },

      // Custom MCP server for IPC tools
      mcpServers: {
        agent: createAgentMcpServer(groupFolder)
      },

      // Hooks for security and observability
      hooks: buildHooks(groupFolder),

      // Sandbox for bash safety
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: true
      },

      // Subagent definitions
      agents: {
        researcher: {
          description: "Research agent for web search and analysis",
          prompt: "You are a research specialist. Search the web and analyze findings.",
          tools: ["WebSearch", "WebFetch", "Read", "Glob", "Grep"],
          // AgentDefinition.model uses aliases: "sonnet", "opus", "haiku", "inherit"
          model: "haiku"
        },
        coder: {
          description: "Coding agent for implementation tasks",
          prompt: "You are an expert programmer. Write clean, tested code.",
          tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
          model: "sonnet"
        }
      },

      abortController
    }
  });

  let result: AgentResult = { text: "", sessionId: "", cost: 0 };

  for await (const msg of q) {
    switch (msg.type) {
      case "system":
        if (msg.subtype === "init") {
          result.sessionId = msg.session_id;
        }
        break;

      case "assistant":
        // Stream text blocks to the user in real-time
        for (const block of msg.message.content) {
          if (block.type === "text") {
            onOutput?.(block.text);
          }
        }
        break;

      case "result":
        result.cost = msg.total_cost_usd;
        if (msg.subtype === "success") {
          result.text = msg.result;
        } else {
          result.text = `Error: ${msg.subtype} — ${msg.errors?.join(", ")}`;
        }
        break;
    }
  }

  return result;
}
```

### Termination Conditions (SDK-Managed)

| Condition | SDK Behavior |
|-----------|--------------|
| No tool calls in response | Agent stops naturally — `result.subtype = "success"` |
| `maxTurns` reached | `result.subtype = "error_max_turns"` |
| `maxBudgetUsd` exceeded | `result.subtype = "error_max_budget_usd"` |
| `abortController.abort()` | Agent interrupted |
| Stop hook returns `{ continue: true }` | Agent resumes (hook overrides natural stop) |

### Mapping SDK Results to Canonical Statuses

The design doc defines canonical `AgentStatus` and `SessionStatus` types (see
[AUTONOMOUS_AGENT_DESIGN.md §7](./AUTONOMOUS_AGENT_DESIGN.md)). Map SDK result
subtypes as follows:

| SDK `result.subtype` | `AgentStatus` | `SessionStatus` | `errorSubtype` |
|---------------------|---------------|-----------------|----------------|
| `"success"` | `"idle"` | `"completed"` | — |
| `"error_max_turns"` | `"error"` | `"error"` | `"max_turns"` |
| `"error_max_budget_usd"` | `"error"` | `"error"` | `"max_budget"` |
| `"error_during_execution"` | `"error"` | `"error"` | `"execution"` |
| `"error_max_structured_output_retries"` | `"error"` | `"error"` | `"structured_output"` |
| (abort + re-queue) | `"running"` | `"active"` | `"interrupted"` |
| (abort by user) | `"idle"` | `"completed"` | `"user_cancelled"` |
| (container hard timeout) | `"timeout"` | `"timeout"` | — |

While an agent is in the queue, its status is `"queued"`. While executing, it is
`"running"`. These are tracked by the orchestrator, not the SDK.

---

## 4. Multi-Turn Sessions

### Multi-Turn via V1 query() with resume (Primary Pattern)

The simplest multi-turn pattern uses V1 `query()` with `resume: sessionId`. Each
inbound message triggers a new `query()` call. The SDK restores the full conversation
transcript from the session store automatically.

```typescript
// Turn 1 — no sessionId yet
const turn1 = await runAgent("Analyze the codebase", groupFolder);
const sessionId = turn1.sessionId;

// Turn 2 — resume the same conversation
const turn2 = await runAgent("Now write the tests", groupFolder, sessionId);

// Turn 3 — same session continues
const turn3 = await runAgent("Run the tests and fix any failures", groupFolder, sessionId);
```

This is the pattern used by `GroupQueue`. Each dispatched message becomes one
`query()` call with `resume: sessionId`. The SDK's built-in transcript persistence
makes the conversation continuous from the model's perspective.

### V2: createSession() — Multi-Turn Interactive Sessions (Preview)

V2 provides an explicit session object with `send()`/`stream()` methods. Use it
when your application needs direct control over individual turns — for example, an
interactive agent shell where a human drives each turn.

**Important constraints:**
- Turn-taking is strictly sequential: call `send()`, then consume `stream()` to
  completion, then call `send()` again for the next turn.
- You **cannot** inject a new message into a running `stream()`. If a new message
  arrives while streaming, buffer it and dispatch it after the current stream
  finishes.
- V2 is preview stability (`unstable_` prefix). API may change.

```typescript
import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  type SDKMessage
} from "@anthropic-ai/claude-agent-sdk";

const opts = {
  // V2 session options do not take a top-level model — configure via AgentDefinition
  // or use the session's own model field if available
  cwd: `./groups/${groupFolder}`,
  settingSources: ["project"] as const,
  allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
  permissionMode: "bypassPermissions" as const,
  allowDangerouslySkipPermissions: true,
  mcpServers: { agent: createAgentMcpServer(groupFolder) },
  hooks: buildHooks(groupFolder)
};

const session = resumeId
  ? unstable_v2_resumeSession(resumeId, opts)
  : unstable_v2_createSession(opts);

async function sendTurn(
  message: string,
  onOutput: (text: string) => void
): Promise<string> {
  // 1. Send the user message
  await session.send(message);

  // 2. Consume the full stream for this turn before sending again
  let result = "";
  for await (const msg of session.stream()) {
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") onOutput(block.text);
      }
    }
    if (msg.type === "result" && msg.subtype === "success") {
      result = msg.result;
    }
  }
  return result;
}

// When done
session.close();
```

---

## 5. Hierarchical Memory via CLAUDE.md

The SDK automatically loads `CLAUDE.md` files when `settingSources: ["project"]` is
set and `systemPrompt.preset = "claude_code"`. This enables the hierarchical memory
model from the design doc.

### Directory Structure

```
groups/
├── global/
│   └── CLAUDE.md       # Global memory — shared facts, preferences
├── main/
│   └── CLAUDE.md       # Main channel memory — admin context
└── team-alpha/
    └── CLAUDE.md       # Group-specific memory — team context
```

### Automatic Loading

```typescript
const q = query({
  prompt: userMessage,
  options: {
    cwd: `./groups/${groupFolder}`,
    settingSources: ["project"],
    // Global memory loaded as additional directory
    additionalDirectories: ["./groups/global"],
    systemPrompt: {
      type: "preset",
      preset: "claude_code"  // Required to load CLAUDE.md
    }
  }
});
```

The SDK loads `CLAUDE.md` from:
1. The `cwd` directory (group-specific memory)
2. Parent directories walking up the tree
3. `additionalDirectories` (global memory)

> **Memory levels**: The design doc describes three memory levels: Global, Group,
> and Session. The first two are `CLAUDE.md` files loaded here. **Session-level
> memory** is the SDK's built-in transcript persistence, restored automatically
> when you pass `resume: sessionId`. It is not a third `CLAUDE.md` file. Session
> transcripts live in `data/sessions/{groupFolder}/.claude/`.
>
> **In-container mode**: `settingSources: ["project"]` causes the SDK to look for
> `.claude/settings.json` relative to `cwd`. When running inside a container,
> mount the project's `.claude/` directory into the container's working directory
> so settings are found correctly.

### Writing to Memory

The agent can update its own group memory by using the `Write` or `Edit` tools
on the `CLAUDE.md` file in its working directory. Global memory can only be written
by the main/admin group — enforce this via hooks:

```typescript
const protectGlobalMemory: HookCallback = async (input, toolUseID, { signal }) => {
  if (input.hook_event_name !== "PreToolUse") return {};
  const preInput = input as PreToolUseHookInput;

  const filePath = preInput.tool_input?.file_path as string;
  if (filePath?.includes("groups/global") && !isMainGroup) {
    return {
      hookSpecificOutput: {
        // Use a string literal, not input.hook_event_name, for type safety
        hookEventName: "PreToolUse" as const,
        permissionDecision: "deny",
        permissionDecisionReason: "Only the main group can modify global memory"
      }
    };
  }
  return {};
};
```

---

## 6. Concurrency & Group Queue

Implement the two-stage lane architecture from the design doc.

### Queue Modes

Three queue modes determine how a new message is handled when the group already
has an active `query()` running:

| Mode | Behavior | When to Use |
|------|----------|-------------|
| `collect` | Buffer new messages; batch them into a single prompt for the next `query()` call after current finishes | High-volume groups where individual messages aren't urgent |
| `followup` | Queue the new message; dispatch it as the next `query()` call after current finishes (FIFO) | Default for most groups |
| `interrupt` | Abort the current `query()` via `AbortController`; re-queue the interrupted message and the new message; dispatch a fresh `query()` | Urgent messages that must preempt current work |

A `debounceMs` config per group applies to `collect` mode: rapid messages arriving
within the debounce window are accumulated into the batch before dispatch.

### GroupQueue Implementation

```typescript
interface QueuedMessage {
  text: string;
  timestamp: number;
  id: string;
  retryCount: number;
}

interface GroupState {
  active: boolean;
  abortController?: AbortController;
  pendingMessages: QueuedMessage[];
  batchBuffer: QueuedMessage[];   // collect mode accumulation
  debounceTimer?: NodeJS.Timeout;
  sessionId?: string;
}

interface GroupConfig {
  queueMode: "collect" | "followup" | "interrupt";
  debounceMs: number;             // applies to collect mode; 0 = no debounce
  maxRetries: number;             // default 3
}

type DeadLetterEntry = {
  message: QueuedMessage;
  groupFolder: string;
  error: string;
  failedAt: string;
};

class GroupQueue {
  private groups = new Map<string, GroupState>();
  private configs = new Map<string, GroupConfig>();
  private activeCount = 0;
  private waitingGroups: string[] = [];
  private processFn?: (group: string, message: string, abort: AbortController) => Promise<void>;

  // Deduplication cache: key = "channel:groupFolder:messageId"
  private seenIds = new Map<string, number>();  // value = expiry timestamp
  private dedupeWindowMs = 30_000;

  constructor(private maxConcurrent: number = 5) {}

  setProcessFn(fn: (group: string, message: string, abort: AbortController) => Promise<void>) {
    this.processFn = fn;
  }

  setGroupConfig(groupFolder: string, config: GroupConfig) {
    this.configs.set(groupFolder, config);
  }

  private getConfig(groupFolder: string): GroupConfig {
    return this.configs.get(groupFolder) ?? {
      queueMode: "followup",
      debounceMs: 0,
      maxRetries: 3
    };
  }

  /** Call with a channel-scoped dedup key to prevent duplicate processing. */
  async enqueue(groupFolder: string, message: string, dedupKey?: string) {
    // Deduplication — prevent polling overlap from reprocessing the same message
    if (dedupKey) {
      const now = Date.now();
      // Prune expired entries
      for (const [k, exp] of this.seenIds) {
        if (exp < now) this.seenIds.delete(k);
      }
      const key = `${groupFolder}:${dedupKey}`;
      if (this.seenIds.has(key)) return;
      this.seenIds.set(key, now + this.dedupeWindowMs);
    }

    const state = this.getOrCreateState(groupFolder);
    const queued: QueuedMessage = {
      text: message,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      retryCount: 0
    };

    if (state.active) {
      await this.pipeToActiveSession(groupFolder, state, queued);
      return;
    }

    if (this.activeCount >= this.maxConcurrent) {
      state.pendingMessages.push(queued);
      if (!this.waitingGroups.includes(groupFolder)) {
        this.waitingGroups.push(groupFolder);
      }
      return;
    }

    await this.execute(groupFolder, queued);
  }

  private async pipeToActiveSession(
    groupFolder: string,
    state: GroupState,
    queued: QueuedMessage
  ) {
    const config = this.getConfig(groupFolder);

    switch (config.queueMode) {
      case "collect": {
        // Accumulate into batch buffer; dispatch when debounce settles
        state.batchBuffer.push(queued);
        if (config.debounceMs > 0) {
          if (state.debounceTimer) clearTimeout(state.debounceTimer);
          state.debounceTimer = setTimeout(() => {
            // Batch will be picked up by drainWaiting after active run finishes
          }, config.debounceMs);
        }
        break;
      }

      case "followup": {
        state.pendingMessages.push(queued);
        break;
      }

      case "interrupt": {
        // Abort current run
        state.abortController?.abort();
        // The execute() finally block will drain waitingGroups;
        // re-queue both the interrupted batch and the new message
        const requeue = [...state.pendingMessages, queued];
        state.pendingMessages = requeue;
        break;
      }
    }
  }

  private async execute(groupFolder: string, queued: QueuedMessage) {
    const state = this.getOrCreateState(groupFolder);
    const config = this.getConfig(groupFolder);

    state.active = true;
    const abort = new AbortController();
    state.abortController = abort;
    this.activeCount++;

    try {
      await this.processFn?.(groupFolder, queued.text, abort);
    } catch (error) {
      if (queued.retryCount < config.maxRetries) {
        // Retry within the same execution context — sequential, not deferred
        queued.retryCount++;
        state.active = false;
        state.abortController = undefined;
        this.activeCount--;
        await this.execute(groupFolder, queued);
        return;
      } else {
        // Max retries exceeded — move to dead-letter store
        await this.writeDeadLetter(groupFolder, queued, String(error));
      }
    } finally {
      state.active = false;
      state.abortController = undefined;
      this.activeCount--;

      // Drain collect buffer into pending queue
      if (state.batchBuffer.length > 0) {
        const batchText = state.batchBuffer.map(m => m.text).join("\n\n---\n\n");
        state.batchBuffer = [];
        state.pendingMessages.unshift({
          text: batchText,
          timestamp: Date.now(),
          id: `batch-${Date.now()}`,
          retryCount: 0
        });
      }

      this.drainWaiting();
    }
  }

  private drainWaiting() {
    // First, drain pending messages for groups that were already active
    for (const [groupFolder, state] of this.groups) {
      if (!state.active && state.pendingMessages.length > 0 &&
          this.activeCount < this.maxConcurrent) {
        const next = state.pendingMessages.shift()!;
        this.execute(groupFolder, next);
      }
    }

    // Then, pick up groups that were waiting for capacity
    while (this.waitingGroups.length > 0 && this.activeCount < this.maxConcurrent) {
      const next = this.waitingGroups.shift()!;
      const state = this.groups.get(next);
      if (state?.pendingMessages.length) {
        const msg = state.pendingMessages.shift()!;
        this.execute(next, msg);
      }
    }
  }

  private async writeDeadLetter(
    groupFolder: string,
    message: QueuedMessage,
    error: string
  ) {
    const entry: DeadLetterEntry = {
      message,
      groupFolder,
      error,
      failedAt: new Date().toISOString()
    };
    const filename = `${Date.now()}-${message.id}.json`;
    await fs.promises.writeFile(
      `./data/dead-letter/${filename}`,
      JSON.stringify(entry, null, 2)
    );
  }

  /** Graceful shutdown: wait for active runs or abort after timeoutMs. */
  async shutdown(timeoutMs: number = 10_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    // Wait for all active runs to finish
    while (this.activeCount > 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Abort any still-running agents
    if (this.activeCount > 0) {
      for (const state of this.groups.values()) {
        state.abortController?.abort();
      }
    }

    // Drain remaining pending messages to dead-letter store
    for (const [groupFolder, state] of this.groups) {
      for (const msg of [...state.pendingMessages, ...state.batchBuffer]) {
        await this.writeDeadLetter(groupFolder, msg, "shutdown");
      }
    }
  }

  private getOrCreateState(groupFolder: string): GroupState {
    if (!this.groups.has(groupFolder)) {
      this.groups.set(groupFolder, {
        active: false,
        pendingMessages: [],
        batchBuffer: []
      });
    }
    return this.groups.get(groupFolder)!;
  }
}
```

### DM Scope: Per-Peer Session Isolation

When a message arrives from a private (direct) chat, use a session ID that encodes
the peer identifier. This gives each private conversation its own transcript,
separate from the group's shared session:

```typescript
function resolveSessionId(
  groupFolder: string,
  messageContext: { isDm: boolean; peerId?: string },
  storedSessionId?: string
): string | undefined {
  if (messageContext.isDm && messageContext.peerId) {
    // Each DM peer gets its own session: "groupFolder:dm:peerId"
    return `${groupFolder}:dm:${messageContext.peerId}`;
  }
  return storedSessionId;
}
```

Pass the resolved session ID as `resume` to `query()`. The SDK persists the
transcript under that ID automatically.

---

## 7. Tool Configuration & MCP Servers

### Built-in Tools

The SDK provides these tools out of the box — no implementation required:

| Tool | Purpose | Risk |
|------|---------|------|
| `Read` | Read files | Low |
| `Write` | Create files | Medium |
| `Edit` | Modify files | Medium |
| `Bash` | Execute shell commands | High (sandbox recommended) |
| `Glob` | Find files by pattern | Low |
| `Grep` | Search file contents | Low |
| `WebSearch` | Web search | Low |
| `WebFetch` | Fetch URLs | Low |
| `Task` | Spawn subagents | Medium |
| `TodoWrite` | Track task progress | Low |

### Custom MCP Server for IPC

Use `createSdkMcpServer()` and `tool()` to define custom tools. The tool handler
receives `(args, extra: unknown)` — always include the `extra` parameter:

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

function createAgentMcpServer(groupFolder: string, isMain: boolean) {
  const sendMessage = tool(
    "send_message",
    "Send a message to a user or group chat",
    {
      chatId: z.string().describe("Target chat identifier"),
      text: z.string().describe("Message text to send")
    },
    async ({ chatId, text }, extra: unknown) => {
      // Authorization: non-main groups can only send to their own chat
      if (!isMain && chatId !== groupFolder) {
        return {
          content: [{ type: "text", text: "Unauthorized: can only send to own chat" }],
          isError: true
        };
      }
      await routeOutbound(chatId, text);
      return { content: [{ type: "text", text: "Message sent" }] };
    }
  );

  const scheduleTask = tool(
    "schedule_task",
    "Schedule a recurring or one-time task",
    {
      prompt: z.string().describe("Task prompt for the agent"),
      scheduleType: z.enum(["cron", "interval", "once"]),
      scheduleValue: z.string().describe("Cron expression, ms interval, or ISO timestamp"),
      targetGroup: z.string().optional().describe("Target group (main only)")
    },
    async ({ prompt, scheduleType, scheduleValue, targetGroup }, extra: unknown) => {
      const target = isMain ? (targetGroup ?? groupFolder) : groupFolder;
      const taskId = await db.createTask({
        prompt, scheduleType, scheduleValue,
        groupFolder: target, status: "active"
      });
      return { content: [{ type: "text", text: `Task ${taskId} scheduled` }] };
    }
  );

  const listTasks = tool(
    "list_tasks",
    "List scheduled tasks",
    {},
    async (_args, extra: unknown) => {
      const tasks = isMain
        ? await db.getAllTasks()
        : await db.getTasksByGroup(groupFolder);
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }]
      };
    }
  );

  const pauseTask = tool(
    "pause_task",
    "Pause a scheduled task",
    { taskId: z.string().describe("Task ID to pause") },
    async ({ taskId }, extra: unknown) => {
      const task = await db.getTask(taskId);
      if (!isMain && task?.groupFolder !== groupFolder) {
        return { content: [{ type: "text", text: "Unauthorized" }], isError: true };
      }
      await db.setTaskStatus(taskId, "paused");
      return { content: [{ type: "text", text: `Task ${taskId} paused` }] };
    }
  );

  const resumeTask = tool(
    "resume_task",
    "Resume a paused task",
    { taskId: z.string().describe("Task ID to resume") },
    async ({ taskId }, extra: unknown) => {
      const task = await db.getTask(taskId);
      if (!isMain && task?.groupFolder !== groupFolder) {
        return { content: [{ type: "text", text: "Unauthorized" }], isError: true };
      }
      await db.setTaskStatus(taskId, "active");
      return { content: [{ type: "text", text: `Task ${taskId} resumed` }] };
    }
  );

  const cancelTask = tool(
    "cancel_task",
    "Delete a scheduled task",
    { taskId: z.string().describe("Task ID to cancel") },
    async ({ taskId }, extra: unknown) => {
      const task = await db.getTask(taskId);
      if (!isMain && task?.groupFolder !== groupFolder) {
        return { content: [{ type: "text", text: "Unauthorized" }], isError: true };
      }
      await db.deleteTask(taskId);
      return { content: [{ type: "text", text: `Task ${taskId} cancelled` }] };
    }
  );

  return createSdkMcpServer({
    name: "agent",
    version: "1.0.0",
    tools: [sendMessage, scheduleTask, listTasks, pauseTask, resumeTask, cancelTask]
  });
}
```

### External MCP Servers

Connect to external services via stdio, SSE, or HTTP MCP servers:

```typescript
const options = {
  mcpServers: {
    // In-process SDK server (custom tools)
    agent: createAgentMcpServer(groupFolder, isMain),

    // Stdio subprocess (e.g., Playwright for browser automation)
    playwright: {
      command: "npx",
      args: ["@playwright/mcp@latest"]
    },

    // Remote HTTP server (e.g., database access)
    database: {
      type: "http" as const,
      url: "https://mcp.internal.example.com/db",
      headers: { Authorization: `Bearer ${dbToken}` }
    }
  }
};
```

---

## 8. Subagents & Multi-Agent Orchestration

### Programmatic Subagents (AgentDefinition)

Define specialized agents that the main agent can invoke via the `Task` tool.
Note that `AgentDefinition.model` accepts **aliases** (`"sonnet"`, `"opus"`,
`"haiku"`, `"inherit"`), not full model IDs. Full model IDs are only used in
the top-level `options.model`:

```typescript
const agents: Record<string, AgentDefinition> = {
  researcher: {
    description: "Research agent for gathering information from web and codebase",
    prompt: `You are a research specialist. Search the web, read files, and
             synthesize findings into clear summaries. Never modify files.`,
    tools: ["WebSearch", "WebFetch", "Read", "Glob", "Grep"],
    model: "haiku"      // alias — fast, cheap model for research
  },

  coder: {
    description: "Coding agent for writing and modifying code",
    prompt: `You are an expert software engineer. Write clean, well-tested code.
             Follow existing project conventions. Run tests after changes.`,
    tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    model: "sonnet"     // alias — balanced model for coding
  },

  reviewer: {
    description: "Code review agent for quality and security analysis",
    prompt: `You are a senior code reviewer. Analyze code for bugs, security
             vulnerabilities, and style issues. Never modify files directly.`,
    tools: ["Read", "Glob", "Grep"],
    model: "opus"       // alias — most capable model for deep analysis
  }
};
```

### Orchestration Patterns with Subagents

The main agent uses the `Task` tool to delegate. Subagent completion is handled by
consuming the subagent's own `query()` stream to completion — the SDK manages this
internally when the `Task` tool is invoked. Include `Task` in `allowedTools`:

```typescript
const q = query({
  prompt: `You are a tech lead. Break this task into subtasks and delegate:
           "${userRequest}"
           Use the researcher agent for information gathering,
           the coder agent for implementation, and the reviewer for quality checks.`,
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Task", "TodoWrite"],
    agents,
    maxTurns: 100,
    maxBudgetUsd: 10.0
  }
});
```

---

## 9. Hooks — Intercepting Agent Behavior

Hooks are the primary mechanism for security, observability, and control.

### Building a Hook Configuration

```typescript
import type { HookCallback, PreToolUseHookInput, PostToolUseHookInput,
              HookCallbackMatcher } from "@anthropic-ai/claude-agent-sdk";

function buildHooks(groupFolder: string, isMain: boolean = false) {
  return {
    PreToolUse: [
      // Block dangerous bash commands
      {
        matcher: "Bash",
        hooks: [blockDangerousCommands]
      },
      // Protect sensitive files
      {
        matcher: "Write|Edit",
        hooks: [protectSensitiveFiles(groupFolder, isMain)]
      },
      // Sanitize credentials from bash environment
      {
        matcher: "Bash",
        hooks: [sanitizeBashSecrets]
      }
    ] as HookCallbackMatcher[],

    PostToolUse: [
      // Audit all tool calls
      { hooks: [auditLogger(groupFolder)] }
    ] as HookCallbackMatcher[],

    PreCompact: [
      // Archive transcript before compaction
      { hooks: [archiveTranscript(groupFolder)] }
    ] as HookCallbackMatcher[],

    Stop: [
      // Example: conditionally resume the agent
      { hooks: [conditionalResume(groupFolder)] }
    ] as HookCallbackMatcher[],

    SubagentStop: [
      // Track subagent completion
      { hooks: [logSubagentCompletion] }
    ] as HookCallbackMatcher[]
  };
}
```

### Security Hook: Block Dangerous Commands

```typescript
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,
  /mkfs\./,
  /dd\s+if=/,
  />\s*\/dev\/sd/,
  /chmod\s+-R\s+777/,
  /curl.*\|\s*(?:bash|sh)/
];

const blockDangerousCommands: HookCallback = async (input, _toolUseID, { signal }) => {
  const preInput = input as PreToolUseHookInput;
  const command = preInput.tool_input?.command as string;

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return {
        hookSpecificOutput: {
          // Use a string literal for type safety — not input.hook_event_name
          hookEventName: "PreToolUse" as const,
          permissionDecision: "deny",
          permissionDecisionReason: `Blocked dangerous command: ${command.slice(0, 80)}`
        }
      };
    }
  }
  return {};
};
```

### Stop Hook: Conditional Resume

The Stop hook fires when the agent reaches a natural stopping point. Return
`{ continue: true }` to resume the agent (override the stop); return `{}` or
`{ continue: false }` to allow it to stop normally. Do not use the Stop hook
to save session state — the SDK persists transcripts automatically.

```typescript
function conditionalResume(groupFolder: string): HookCallback {
  return async (input, _toolUseID, { signal }) => {
    // Check if there's follow-up work pending
    const hasPendingWork = await checkPendingWork(groupFolder);
    if (hasPendingWork) {
      // Resume the agent with additional context
      return { continue: true };
    }
    // Allow normal stop
    return {};
  };
}
```

### Audit Hook: Log All Tool Calls

```typescript
function auditLogger(groupFolder: string): HookCallback {
  return async (input, toolUseID, { signal }) => {
    const postInput = input as PostToolUseHookInput;
    const entry = {
      timestamp: new Date().toISOString(),
      group: groupFolder,
      tool: postInput.tool_name,
      toolUseId: toolUseID,
      input: JSON.stringify(postInput.tool_input).slice(0, 500),
      sessionId: input.session_id
    };

    await fs.promises.appendFile(
      `./groups/${groupFolder}/logs/audit.jsonl`,
      JSON.stringify(entry) + "\n"
    );
    return {};
  };
}
```

### Transcript Archival Hook

```typescript
function archiveTranscript(groupFolder: string): HookCallback {
  return async (input, _toolUseID, { signal }) => {
    const transcriptPath = input.transcript_path;
    const archivePath = `./groups/${groupFolder}/conversations/${Date.now()}.md`;

    const content = await fs.promises.readFile(transcriptPath, "utf-8");
    const lines = content.trim().split("\n").map(l => JSON.parse(l));
    const markdown = lines
      .filter(l => l.type === "assistant" || l.type === "user")
      .map(l => `**${l.type}**: ${l.message?.content?.[0]?.text ?? ""}`)
      .join("\n\n");

    await fs.promises.writeFile(archivePath, markdown);
    return {};
  };
}
```

---

## 10. Input Sources & Autonomy

All five input types feed into `GroupQueue.enqueue()` → `runAgent()`.

### Message Loop (Polling)

```typescript
async function startMessageLoop(
  channels: Channel[],
  queue: GroupQueue,
  pollInterval: number = 2000
) {
  while (!shuttingDown) {
    for (const channel of channels) {
      const messages = await channel.getNewMessages();
      for (const msg of messages) {
        const group = findRegisteredGroup(msg.chatId);
        if (!group) continue;

        // Trigger pattern check (non-main groups)
        if (!group.isMain && !TRIGGER_PATTERN.test(msg.text)) continue;

        // Dedup key prevents reprocessing on polling overlap
        const dedupKey = `${channel.name}:${msg.messageId}`;

        // Resolve session ID — per-peer for DMs
        const sessionId = resolveSessionId(group.folder, {
          isDm: msg.isDm,
          peerId: msg.peerId
        }, group.sessionId);

        await queue.enqueue(group.folder, formatMessage(msg), dedupKey);
      }
    }
    await sleep(pollInterval);
  }
}
```

### Scheduler (Cron / Interval / One-Time)

```typescript
import { CronExpressionParser } from "cron-parser";

async function startSchedulerLoop(queue: GroupQueue, pollInterval: number = 60_000) {
  while (!shuttingDown) {
    const dueTasks = await db.getDueTasks();

    for (const task of dueTasks) {
      await queue.enqueue(task.groupFolder, task.prompt);

      if (task.scheduleType === "cron") {
        const interval = CronExpressionParser.parse(task.scheduleValue);
        await db.updateNextRun(task.id, interval.next().toISOString());
      } else if (task.scheduleType === "interval") {
        const nextRun = new Date(Date.now() + parseInt(task.scheduleValue));
        await db.updateNextRun(task.id, nextRun.toISOString());
      } else {
        await db.setTaskStatus(task.id, "completed");
      }
    }

    await sleep(pollInterval);
  }
}
```

### Heartbeat

```typescript
async function startHeartbeatLoop(
  queue: GroupQueue,
  registeredGroups: Map<string, Group>,
  intervalMs: number = 30 * 60 * 1000
) {
  while (!shuttingDown) {
    for (const [folder] of registeredGroups) {
      await queue.enqueue(folder,
        "HEARTBEAT: Check if there is any pending work or proactive action needed. " +
        "If nothing needs attention, respond with HEARTBEAT_OK."
      );
    }
    await sleep(intervalMs);
  }
}
```

### Webhook Endpoint

The webhook server verifies HMAC signatures before enqueuing. Each group has its
own webhook secret configured in the database:

```typescript
import { createServer } from "http";
import { createHmac, timingSafeEqual } from "crypto";

function startWebhookServer(queue: GroupQueue, port: number = 3000) {
  const server = createServer(async (req, res) => {
    if (req.method === "POST" && req.url?.startsWith("/webhook/")) {
      const groupFolder = req.url.split("/webhook/")[1];
      const body = await readBody(req);

      // HMAC signature verification
      const secret = await db.getWebhookSecret(groupFolder);
      if (secret) {
        const signature = req.headers["x-webhook-signature"] as string;
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const expectedBuf = Buffer.from(`sha256=${expected}`);
        const actualBuf = Buffer.from(signature ?? "");
        if (actualBuf.length !== expectedBuf.length ||
            !timingSafeEqual(actualBuf, expectedBuf)) {
          res.writeHead(401);
          res.end("Invalid signature");
          return;
        }
      }

      const payload = JSON.parse(body);
      await queue.enqueue(groupFolder,
        `WEBHOOK received: ${JSON.stringify(payload)}`
      );

      res.writeHead(200);
      res.end("OK");
    }
  });

  server.listen(port);
}
```

### Rate Limit Handling

The SDK handles 429 retries internally with backoff. At the orchestrator level:
- Set `maxConcurrent` below the API's concurrent request limit to avoid saturating
  the rate limit in the first place.
- Track cumulative cost from `cost_usd` fields in `SDKResultMessage` to enforce
  a budget cap at the application layer before the SDK's `maxBudgetUsd` kicks in.

```typescript
let cumulativeCostUsd = 0;
const BUDGET_CAP_USD = 50.0;

// In your result message handler:
if (msg.type === "result") {
  cumulativeCostUsd += msg.total_cost_usd;
  if (cumulativeCostUsd > BUDGET_CAP_USD) {
    logger.warn("Global budget cap reached — pausing new dispatches");
    queue.pause();
  }
}
```

---

## 11. Container Isolation (Optional)

This section describes an optional hardened execution mode. The default and primary
model is in-process `query()` as shown in Section 3. Use container isolation when
you need strong OS-level isolation between agent invocations (e.g., multi-tenant
production deployments).

### Container Runner

The orchestrator spawns a container per agent invocation. The container runs a
minimal agent runner that invokes the SDK, then exits.

```typescript
import { spawn } from "child_process";

interface ContainerConfig {
  groupFolder: string;
  isMain: boolean;
  prompt: string;
  sessionId?: string;
  secrets: Record<string, string>;
  timeoutMs?: number;
}

async function runContainerAgent(config: ContainerConfig): Promise<AgentResult> {
  const mounts = buildMounts(config);
  const containerName = `agent-${config.groupFolder}-${Date.now()}`;

  const args = [
    "run", "-i", "--rm",
    "--name", containerName,
    "--user", "1000:1000",
    ...mounts.flatMap(m => ["-v", `${m.host}:${m.container}:${m.mode}`]),
    "agent-runner:latest"
  ];

  const proc = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });

  // Container timeout
  const timeoutMs = config.timeoutMs ?? 300_000;  // 5 minutes default
  const timer = setTimeout(() => {
    proc.kill("SIGKILL");
  }, timeoutMs);

  const input = {
    prompt: config.prompt,
    sessionId: config.sessionId,
    groupFolder: config.groupFolder,
    isMain: config.isMain,
    secrets: config.secrets
  };
  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();

  try {
    return await parseContainerOutput(proc.stdout);
  } finally {
    clearTimeout(timer);
  }
}

function buildMounts(config: ContainerConfig) {
  const mounts = [
    { host: `./groups/${config.groupFolder}`,   container: "/workspace/group",  mode: "rw" },
    { host: "./groups/global",                   container: "/workspace/global", mode: "ro" },
    { host: `./data/ipc/${config.groupFolder}`, container: "/workspace/ipc",    mode: "rw" },
    // Mount .claude/ into container cwd so settingSources: ["project"] finds settings
    { host: `./.claude`,                         container: "/workspace/.claude", mode: "ro" },
    { host: `./data/sessions/${config.groupFolder}/.claude`,
      container: "/home/node/.claude", mode: "rw" }
  ];

  if (config.isMain) {
    mounts.push({ host: ".", container: "/workspace/project", mode: "ro" });
  }

  return mounts;
}
```

### In-Container Agent Runner

```typescript
// container/agent-runner/src/index.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const input = JSON.parse(await readStdin());
const { prompt, sessionId, secrets, groupFolder, isMain } = input;

const sdkEnv = { ...process.env };
if (secrets.ANTHROPIC_API_KEY) sdkEnv.ANTHROPIC_API_KEY = secrets.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

const q = query({
  prompt,
  options: {
    resume: sessionId,
    cwd: "/workspace/group",
    env: sdkEnv,
    // settingSources: ["project"] will look for /workspace/group/.claude/settings.json
    // which is satisfied by the .claude/ mount in buildMounts()
    settingSources: ["project"],
    systemPrompt: { type: "preset", preset: "claude_code" },
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep",
                    "WebSearch", "WebFetch", "Task"],
    sandbox: { enabled: true, autoAllowBashIfSandboxed: true },
    hooks: {
      PreToolUse: [{
        matcher: "Bash",
        hooks: [createSanitizeBashHook(["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"])]
      }]
    }
  }
});

for await (const msg of q) {
  if (msg.type === "result") {
    process.stdout.write("---OUTPUT_START---\n");
    process.stdout.write(JSON.stringify({
      status: msg.subtype === "success" ? "success" : "error",
      result: msg.subtype === "success" ? msg.result : null,
      newSessionId: msg.session_id,
      error: msg.subtype !== "success" ? msg.errors?.join(", ") : undefined
    }));
    process.stdout.write("\n---OUTPUT_END---\n");
  }
}
```

---

## 12. File-Based IPC

Enable agents inside containers to communicate with the host orchestrator.

### IPC Directory Structure

```
data/ipc/{groupFolder}/
├── messages/          # Agent → Host: send messages to users
│   └── {timestamp}-{random}.json
├── tasks/             # Agent → Host: schedule/manage tasks
│   └── {timestamp}-{random}.json
├── input/             # Host → Agent: follow-up messages
│   └── {timestamp}-{random}.json
└── errors/            # Failed IPC files
```

### IPC Watcher (Host Side)

```typescript
async function startIpcWatcher(
  registeredGroups: Map<string, Group>,
  sendMessage: (chatId: string, text: string) => Promise<void>,
  pollInterval: number = 1000
) {
  while (!shuttingDown) {
    for (const [folder, group] of registeredGroups) {
      const ipcDir = `./data/ipc/${folder}`;

      const msgFiles = await glob(`${ipcDir}/messages/*.json`);
      for (const file of msgFiles) {
        try {
          const data = JSON.parse(await fs.promises.readFile(file, "utf-8"));

          if (!group.isMain && data.chatId !== group.chatJid) {
            throw new Error("Unauthorized: non-main group sending to foreign chat");
          }

          await sendMessage(data.chatId, data.text);
          await fs.promises.unlink(file);
        } catch (error) {
          await moveToErrors(file, folder);
        }
      }

      const taskFiles = await glob(`${ipcDir}/tasks/*.json`);
      for (const file of taskFiles) {
        try {
          const data = JSON.parse(await fs.promises.readFile(file, "utf-8"));
          await processTaskIpc(data, folder, group.isMain);
          await fs.promises.unlink(file);
        } catch (error) {
          await moveToErrors(file, folder);
        }
      }
    }

    await sleep(pollInterval);
  }
}
```

### Atomic File Writes

```typescript
async function writeIpcFile(dir: string, data: object): Promise<void> {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const filepath = path.join(dir, filename);
  const tmpPath = filepath + ".tmp";

  await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2));
  await fs.promises.rename(tmpPath, filepath);  // Atomic on same filesystem
}
```

---

## 13. Security Implementation

### Risk Levels

| Level | Tools | Default Behavior |
|-------|-------|-----------------|
| `low` | Read, Glob, Grep, WebSearch, TodoWrite | Auto-allow |
| `medium` | Write, Edit, Task, IPC tools | Auto-allow in containers |
| `medium-high` | Browser automation | Prompt operator in non-container mode |
| `high` | Bash, external APIs, deployments | Require approval in HITL mode |
| `critical` | `rm -rf`, force push, production deploys | Always require approval |

### Permission Modes

| Mode | When to Use |
|------|-------------|
| `"default"` | Interactive — requires `canUseTool` handler |
| `"acceptEdits"` | Auto-approve file edits, prompt for bash/network |
| `"bypassPermissions"` | Full autonomy (container-isolated agents) |
| `"plan"` | Planning only — no tool execution |

### canUseTool Handler

```typescript
const canUseTool: CanUseTool = async (toolName, input, { signal, suggestions }) => {
  if (["Read", "Glob", "Grep", "WebSearch"].includes(toolName)) {
    return { behavior: "allow", updatedInput: input };
  }

  if (["Write", "Edit"].includes(toolName)) {
    const filePath = (input as any).file_path as string;
    if (!filePath.startsWith("/workspace/")) {
      return { behavior: "deny", message: "Cannot write outside workspace" };
    }
    return { behavior: "allow", updatedInput: input };
  }

  if (toolName === "Bash") {
    return { behavior: "allow", updatedInput: input };
  }

  return { behavior: "deny", message: `Unknown tool: ${toolName}` };
};
```

### Secret Handling via Hooks

```typescript
function createSanitizeBashHook(secretVarNames: string[]): HookCallback {
  return async (input, _toolUseID, { signal }) => {
    const preInput = input as PreToolUseHookInput;
    const command = preInput.tool_input?.command as string;

    for (const varName of secretVarNames) {
      if (command.includes(`$${varName}`) || command.includes(`\${${varName}}`)) {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse" as const,
            permissionDecision: "deny",
            permissionDecisionReason: `Cannot access secret: ${varName}`
          }
        };
      }
    }
    return {};
  };
}
```

---

## 14. Error Handling & Recovery

### Cursor-Based Crash Recovery

```typescript
async function processGroupMessages(
  groupFolder: string,
  chatJid: string,
  queue: GroupQueue
) {
  const previousCursor = await db.getAgentCursor(groupFolder);
  const messages = await db.getMessagesSince(chatJid, previousCursor);

  if (messages.length === 0) return;

  const newCursor = messages[messages.length - 1].timestamp;
  await db.setAgentCursor(groupFolder, newCursor);

  let outputSentToUser = false;

  try {
    const result = await runAgent(
      formatMessages(messages),
      groupFolder,
      await db.getSessionId(groupFolder),
      (text) => {
        sendToUser(chatJid, text);
        outputSentToUser = true;
      }
    );

    await db.setSessionId(groupFolder, result.sessionId);
  } catch (error) {
    if (!outputSentToUser) {
      await db.setAgentCursor(groupFolder, previousCursor);
    }
    throw error;
  }
}
```

### Startup Recovery

```typescript
async function recoverPendingMessages(queue: GroupQueue) {
  const groups = await db.getAllRegisteredGroups();

  for (const group of groups) {
    const cursor = await db.getAgentCursor(group.folder);
    const pending = await db.getMessagesSince(group.chatJid, cursor);

    if (pending.length > 0) {
      console.log(`Recovering ${pending.length} messages for ${group.folder}`);
      await queue.enqueue(group.folder, formatMessages(pending));
    }
  }
}
```

---

## 15. Observability & Logging

### Message Stream Processing

```typescript
async function processWithObservability(
  q: AsyncGenerator<SDKMessage>,
  groupFolder: string
) {
  const metrics = {
    startTime: Date.now(),
    turns: 0,
    toolCalls: 0,
    cost: 0,
    errors: [] as string[]
  };

  for await (const msg of q) {
    switch (msg.type) {
      case "system":
        if (msg.subtype === "init") {
          logger.info({ group: groupFolder, model: msg.model }, "Session started");
        }
        break;

      case "assistant":
        metrics.turns++;
        const toolCalls = msg.message.content.filter(b => b.type === "tool_use");
        metrics.toolCalls += toolCalls.length;
        break;

      case "result":
        metrics.cost = msg.total_cost_usd;
        if (msg.subtype !== "success") {
          metrics.errors = msg.errors ?? [];
        }

        logger.info({
          group: groupFolder,
          duration: Date.now() - metrics.startTime,
          turns: metrics.turns,
          toolCalls: metrics.toolCalls,
          cost: metrics.cost,
          status: msg.subtype,
          errors: metrics.errors
        }, "Session completed");
        break;
    }
  }

  return metrics;
}
```

### Key Metrics to Track

```typescript
interface AgentMetrics {
  taskCompletionRate: number;       // success results / total results
  avgTurnsToCompletion: number;     // num_turns across sessions
  avgCostPerTask: number;           // total_cost_usd across sessions
  toolCallSuccessRate: number;      // PostToolUse / (PostToolUse + PostToolUseFailure)
  errorRateByCategory: {
    maxTurns: number;
    maxBudget: number;
    execution: number;
    structuredOutputRetries: number;
    timeout: number;
  };
  deadLetterCount: number;          // messages that exceeded max retries
  cumulativeCostUsd: number;        // global budget tracking
}
```

---

## 16. Structured Output

Use `outputFormat` to get typed JSON responses from agents:

```typescript
const q = query({
  prompt: "Analyze this codebase and return a structured report",
  options: {
    outputFormat: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          files_analyzed: { type: "number" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                file: { type: "string" },
                severity: { type: "string", enum: ["low", "medium", "high"] },
                description: { type: "string" }
              },
              required: ["file", "severity", "description"]
            }
          },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["summary", "files_analyzed", "issues", "recommendations"]
      }
    }
  }
});

for await (const msg of q) {
  if (msg.type === "result") {
    if (msg.subtype === "success") {
      const report = msg.structured_output as CodeAnalysisReport;
    } else if (msg.subtype === "error_max_structured_output_retries") {
      logger.error("Structured output schema validation failed after max retries");
    }
  }
}
```

---

## 17. Full System Wiring

### Main Orchestrator

```typescript
// src/index.ts
import { GroupQueue } from "./group-queue";
import { startMessageLoop } from "./message-loop";
import { startSchedulerLoop } from "./scheduler";
import { startIpcWatcher } from "./ipc";
import { startWebhookServer } from "./webhooks";
import { initDatabase } from "./db";
import { recoverPendingMessages } from "./recovery";

async function main() {
  // 1. Initialize
  const db = await initDatabase();
  const registeredGroups = await db.loadRegisteredGroups();
  const channels = await initChannels();

  // 2. Set up queue
  //    Per-group config (model, maxTurns, budget, tools, timeout, queueMode,
  //    debounceMs, mcpServers) is loaded from the database and mapped
  //    to SDK query() options by runAgent(). The frontend management console
  //    (FRONTEND_DESIGN.md) writes this config via PUT /api/agents/:folder.
  const queue = new GroupQueue(parseInt(process.env.MAX_CONCURRENT ?? "5"));

  // Load per-group queue configs from DB
  for (const [folder, group] of registeredGroups) {
    queue.setGroupConfig(folder, {
      queueMode: group.queueMode ?? "followup",
      debounceMs: group.debounceMs ?? 0,
      maxRetries: group.maxRetries ?? 3
    });
  }

  queue.setProcessFn(async (groupFolder, message, abort) => {
    const group = registeredGroups.get(groupFolder)!;
    const result = await runAgent(message, groupFolder, group.sessionId, abort);
    if (result.text) {
      await routeOutbound(group.chatJid, result.text);
    }
    group.sessionId = result.sessionId;
    await db.setSessionId(groupFolder, result.sessionId);
  });

  // 3. Recover from crash
  await recoverPendingMessages(queue);

  // 4. Start all input loops
  await Promise.all([
    startMessageLoop(channels, queue),
    startSchedulerLoop(queue),
    startIpcWatcher(registeredGroups, routeOutbound),
    startWebhookServer(queue, 3000)
  ]);
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  shuttingDown = true;
  await queue.shutdown(10_000);
  for (const ch of channels) await ch.disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch(console.error);
```

---

## 18. SDK API Quick Reference

### Imports

```typescript
import {
  // V1 API (stable)
  query,

  // V2 API (preview)
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  unstable_v2_prompt,

  // MCP helpers
  tool,
  createSdkMcpServer,

  // Types
  type SDKMessage,
  type SDKAssistantMessage,
  type SDKResultMessage,
  type SDKSystemMessage,
  type SDKUserMessage,
  type SDKPartialAssistantMessage,
  type Options,
  type Query,
  type AgentDefinition,
  type HookCallback,
  type HookCallbackMatcher,
  type HookEvent,
  type PreToolUseHookInput,
  type PostToolUseHookInput,
  type StopHookInput,
  type CanUseTool,
  type PermissionResult,
  type PermissionMode,
  type SandboxSettings,
  type McpServerConfig,
  type SettingSource,

  // Errors
  AbortError
} from "@anthropic-ai/claude-agent-sdk";
```

### query() Options Cheat Sheet

| Option | Type | Key Detail |
|--------|------|------------|
| `prompt` | `string` | The user message for this turn |
| `resume` | `string` | Session ID to resume (enables multi-turn via V1) |
| `model` | `string` | Full model ID: `"claude-opus-4-6"`, `"claude-sonnet-4-6"`, `"claude-haiku-4-5-20251001"` |
| `maxTurns` | `number` | Loop iteration cap |
| `maxBudgetUsd` | `number` | Cost cap in USD |
| `allowedTools` | `string[]` | Whitelist of tool names |
| `disallowedTools` | `string[]` | Blacklist of tool names |
| `permissionMode` | `PermissionMode` | `"default"`, `"acceptEdits"`, `"bypassPermissions"`, `"plan"` |
| `canUseTool` | `CanUseTool` | Custom permission handler |
| `agents` | `Record<string, AgentDefinition>` | Subagent definitions |
| `hooks` | `Record<HookEvent, HookCallbackMatcher[]>` | Lifecycle hooks |
| `mcpServers` | `Record<string, McpServerConfig>` | MCP server configs |
| `systemPrompt` | `string \| { type: "preset", preset: "claude_code", append?: string }` | System instructions |
| `settingSources` | `SettingSource[]` | `["project"]` to load CLAUDE.md |
| `cwd` | `string` | Working directory |
| `sandbox` | `SandboxSettings` | Bash sandboxing config |
| `outputFormat` | `{ type: "json_schema", schema: JSONSchema }` | Structured output |
| `betas` | `SdkBeta[]` | `["context-1m-2025-08-07"]` for 1M context |
| `abortController` | `AbortController` | Cancellation |
| `env` | `Dict<string>` | Environment variables |

### AgentDefinition Fields

| Field | Type | Key Detail |
|-------|------|------------|
| `description` | `string` | Shown to orchestrator agent when selecting |
| `prompt` | `string` | Subagent system prompt |
| `tools` | `string[]` | Allowed tools for this subagent |
| `model` | `string` | **Alias only**: `"sonnet"`, `"opus"`, `"haiku"`, `"inherit"` |

### SDKMessage Types

| Type | Subtype | When |
|------|---------|------|
| `system` | `init` | Session started — contains session_id, tools, model |
| `system` | `compact_boundary` | Transcript compacted |
| `assistant` | — | Claude's response (text + tool_use blocks) |
| `user` | — | Internal user message (output type, not input) |
| `result` | `success` | Agent completed — contains result, cost, usage |
| `result` | `error_max_turns` | Hit maxTurns limit |
| `result` | `error_max_budget_usd` | Hit cost limit |
| `result` | `error_during_execution` | Runtime error |
| `result` | `error_max_structured_output_retries` | JSON schema validation failed after retries |
| `stream_event` | — | Partial streaming (if `includePartialMessages: true`) |

### Hook Events

| Event | Trigger | Can Affect Execution? |
|-------|---------|----------------------|
| `PreToolUse` | Before tool execution | Yes — `permissionDecision: "deny"` blocks the tool |
| `PostToolUse` | After tool execution | No |
| `PostToolUseFailure` | Tool failed | No |
| `Stop` | Agent stopping naturally | Yes — `{ continue: true }` resumes the agent |
| `SessionStart` | Session initialized | No |
| `SessionEnd` | Session terminated | No |
| `SubagentStart` | Subagent spawned | No |
| `SubagentStop` | Subagent completed | No |
| `PreCompact` | Before transcript compaction | No |
| `UserPromptSubmit` | User prompt submitted | No |
| `Notification` | Status notification | No |
| `PermissionRequest` | Permission dialog | Yes |

---

*Document updated 2026-02-25. Based on `@anthropic-ai/claude-agent-sdk` v0.2.x.
Update as the SDK evolves — especially the V2 API when it stabilizes.*
