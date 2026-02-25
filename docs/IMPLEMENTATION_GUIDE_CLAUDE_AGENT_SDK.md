# Building an Autonomous Agent System with the Claude Agent SDK

> A practical implementation guide for building the architecture described in
> [AUTONOMOUS_AGENT_DESIGN.md](./AUTONOMOUS_AGENT_DESIGN.md) using the
> `@anthropic-ai/claude-agent-sdk` TypeScript package.

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
11. [Container Isolation](#11-container-isolation)
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
| **V1**: `query()` | Stable | Single-turn, batch, CI/CD, simple agents |
| **V2**: `createSession()` + `send()`/`stream()` | Preview (`unstable_`) | Multi-turn conversations, interactive agents |

Both use the identical CLI process and `EZ()` loop — zero behavioral difference.

---

## 2. Project Structure

```
autonomous-agent/
├── src/
│   ├── index.ts              # Orchestrator — message loop, startup, shutdown
│   ├── config.ts             # Configuration constants and env loading
│   ├── agent-runner.ts       # Wraps SDK query()/createSession() calls
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
├── container/
│   ├── Dockerfile            # Agent container image
│   └── agent-runner/         # In-container agent runner
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

### V1: query() — Single-Turn / Batch

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
  sessionId?: string
): Promise<AgentResult> {
  const q = query({
    prompt,
    options: {
      // Resume prior conversation if session exists
      resume: sessionId,

      // Model and budget controls
      model: "claude-sonnet-4-6",
      maxTurns: 50,
      maxBudgetUsd: 2.0,

      // Tool configuration
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep",
                      "WebSearch", "WebFetch", "Task"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,

      // Load CLAUDE.md from project and group directories
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
          model: "haiku"
        },
        coder: {
          description: "Coding agent for implementation tasks",
          prompt: "You are an expert programmer. Write clean, tested code.",
          tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
          model: "sonnet"
        }
      }
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
| Stop hook returns `{ continue: false }` | Agent stopped by hook |

---

## 4. Multi-Turn Sessions

For interactive agents that receive follow-up messages while running, use the V2
session API or V1 with `AsyncIterable` prompt.

### V2: createSession() + send()/stream()

```typescript
import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  type SDKMessage
} from "@anthropic-ai/claude-agent-sdk";

class AgentSession {
  private session: ReturnType<typeof unstable_v2_createSession>;
  public sessionId?: string;

  constructor(
    private groupFolder: string,
    resumeId?: string
  ) {
    const opts = {
      model: "claude-sonnet-4-6",
      cwd: `./groups/${groupFolder}`,
      settingSources: ["project"] as const,
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"],
      permissionMode: "bypassPermissions" as const,
      allowDangerouslySkipPermissions: true,
      mcpServers: { agent: createAgentMcpServer(groupFolder) },
      hooks: buildHooks(groupFolder)
    };

    this.session = resumeId
      ? unstable_v2_resumeSession(resumeId, opts)
      : unstable_v2_createSession(opts);
  }

  async sendAndStream(
    message: string,
    onOutput: (text: string) => void
  ): Promise<string> {
    await this.session.send(message);

    let result = "";
    for await (const msg of this.session.stream()) {
      this.sessionId ??= msg.session_id;

      if (msg.type === "assistant") {
        for (const block of msg.message.content) {
          if (block.type === "text") {
            onOutput(block.text);
          }
        }
      }
      if (msg.type === "result" && msg.subtype === "success") {
        result = msg.result;
      }
    }
    return result;
  }

  close() {
    this.session.close();
  }
}
```

### V1: AsyncIterable for Streaming Input

When you need to pipe follow-up messages into an already-running agent:

```typescript
import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

class MessageStream implements AsyncIterable<SDKUserMessage> {
  private queue: SDKUserMessage[] = [];
  private resolve?: () => void;
  private done = false;

  push(text: string) {
    const msg: SDKUserMessage = {
      type: "user",
      session_id: "",
      message: {
        role: "user",
        content: [{ type: "text", text }]
      },
      parent_tool_use_id: null
    };
    this.queue.push(msg);
    this.resolve?.();
  }

  end() {
    this.done = true;
    this.resolve?.();
  }

  async *[Symbol.asyncIterator]() {
    while (!this.done || this.queue.length > 0) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
      } else {
        await new Promise<void>(r => { this.resolve = r; });
      }
    }
  }
}

// Usage: pipe follow-up messages into the running agent
const stream = new MessageStream();
stream.push("Initial prompt: analyze the codebase");

const q = query({
  prompt: stream,  // AsyncIterable — keeps stdin open
  options: { /* ... */ }
});

// Later, pipe follow-up messages
stream.push("Also check for security vulnerabilities");

// When done, end the stream
stream.end();
```

**Critical**: Passing a string prompt sets `isSingleUserTurn = true`, which closes
stdin after the first result and kills running subagents. Always use `AsyncIterable`
when using agent teams or multi-turn interactions.

---

## 5. Hierarchical Memory via CLAUDE.md

The SDK automatically loads `CLAUDE.md` files when `settingSources: ["project"]` is set.
This enables the hierarchical memory model from the design doc.

### Directory Structure

```
groups/
├── global/
│   └── CLAUDE.md       # Global memory — shared facts, preferences
│                       # Loaded for ALL groups via additionalDirectories
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
2. Parent directories (walks up the tree)
3. `additionalDirectories` (global memory)

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
        hookEventName: input.hook_event_name,
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

### GroupQueue Implementation

```typescript
interface GroupState {
  active: boolean;
  pendingMessages: QueuedMessage[];
  pendingTasks: QueuedTask[];
  session?: AgentSession;
  retryCount: number;
}

class GroupQueue {
  private groups = new Map<string, GroupState>();
  private activeCount = 0;
  private waitingGroups: string[] = [];
  private processFn?: (group: string, message: string) => Promise<void>;

  constructor(private maxConcurrent: number = 5) {}

  setProcessFn(fn: (group: string, message: string) => Promise<void>) {
    this.processFn = fn;
  }

  async enqueue(groupFolder: string, message: string) {
    const state = this.getOrCreateState(groupFolder);

    if (state.active) {
      // Group already has an active agent — pipe via IPC or queue
      if (state.session) {
        // Pipe directly into running session
        await this.pipeToActiveSession(state, message);
      } else {
        state.pendingMessages.push({ text: message, timestamp: Date.now() });
      }
      return;
    }

    if (this.activeCount >= this.maxConcurrent) {
      // At capacity — queue the group
      state.pendingMessages.push({ text: message, timestamp: Date.now() });
      if (!this.waitingGroups.includes(groupFolder)) {
        this.waitingGroups.push(groupFolder);
      }
      return;
    }

    // Execute immediately
    await this.execute(groupFolder, message);
  }

  private async execute(groupFolder: string, message: string) {
    const state = this.getOrCreateState(groupFolder);
    state.active = true;
    this.activeCount++;

    try {
      await this.processFn?.(groupFolder, message);
      state.retryCount = 0;
    } catch (error) {
      // Exponential backoff retry
      if (state.retryCount < 5) {
        state.retryCount++;
        const delay = 5000 * Math.pow(2, state.retryCount - 1);
        setTimeout(() => this.execute(groupFolder, message), delay);
        return;
      }
    } finally {
      state.active = false;
      this.activeCount--;
      this.drainWaiting();
    }
  }

  private drainWaiting() {
    while (this.waitingGroups.length > 0 && this.activeCount < this.maxConcurrent) {
      const next = this.waitingGroups.shift()!;
      const state = this.groups.get(next);
      if (state?.pendingMessages.length) {
        const msg = state.pendingMessages.shift()!;
        this.execute(next, msg.text);
      }
    }
  }

  private getOrCreateState(groupFolder: string): GroupState {
    if (!this.groups.has(groupFolder)) {
      this.groups.set(groupFolder, {
        active: false,
        pendingMessages: [],
        pendingTasks: [],
        retryCount: 0
      });
    }
    return this.groups.get(groupFolder)!;
  }
}
```

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

Use `createSdkMcpServer()` and `tool()` to define custom tools:

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
    async ({ chatId, text }) => {
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
    async ({ prompt, scheduleType, scheduleValue, targetGroup }) => {
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
    async () => {
      const tasks = isMain
        ? await db.getAllTasks()
        : await db.getTasksByGroup(groupFolder);
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }]
      };
    }
  );

  return createSdkMcpServer({
    name: "agent",
    version: "1.0.0",
    tools: [sendMessage, scheduleTask, listTasks]
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

Define specialized agents that the main agent can invoke via the `Task` tool:

```typescript
const agents: Record<string, AgentDefinition> = {
  researcher: {
    description: "Research agent for gathering information from web and codebase",
    prompt: `You are a research specialist. Search the web, read files, and
             synthesize findings into clear summaries. Never modify files.`,
    tools: ["WebSearch", "WebFetch", "Read", "Glob", "Grep"],
    model: "haiku"  // Fast, cheap model for research
  },

  coder: {
    description: "Coding agent for writing and modifying code",
    prompt: `You are an expert software engineer. Write clean, well-tested code.
             Follow existing project conventions. Run tests after changes.`,
    tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    model: "sonnet"  // Balanced model for coding
  },

  reviewer: {
    description: "Code review agent for quality and security analysis",
    prompt: `You are a senior code reviewer. Analyze code for bugs, security
             vulnerabilities, and style issues. Never modify files directly.`,
    tools: ["Read", "Glob", "Grep"],
    model: "opus"  // Most capable model for deep analysis
  },

  planner: {
    description: "Planning agent for breaking down complex tasks",
    prompt: `You are a software architect. Break complex tasks into clear,
             actionable steps. Consider dependencies and risks.`,
    tools: ["Read", "Glob", "Grep", "WebSearch"],
    model: "sonnet"
  }
};
```

### Orchestration Patterns with Subagents

The main agent uses the `Task` tool to delegate. Include `Task` in `allowedTools`:

```typescript
// Supervisor pattern — main agent delegates to specialists
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

### Background Subagents

Subagents can run in the background. The SDK emits `task_notification` messages
when they complete:

```typescript
for await (const msg of q) {
  if (msg.type === "system" && msg.subtype === "task_notification") {
    // Background agent completed
    console.log(`Subagent finished: ${msg.agent_id}`);
  }
}
```

**Important**: For background subagents to work correctly, the prompt must be
an `AsyncIterable` (not a static string). A string prompt sets
`isSingleUserTurn = true`, which kills subagents after the first result.

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
      // Save state on agent stop
      { hooks: [saveSessionState(groupFolder)] }
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
          hookEventName: input.hook_event_name,
          permissionDecision: "deny",
          permissionDecisionReason: `Blocked dangerous command: ${command.slice(0, 80)}`
        }
      };
    }
  }
  return {};
};
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

    // Read JSONL transcript, convert to markdown
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

Implement the five input types from the design doc. All feed into the same
`GroupQueue.enqueue()` → `runAgent()` pipeline.

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

        await queue.enqueue(group.folder, formatMessage(msg));
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
      await queue.enqueueTask(task.groupFolder, task.prompt, task.id);

      // Schedule next run
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
  intervalMs: number = 30 * 60 * 1000  // 30 minutes
) {
  while (!shuttingDown) {
    for (const [folder, group] of registeredGroups) {
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

```typescript
import { createServer } from "http";

function startWebhookServer(queue: GroupQueue, port: number = 3000) {
  const server = createServer(async (req, res) => {
    if (req.method === "POST" && req.url?.startsWith("/webhook/")) {
      const groupFolder = req.url.split("/webhook/")[1];
      const body = await readBody(req);
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

---

## 11. Container Isolation

For production deployments, run each agent invocation inside an ephemeral container.

### Container Runner

```typescript
import { spawn } from "child_process";

interface ContainerConfig {
  groupFolder: string;
  isMain: boolean;
  prompt: string;
  sessionId?: string;
  secrets: Record<string, string>;
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

  // Inject secrets via stdin (never written to disk)
  const input = {
    prompt: config.prompt,
    sessionId: config.sessionId,
    groupFolder: config.groupFolder,
    isMain: config.isMain,
    secrets: config.secrets  // Stripped inside container after SDK init
  };
  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();

  // Parse marker-delimited output
  return parseContainerOutput(proc.stdout);
}

function buildMounts(config: ContainerConfig) {
  const mounts = [
    { host: `./groups/${config.groupFolder}`,    container: "/workspace/group",   mode: "rw" },
    { host: "./groups/global",                    container: "/workspace/global",  mode: "ro" },
    { host: `./data/ipc/${config.groupFolder}`,  container: "/workspace/ipc",     mode: "rw" },
    { host: `./data/sessions/${config.groupFolder}/.claude`,
      container: "/home/node/.claude", mode: "rw" }
  ];

  if (config.isMain) {
    mounts.push({ host: ".", container: "/workspace/project", mode: "ro" });
  }

  // Add validated extra mounts from external allowlist
  const extras = loadMountAllowlist();
  for (const extra of extras) {
    if (validateMount(extra, config.isMain)) {
      mounts.push(extra);
    }
  }

  return mounts;
}
```

### In-Container Agent Runner

Inside the container, the agent runner reads from stdin and invokes the SDK:

```typescript
// container/agent-runner/src/index.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const input = JSON.parse(await readStdin());
const { prompt, sessionId, secrets, groupFolder, isMain } = input;

// Set secrets in SDK env only (not process.env)
const sdkEnv = { ...process.env };
if (secrets.ANTHROPIC_API_KEY) sdkEnv.ANTHROPIC_API_KEY = secrets.ANTHROPIC_API_KEY;

// Strip secrets from subprocess environments
delete process.env.ANTHROPIC_API_KEY;

const q = query({
  prompt,
  options: {
    resume: sessionId,
    cwd: "/workspace/group",
    env: sdkEnv,
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
    // Write output using sentinel markers
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
│   ├── {timestamp}-{random}.json
│   └── _close         # Sentinel: signal shutdown
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

      // Process outbound messages
      const msgFiles = await glob(`${ipcDir}/messages/*.json`);
      for (const file of msgFiles) {
        try {
          const data = JSON.parse(await fs.promises.readFile(file, "utf-8"));

          // Authorization check
          if (!group.isMain && data.chatId !== group.chatJid) {
            throw new Error("Unauthorized: non-main group sending to foreign chat");
          }

          await sendMessage(data.chatId, data.text);
          await fs.promises.unlink(file);
        } catch (error) {
          // Move to errors directory
          await moveToErrors(file, folder);
        }
      }

      // Process task requests
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

### Permission Modes

| Mode | When to Use |
|------|-------------|
| `"default"` | Interactive — requires `canUseTool` handler |
| `"acceptEdits"` | Auto-approve file edits, prompt for bash/network |
| `"bypassPermissions"` | Full autonomy (container-isolated agents) |
| `"plan"` | Planning only — no tool execution |

### canUseTool Handler

For fine-grained permission control without bypassing all checks:

```typescript
const canUseTool: CanUseTool = async (toolName, input, { signal, suggestions }) => {
  // Always allow read-only tools
  if (["Read", "Glob", "Grep", "WebSearch"].includes(toolName)) {
    return { behavior: "allow", updatedInput: input };
  }

  // Block writes outside workspace
  if (["Write", "Edit"].includes(toolName)) {
    const filePath = (input as any).file_path as string;
    if (!filePath.startsWith("/workspace/")) {
      return {
        behavior: "deny",
        message: "Cannot write outside workspace"
      };
    }
    return { behavior: "allow", updatedInput: input };
  }

  // Bash: allow only if sandboxed
  if (toolName === "Bash") {
    return { behavior: "allow", updatedInput: input };
  }

  // Default: deny unknown tools
  return { behavior: "deny", message: `Unknown tool: ${toolName}` };
};
```

### Sandbox Configuration

```typescript
const sandbox: SandboxSettings = {
  enabled: true,
  autoAllowBashIfSandboxed: true,
  excludedCommands: ["docker"],  // Allow docker commands outside sandbox
  allowUnsandboxedCommands: false,  // Don't let the model escape sandbox
  network: {
    allowLocalBinding: true,  // Allow dev servers
    allowUnixSockets: []      // No Unix socket access
  }
};
```

### Secret Handling via Hooks

```typescript
function createSanitizeBashHook(secretVarNames: string[]): HookCallback {
  return async (input, _toolUseID, { signal }) => {
    const preInput = input as PreToolUseHookInput;
    const command = preInput.tool_input?.command as string;

    // Check if command tries to read secret env vars
    for (const varName of secretVarNames) {
      if (command.includes(`$${varName}`) || command.includes(`\${${varName}}`)) {
        return {
          hookSpecificOutput: {
            hookEventName: input.hook_event_name,
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

  // Advance cursor optimistically
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
      // Safe to roll back — user hasn't seen anything
      await db.setAgentCursor(groupFolder, previousCursor);
    }
    // If output was sent, cursor stays advanced to prevent duplicates
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

### Orphan Container Cleanup

```typescript
async function cleanupOrphans() {
  const { stdout } = await exec(
    'docker ps --filter "name=agent-" --format "{{.Names}}"'
  );
  const containers = stdout.trim().split("\n").filter(Boolean);

  for (const name of containers) {
    console.log(`Stopping orphan container: ${name}`);
    await exec(`docker stop ${name}`).catch(() => {});
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
  containerUtilization: number;     // active time / total time
  errorRateByCategory: {
    maxTurns: number;
    maxBudget: number;
    execution: number;
    timeout: number;
  };
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
  if (msg.type === "result" && msg.subtype === "success") {
    const report = msg.structured_output as CodeAnalysisReport;
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
import { cleanupOrphans } from "./container-runtime";
import { initDatabase } from "./db";
import { recoverPendingMessages } from "./recovery";

async function main() {
  // 1. Initialize
  await cleanupOrphans();
  const db = await initDatabase();
  const registeredGroups = await db.loadRegisteredGroups();
  const channels = await initChannels();  // WhatsApp, Telegram, etc.

  // 2. Set up queue
  const queue = new GroupQueue(parseInt(process.env.MAX_CONCURRENT ?? "5"));
  queue.setProcessFn(async (groupFolder, message) => {
    const group = registeredGroups.get(groupFolder)!;
    const result = await runAgent(message, groupFolder, group.sessionId);
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
| `prompt` | `string \| AsyncIterable<SDKUserMessage>` | String = single-turn; AsyncIterable = multi-turn |
| `model` | `string` | `"claude-opus-4-6"`, `"claude-sonnet-4-6"`, `"claude-haiku-4-5-20251001"` |
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
| `resume` | `string` | Session ID to resume |
| `sandbox` | `SandboxSettings` | Bash sandboxing config |
| `outputFormat` | `{ type: "json_schema", schema: JSONSchema }` | Structured output |
| `betas` | `SdkBeta[]` | `["context-1m-2025-08-07"]` for 1M context |
| `abortController` | `AbortController` | Cancellation |
| `env` | `Dict<string>` | Environment variables |

### SDKMessage Types

| Type | Subtype | When |
|------|---------|------|
| `system` | `init` | Session started — contains session_id, tools, model |
| `system` | `compact_boundary` | Transcript compacted |
| `assistant` | — | Claude's response (text + tool_use blocks) |
| `user` | — | Internal user message |
| `result` | `success` | Agent completed — contains result, cost, usage |
| `result` | `error_max_turns` | Hit maxTurns limit |
| `result` | `error_max_budget_usd` | Hit cost limit |
| `result` | `error_during_execution` | Runtime error |
| `stream_event` | — | Partial streaming (if `includePartialMessages: true`) |

### Hook Events

| Event | Trigger | Can Block? |
|-------|---------|------------|
| `PreToolUse` | Before tool execution | Yes — `permissionDecision: "deny"` |
| `PostToolUse` | After tool execution | No |
| `PostToolUseFailure` | Tool failed | No |
| `Stop` | Agent stopping | Yes — `{ continue: false }` |
| `SessionStart` | Session initialized | No |
| `SessionEnd` | Session terminated | No |
| `SubagentStart` | Subagent spawned | No |
| `SubagentStop` | Subagent completed | No |
| `PreCompact` | Before transcript compaction | No |
| `UserPromptSubmit` | User prompt submitted | No |
| `Notification` | Status notification | No |
| `PermissionRequest` | Permission dialog | Yes |

---

*Document generated 2026-02-25. Based on `@anthropic-ai/claude-agent-sdk` v0.2.x.
Update as the SDK evolves — especially the V2 API when it stabilizes.*
