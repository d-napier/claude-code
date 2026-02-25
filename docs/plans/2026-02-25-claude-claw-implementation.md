# Claude Claw — Full Stack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack autonomous agent orchestration system using the Claude Agent SDK, with a Next.js management console.

**Architecture:** A TypeScript backend orchestrator receives messages from channels (WhatsApp/Telegram/Slack), webhooks, cron tasks, and heartbeats, dispatches them through a per-group concurrency queue, and invokes the Claude Agent SDK (`query()`) for each turn. A REST + WebSocket API server bridges the orchestrator to a Next.js 15 frontend management console for real-time monitoring, configuration, and human-in-the-loop approvals.

**Tech Stack:** TypeScript, Node.js, Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`), SQLite (better-sqlite3), Express, ws (WebSocket), Next.js 15, Zustand, shadcn/ui, Tailwind CSS v3, React Hook Form + Zod

---

## Phase 1: Project Scaffolding & Core Infrastructure

### Task 1: Initialize Backend Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/config.ts`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize the project**

```bash
cd /c/development/claude-claw
npm init -y
```

**Step 2: Install core dependencies**

```bash
npm install @anthropic-ai/claude-agent-sdk better-sqlite3 express ws zod dotenv pino cron-parser date-fns glob
npm install -D typescript @types/node @types/better-sqlite3 @types/express @types/ws tsx vitest
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "frontend"]
}
```

**Step 4: Create src/config.ts**

```typescript
import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig();

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  MAX_CONCURRENT: z.coerce.number().default(5),
  DEFAULT_MODEL: z.string().default("claude-sonnet-4-6"),
  DEFAULT_MAX_TURNS: z.coerce.number().default(50),
  DEFAULT_MAX_BUDGET_USD: z.coerce.number().default(2.0),
  GLOBAL_BUDGET_CAP_USD: z.coerce.number().default(50.0),
  WEBHOOK_PORT: z.coerce.number().default(3000),
  API_PORT: z.coerce.number().default(3001),
  POLL_INTERVAL_MS: z.coerce.number().default(2000),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(1800000),
  SCHEDULER_POLL_MS: z.coerce.number().default(60000),
  DB_PATH: z.string().default("./data/claude-claw.db"),
  LOG_LEVEL: z.string().default("info"),
});

export const config = envSchema.parse(process.env);
export type Config = typeof config;
```

**Step 5: Create .env.example and .gitignore**

`.env.example`:
```
ANTHROPIC_API_KEY=sk-ant-...
MAX_CONCURRENT=5
DEFAULT_MODEL=claude-sonnet-4-6
WEBHOOK_PORT=3000
API_PORT=3001
```

`.gitignore`:
```
node_modules/
dist/
.env
data/
*.db
frontend/.next/
frontend/node_modules/
```

**Step 6: Create directory structure**

```bash
mkdir -p src/hooks src/channels src/tools groups/global data/sessions data/ipc data/dead-letter .claude
```

**Step 7: Commit**

```bash
git add package.json tsconfig.json src/config.ts .env.example .gitignore
git commit -m "feat: initialize backend project with config and dependencies"
```

---

### Task 2: SQLite Database Schema & Access Layer

**Files:**
- Create: `src/db.ts`
- Test: `src/__tests__/db.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/__tests__/db.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../db.js";
import fs from "fs";

const TEST_DB = "./data/test.db";

describe("Database", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(TEST_DB);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  describe("groups", () => {
    it("should register and retrieve a group", () => {
      db.registerGroup({
        folder: "test-group",
        chatJid: "123@g.us",
        isMain: false,
        queueMode: "followup",
        debounceMs: 0,
        maxRetries: 3,
      });
      const group = db.getGroup("test-group");
      expect(group).toBeDefined();
      expect(group!.chatJid).toBe("123@g.us");
      expect(group!.queueMode).toBe("followup");
    });

    it("should list all registered groups", () => {
      db.registerGroup({ folder: "a", chatJid: "a@g", isMain: true, queueMode: "followup", debounceMs: 0, maxRetries: 3 });
      db.registerGroup({ folder: "b", chatJid: "b@g", isMain: false, queueMode: "collect", debounceMs: 500, maxRetries: 3 });
      const groups = db.getAllGroups();
      expect(groups).toHaveLength(2);
    });
  });

  describe("sessions", () => {
    it("should store and retrieve session ID", () => {
      db.setSessionId("test-group", "session-123");
      expect(db.getSessionId("test-group")).toBe("session-123");
    });

    it("should return undefined for unknown group", () => {
      expect(db.getSessionId("unknown")).toBeUndefined();
    });
  });

  describe("cursors", () => {
    it("should store and retrieve agent cursor", () => {
      db.setAgentCursor("test-group", "2026-01-01T00:00:00Z");
      expect(db.getAgentCursor("test-group")).toBe("2026-01-01T00:00:00Z");
    });
  });

  describe("tasks", () => {
    it("should create and retrieve a scheduled task", () => {
      const id = db.createTask({
        prompt: "Check for updates",
        scheduleType: "cron",
        scheduleValue: "0 */6 * * *",
        groupFolder: "test-group",
        status: "active",
      });
      const task = db.getTask(id);
      expect(task).toBeDefined();
      expect(task!.prompt).toBe("Check for updates");
    });

    it("should list due tasks", () => {
      db.createTask({
        prompt: "Past task",
        scheduleType: "once",
        scheduleValue: "2020-01-01T00:00:00Z",
        groupFolder: "test-group",
        status: "active",
        nextRun: "2020-01-01T00:00:00Z",
      });
      db.createTask({
        prompt: "Future task",
        scheduleType: "once",
        scheduleValue: "2099-01-01T00:00:00Z",
        groupFolder: "test-group",
        status: "active",
        nextRun: "2099-01-01T00:00:00Z",
      });
      const due = db.getDueTasks();
      expect(due).toHaveLength(1);
      expect(due[0].prompt).toBe("Past task");
    });
  });

  describe("webhook secrets", () => {
    it("should store and retrieve webhook secret", () => {
      db.setWebhookSecret("test-group", "secret-abc");
      expect(db.getWebhookSecret("test-group")).toBe("secret-abc");
    });
  });

  describe("messages", () => {
    it("should store and query messages since cursor", () => {
      db.storeMessage({ chatId: "chat-1", messageId: "m1", text: "hello", timestamp: "2026-01-01T00:00:00Z", sender: "user1", isDm: false });
      db.storeMessage({ chatId: "chat-1", messageId: "m2", text: "world", timestamp: "2026-01-01T00:01:00Z", sender: "user2", isDm: false });
      const msgs = db.getMessagesSince("chat-1", "2026-01-01T00:00:00Z");
      expect(msgs).toHaveLength(1);
      expect(msgs[0].text).toBe("world");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/db.test.ts
```
Expected: FAIL — `../db.js` not found

**Step 3: Implement src/db.ts**

```typescript
import BetterSqlite3 from "better-sqlite3";

export interface GroupRow {
  folder: string;
  chatJid: string;
  isMain: boolean;
  queueMode: "collect" | "followup" | "interrupt";
  debounceMs: number;
  maxRetries: number;
  sessionId?: string;
}

export interface TaskRow {
  id: string;
  prompt: string;
  scheduleType: "cron" | "interval" | "once";
  scheduleValue: string;
  groupFolder: string;
  status: "active" | "paused" | "completed";
  nextRun?: string;
  createdAt: string;
}

export interface MessageRow {
  chatId: string;
  messageId: string;
  text: string;
  timestamp: string;
  sender: string;
  isDm: boolean;
  peerId?: string;
}

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        folder TEXT PRIMARY KEY,
        chat_jid TEXT NOT NULL,
        is_main INTEGER NOT NULL DEFAULT 0,
        queue_mode TEXT NOT NULL DEFAULT 'followup',
        debounce_ms INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        session_id TEXT,
        webhook_secret TEXT
      );

      CREATE TABLE IF NOT EXISTS cursors (
        group_folder TEXT PRIMARY KEY,
        cursor_value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        schedule_type TEXT NOT NULL,
        schedule_value TEXT NOT NULL,
        group_folder TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        next_run TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        message_id TEXT NOT NULL UNIQUE,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        sender TEXT NOT NULL,
        is_dm INTEGER NOT NULL DEFAULT 0,
        peer_id TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chat_ts ON messages(chat_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON tasks(next_run, status);
    `);
  }

  registerGroup(group: {
    folder: string;
    chatJid: string;
    isMain: boolean;
    queueMode: string;
    debounceMs: number;
    maxRetries: number;
  }) {
    this.db.prepare(`
      INSERT OR REPLACE INTO groups (folder, chat_jid, is_main, queue_mode, debounce_ms, max_retries)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(group.folder, group.chatJid, group.isMain ? 1 : 0, group.queueMode, group.debounceMs, group.maxRetries);
  }

  getGroup(folder: string): GroupRow | undefined {
    const row = this.db.prepare("SELECT * FROM groups WHERE folder = ?").get(folder) as any;
    if (!row) return undefined;
    return {
      folder: row.folder,
      chatJid: row.chat_jid,
      isMain: !!row.is_main,
      queueMode: row.queue_mode,
      debounceMs: row.debounce_ms,
      maxRetries: row.max_retries,
      sessionId: row.session_id ?? undefined,
    };
  }

  getAllGroups(): GroupRow[] {
    return (this.db.prepare("SELECT * FROM groups").all() as any[]).map(row => ({
      folder: row.folder,
      chatJid: row.chat_jid,
      isMain: !!row.is_main,
      queueMode: row.queue_mode,
      debounceMs: row.debounce_ms,
      maxRetries: row.max_retries,
      sessionId: row.session_id ?? undefined,
    }));
  }

  setSessionId(folder: string, sessionId: string) {
    this.db.prepare("UPDATE groups SET session_id = ? WHERE folder = ?").run(sessionId, folder);
    // Also insert if group doesn't exist yet (for DM sessions)
    if (this.db.changes === 0) {
      this.db.prepare("INSERT INTO groups (folder, chat_jid, is_main, session_id) VALUES (?, '', 0, ?)").run(folder, sessionId);
    }
  }

  getSessionId(folder: string): string | undefined {
    const row = this.db.prepare("SELECT session_id FROM groups WHERE folder = ?").get(folder) as any;
    return row?.session_id ?? undefined;
  }

  setAgentCursor(folder: string, cursor: string) {
    this.db.prepare("INSERT OR REPLACE INTO cursors (group_folder, cursor_value) VALUES (?, ?)").run(folder, cursor);
  }

  getAgentCursor(folder: string): string | undefined {
    const row = this.db.prepare("SELECT cursor_value FROM cursors WHERE group_folder = ?").get(folder) as any;
    return row?.cursor_value ?? undefined;
  }

  createTask(task: {
    prompt: string;
    scheduleType: string;
    scheduleValue: string;
    groupFolder: string;
    status: string;
    nextRun?: string;
  }): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.db.prepare(`
      INSERT INTO tasks (id, prompt, schedule_type, schedule_value, group_folder, status, next_run)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, task.prompt, task.scheduleType, task.scheduleValue, task.groupFolder, task.status, task.nextRun ?? null);
    return id;
  }

  getTask(id: string): TaskRow | undefined {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      prompt: row.prompt,
      scheduleType: row.schedule_type,
      scheduleValue: row.schedule_value,
      groupFolder: row.group_folder,
      status: row.status,
      nextRun: row.next_run ?? undefined,
      createdAt: row.created_at,
    };
  }

  getDueTasks(): TaskRow[] {
    const now = new Date().toISOString();
    return (this.db.prepare(
      "SELECT * FROM tasks WHERE status = 'active' AND next_run IS NOT NULL AND next_run <= ?"
    ).all(now) as any[]).map(row => ({
      id: row.id,
      prompt: row.prompt,
      scheduleType: row.schedule_type,
      scheduleValue: row.schedule_value,
      groupFolder: row.group_folder,
      status: row.status,
      nextRun: row.next_run ?? undefined,
      createdAt: row.created_at,
    }));
  }

  getAllTasks(): TaskRow[] {
    return (this.db.prepare("SELECT * FROM tasks").all() as any[]).map(row => ({
      id: row.id,
      prompt: row.prompt,
      scheduleType: row.schedule_type,
      scheduleValue: row.schedule_value,
      groupFolder: row.group_folder,
      status: row.status,
      nextRun: row.next_run ?? undefined,
      createdAt: row.created_at,
    }));
  }

  getTasksByGroup(folder: string): TaskRow[] {
    return (this.db.prepare("SELECT * FROM tasks WHERE group_folder = ?").all(folder) as any[]).map(row => ({
      id: row.id,
      prompt: row.prompt,
      scheduleType: row.schedule_type,
      scheduleValue: row.schedule_value,
      groupFolder: row.group_folder,
      status: row.status,
      nextRun: row.next_run ?? undefined,
      createdAt: row.created_at,
    }));
  }

  setTaskStatus(id: string, status: string) {
    this.db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, id);
  }

  updateNextRun(id: string, nextRun: string) {
    this.db.prepare("UPDATE tasks SET next_run = ? WHERE id = ?").run(nextRun, id);
  }

  deleteTask(id: string) {
    this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  setWebhookSecret(folder: string, secret: string) {
    this.db.prepare("UPDATE groups SET webhook_secret = ? WHERE folder = ?").run(secret, folder);
  }

  getWebhookSecret(folder: string): string | undefined {
    const row = this.db.prepare("SELECT webhook_secret FROM groups WHERE folder = ?").get(folder) as any;
    return row?.webhook_secret ?? undefined;
  }

  storeMessage(msg: MessageRow) {
    this.db.prepare(`
      INSERT OR IGNORE INTO messages (chat_id, message_id, text, timestamp, sender, is_dm, peer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(msg.chatId, msg.messageId, msg.text, msg.timestamp, msg.sender, msg.isDm ? 1 : 0, msg.peerId ?? null);
  }

  getMessagesSince(chatId: string, cursor: string): MessageRow[] {
    return (this.db.prepare(
      "SELECT * FROM messages WHERE chat_id = ? AND timestamp > ? ORDER BY timestamp ASC"
    ).all(chatId, cursor) as any[]).map(row => ({
      chatId: row.chat_id,
      messageId: row.message_id,
      text: row.text,
      timestamp: row.timestamp,
      sender: row.sender,
      isDm: !!row.is_dm,
      peerId: row.peer_id ?? undefined,
    }));
  }

  close() {
    this.db.close();
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/db.test.ts
```
Expected: All PASS

**Step 5: Commit**

```bash
git add src/db.ts src/__tests__/db.test.ts
git commit -m "feat: add SQLite database layer with groups, sessions, tasks, messages"
```

---

### Task 3: GroupQueue — Concurrency & Queue Modes

**Files:**
- Create: `src/group-queue.ts`
- Test: `src/__tests__/group-queue.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/__tests__/group-queue.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroupQueue } from "../group-queue.js";

describe("GroupQueue", () => {
  let queue: GroupQueue;
  let processedMessages: Array<{ group: string; message: string }>;

  beforeEach(() => {
    processedMessages = [];
    queue = new GroupQueue(2); // max 2 concurrent
    queue.setProcessFn(async (group, message, _abort) => {
      processedMessages.push({ group, message });
      await new Promise(r => setTimeout(r, 50)); // simulate work
    });
  });

  it("should process a single message immediately", async () => {
    await queue.enqueue("group-a", "hello");
    await queue.waitForIdle();
    expect(processedMessages).toHaveLength(1);
    expect(processedMessages[0]).toEqual({ group: "group-a", message: "hello" });
  });

  it("should respect maxConcurrent limit", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    queue.setProcessFn(async (group, message, _abort) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 100));
      concurrent--;
    });

    // Enqueue 4 messages for 4 different groups
    await queue.enqueue("g1", "m1");
    await queue.enqueue("g2", "m2");
    await queue.enqueue("g3", "m3");
    await queue.enqueue("g4", "m4");
    await queue.waitForIdle();
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("should deduplicate messages with same dedupKey", async () => {
    await queue.enqueue("group-a", "hello", "key-1");
    await queue.enqueue("group-a", "hello again", "key-1"); // should be ignored
    await queue.waitForIdle();
    expect(processedMessages).toHaveLength(1);
  });

  describe("followup mode", () => {
    it("should queue messages for same group and process sequentially", async () => {
      queue.setGroupConfig("group-a", { queueMode: "followup", debounceMs: 0, maxRetries: 3 });
      const order: string[] = [];
      queue.setProcessFn(async (_g, msg, _a) => {
        order.push(msg);
        await new Promise(r => setTimeout(r, 50));
      });

      await queue.enqueue("group-a", "first");
      await queue.enqueue("group-a", "second");
      await queue.enqueue("group-a", "third");
      await queue.waitForIdle();
      expect(order).toEqual(["first", "second", "third"]);
    });
  });

  describe("collect mode", () => {
    it("should batch messages when group is active", async () => {
      queue.setGroupConfig("group-a", { queueMode: "collect", debounceMs: 0, maxRetries: 3 });
      const messages: string[] = [];
      queue.setProcessFn(async (_g, msg, _a) => {
        messages.push(msg);
        await new Promise(r => setTimeout(r, 100));
      });

      await queue.enqueue("group-a", "first");
      // These arrive while first is processing
      await new Promise(r => setTimeout(r, 10));
      await queue.enqueue("group-a", "second");
      await queue.enqueue("group-a", "third");
      await queue.waitForIdle();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toBe("first");
      expect(messages[1]).toContain("second");
      expect(messages[1]).toContain("third");
    });
  });

  describe("interrupt mode", () => {
    it("should abort current run when new message arrives", async () => {
      queue.setGroupConfig("group-a", { queueMode: "interrupt", debounceMs: 0, maxRetries: 3 });
      let aborted = false;
      queue.setProcessFn(async (_g, _msg, abort) => {
        try {
          await new Promise((resolve, reject) => {
            abort.signal.addEventListener("abort", () => reject(new Error("aborted")));
            setTimeout(resolve, 5000);
          });
        } catch {
          aborted = true;
          throw new Error("aborted");
        }
      });

      await queue.enqueue("group-a", "slow task");
      await new Promise(r => setTimeout(r, 50));
      await queue.enqueue("group-a", "urgent");
      await queue.waitForIdle();
      expect(aborted).toBe(true);
    });
  });

  describe("dead letter", () => {
    it("should write to dead letter after max retries", async () => {
      queue.setGroupConfig("group-a", { queueMode: "followup", debounceMs: 0, maxRetries: 2 });
      const deadLetters: any[] = [];
      queue.setDeadLetterFn(async (entry) => {
        deadLetters.push(entry);
      });
      queue.setProcessFn(async () => {
        throw new Error("always fails");
      });

      await queue.enqueue("group-a", "doomed");
      await queue.waitForIdle();
      expect(deadLetters).toHaveLength(1);
      expect(deadLetters[0].error).toContain("always fails");
    });
  });

  describe("shutdown", () => {
    it("should drain pending messages to dead letter on shutdown", async () => {
      queue.setGroupConfig("group-a", { queueMode: "followup", debounceMs: 0, maxRetries: 3 });
      const deadLetters: any[] = [];
      queue.setDeadLetterFn(async (entry) => {
        deadLetters.push(entry);
      });
      queue.setProcessFn(async () => {
        await new Promise(r => setTimeout(r, 5000)); // very slow
      });

      await queue.enqueue("group-a", "running");
      await new Promise(r => setTimeout(r, 10));
      await queue.enqueue("group-a", "pending");
      await queue.shutdown(100); // short timeout
      expect(deadLetters.length).toBeGreaterThanOrEqual(1);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/group-queue.test.ts
```
Expected: FAIL

**Step 3: Implement src/group-queue.ts**

Follow the `GroupQueue` implementation from the implementation guide §6. Add `waitForIdle()` and `setDeadLetterFn()` for testability. The core logic is already specified in the design doc — implement it faithfully.

Key implementation details:
- `waitForIdle()`: resolve when `activeCount === 0` and all pending queues are empty
- `setDeadLetterFn()`: injectable callback for dead-letter writes (defaults to filesystem)
- Retry within same execution context (recursive call, not `setTimeout`)
- Deduplication cache with TTL-based expiry

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/group-queue.test.ts
```
Expected: All PASS

**Step 5: Commit**

```bash
git add src/group-queue.ts src/__tests__/group-queue.test.ts
git commit -m "feat: add GroupQueue with collect/followup/interrupt modes and dead letter"
```

---

### Task 4: Agent Runner — SDK Wrapper

**Files:**
- Create: `src/agent-runner.ts`
- Create: `src/types.ts`
- Test: `src/__tests__/agent-runner.test.ts`

**Step 1: Create shared types**

```typescript
// src/types.ts
export interface AgentResult {
  text: string;
  sessionId: string;
  cost: number;
  status: "success" | "error" | "timeout";
  errorSubtype?: string;
}

export type AgentStatus = "idle" | "running" | "queued" | "error" | "timeout";
export type SessionStatus = "active" | "completed" | "error" | "timeout";
export type QueueMode = "collect" | "followup" | "interrupt";

export interface AgentConfig {
  folder: string;
  model?: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  allowedTools?: string[];
  queueMode: QueueMode;
  debounceMs: number;
  maxRetries: number;
  systemPromptAppend?: string;
}
```

**Step 2: Write the agent runner**

```typescript
// src/agent-runner.ts
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { config } from "./config.js";
import type { AgentResult } from "./types.js";

export async function runAgent(
  prompt: string,
  groupFolder: string,
  options: {
    sessionId?: string;
    abortController?: AbortController;
    isMain?: boolean;
    model?: string;
    maxTurns?: number;
    maxBudgetUsd?: number;
    allowedTools?: string[];
    systemPromptAppend?: string;
    onOutput?: (text: string) => void;
    onMessage?: (msg: SDKMessage) => void;
    hooks?: Record<string, any>;
    mcpServers?: Record<string, any>;
  } = {}
): Promise<AgentResult> {
  const q = query({
    prompt,
    options: {
      resume: options.sessionId,
      model: options.model ?? config.DEFAULT_MODEL,
      maxTurns: options.maxTurns ?? config.DEFAULT_MAX_TURNS,
      maxBudgetUsd: options.maxBudgetUsd ?? config.DEFAULT_MAX_BUDGET_USD,
      allowedTools: options.allowedTools ?? [
        "Read", "Write", "Edit", "Bash", "Glob", "Grep",
        "WebSearch", "WebFetch", "Task"
      ],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      settingSources: ["project"],
      cwd: `./groups/${groupFolder}`,
      additionalDirectories: ["./groups/global"],
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: options.systemPromptAppend ?? "You are a helpful assistant. Respond concisely."
      },
      sandbox: { enabled: true, autoAllowBashIfSandboxed: true },
      hooks: options.hooks,
      mcpServers: options.mcpServers,
      abortController: options.abortController,
    }
  });

  const result: AgentResult = { text: "", sessionId: "", cost: 0, status: "success" };

  for await (const msg of q) {
    options.onMessage?.(msg);

    switch (msg.type) {
      case "system":
        if (msg.subtype === "init") {
          result.sessionId = msg.session_id;
        }
        break;

      case "assistant":
        for (const block of msg.message.content) {
          if (block.type === "text") {
            options.onOutput?.(block.text);
          }
        }
        break;

      case "result":
        result.cost = msg.total_cost_usd;
        if (msg.subtype === "success") {
          result.text = msg.result;
          result.status = "success";
        } else {
          result.text = `Error: ${msg.subtype} — ${msg.errors?.join(", ") ?? "unknown"}`;
          result.status = "error";
          result.errorSubtype = msg.subtype;
        }
        break;
    }
  }

  return result;
}
```

**Step 3: Write a basic test (integration-style, will be skipped in CI)**

```typescript
// src/__tests__/agent-runner.test.ts
import { describe, it, expect } from "vitest";

describe("agent-runner", () => {
  it("should export runAgent function", async () => {
    const { runAgent } = await import("../agent-runner.js");
    expect(typeof runAgent).toBe("function");
  });

  // Integration tests require ANTHROPIC_API_KEY — skip in CI
  it.skipIf(!process.env.ANTHROPIC_API_KEY)(
    "should run a simple query",
    async () => {
      const { runAgent } = await import("../agent-runner.js");
      const result = await runAgent("Say 'hello world' and nothing else.", "global", {
        maxTurns: 1,
        maxBudgetUsd: 0.01,
        allowedTools: [],
      });
      expect(result.status).toBe("success");
      expect(result.sessionId).toBeTruthy();
    },
    30_000
  );
});
```

**Step 4: Run tests**

```bash
npx vitest run src/__tests__/agent-runner.test.ts
```

**Step 5: Commit**

```bash
git add src/types.ts src/agent-runner.ts src/__tests__/agent-runner.test.ts
git commit -m "feat: add agent runner wrapping Claude SDK query()"
```

---

### Task 5: Hooks — Security, Audit, Secrets

**Files:**
- Create: `src/hooks/security.ts`
- Create: `src/hooks/audit.ts`
- Create: `src/hooks/secrets.ts`
- Create: `src/hooks/compact.ts`
- Create: `src/hooks/index.ts`
- Test: `src/__tests__/hooks.test.ts`

**Step 1: Write tests for security hook**

```typescript
// src/__tests__/hooks.test.ts
import { describe, it, expect } from "vitest";
import { blockDangerousCommands } from "../hooks/security.js";

describe("security hooks", () => {
  it("should block rm -rf /", async () => {
    const result = await blockDangerousCommands(
      { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "rm -rf /" } } as any,
      "test-id",
      { signal: new AbortController().signal } as any
    );
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  it("should allow safe commands", async () => {
    const result = await blockDangerousCommands(
      { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls -la" } } as any,
      "test-id",
      { signal: new AbortController().signal } as any
    );
    expect(result.hookSpecificOutput).toBeUndefined();
  });
});
```

**Step 2: Implement all hooks following the implementation guide §9**

Each hook file implements the pattern from the guide. `src/hooks/index.ts` exports `buildHooks(groupFolder, isMain)`.

**Step 3: Run tests, commit**

```bash
npx vitest run src/__tests__/hooks.test.ts
git add src/hooks/ src/__tests__/hooks.test.ts
git commit -m "feat: add security, audit, secrets, and compact hooks"
```

---

### Task 6: MCP Server — IPC Tools

**Files:**
- Create: `src/tools/mcp-server.ts`
- Test: `src/__tests__/mcp-server.test.ts`

Follow implementation guide §7. Create `createAgentMcpServer(groupFolder, isMain)` with tools: `send_message`, `schedule_task`, `list_tasks`, `pause_task`, `resume_task`, `cancel_task`. Write tests for authorization logic (non-main can't send to foreign chats).

**Commit:** `feat: add MCP server with IPC tools for agents`

---

### Task 7: Input Sources — Message Loop, Scheduler, Heartbeat, Webhooks

**Files:**
- Create: `src/channels/types.ts`
- Create: `src/message-loop.ts`
- Create: `src/scheduler.ts`
- Create: `src/heartbeat.ts`
- Create: `src/webhooks.ts`
- Test: `src/__tests__/scheduler.test.ts`
- Test: `src/__tests__/webhooks.test.ts`

Follow implementation guide §10. Key pieces:
- Channel interface (§10 channels/types.ts)
- Message loop with dedup keys and DM scope resolution
- Scheduler with cron-parser
- Heartbeat loop
- Webhook server with HMAC verification

Test the scheduler due-task logic and webhook HMAC verification.

**Commit:** `feat: add message loop, scheduler, heartbeat, and webhook input sources`

---

### Task 8: File-Based IPC Watcher

**Files:**
- Create: `src/ipc.ts`
- Test: `src/__tests__/ipc.test.ts`

Follow implementation guide §12. IPC watcher polls `data/ipc/{group}/messages/` and `data/ipc/{group}/tasks/` directories. Atomic file writes via `.tmp` rename. Failed files move to `errors/`.

**Commit:** `feat: add file-based IPC watcher for container communication`

---

### Task 9: Error Handling & Recovery

**Files:**
- Create: `src/recovery.ts`
- Test: `src/__tests__/recovery.test.ts`

Follow implementation guide §14. Cursor-based crash recovery and startup recovery.

**Commit:** `feat: add crash recovery with cursor-based message tracking`

---

### Task 10: Main Orchestrator Wiring

**Files:**
- Create: `src/index.ts`
- Modify: `package.json` — add `"start"` script

Wire everything together following implementation guide §17. The main function:
1. Initialize DB
2. Load registered groups
3. Create GroupQueue with per-group configs
4. Set process function (runAgent)
5. Recover pending messages
6. Start all input loops in parallel
7. Graceful shutdown on SIGTERM/SIGINT

**Commit:** `feat: wire main orchestrator with all input sources and graceful shutdown`

---

## Phase 2: API Server (REST + WebSocket)

### Task 11: Express API Server Scaffold

**Files:**
- Create: `src/api/server.ts`
- Create: `src/api/routes/agents.ts`
- Create: `src/api/routes/sessions.ts`
- Create: `src/api/routes/tasks.ts`
- Create: `src/api/routes/state.ts`
- Create: `src/api/middleware/auth.ts`

Set up Express with JSON body parsing, CORS, and route modules. The API server runs alongside the orchestrator on `API_PORT`.

REST endpoints (from FRONTEND_DESIGN.md §18):
- `GET /api/agents` — list all agents (groups)
- `GET /api/agents/:folder` — agent detail + config
- `PUT /api/agents/:folder` — update agent config
- `POST /api/agents/:folder/start` — start agent
- `POST /api/agents/:folder/stop` — graceful stop
- `POST /api/agents/:folder/interrupt` — abort current turn
- `GET /api/sessions` — list sessions (summary, no transcript)
- `GET /api/sessions/:id` — session detail with transcript
- `GET /api/tasks` — list scheduled tasks
- `POST /api/tasks` — create task
- `PUT /api/tasks/:id` — update task
- `DELETE /api/tasks/:id` — delete task
- `GET /api/state/snapshot` — full state for WS reconnect

**Commit:** `feat: add Express REST API server with agent, session, and task routes`

---

### Task 12: WebSocket Server — Real-Time Events

**Files:**
- Create: `src/api/ws-server.ts`
- Create: `src/api/events.ts`

WebSocket server (using `ws` library) attached to the Express HTTP server. Handles:
- Cookie-based auth on upgrade handshake
- Event broadcasting to connected clients
- `session:subscribe` / `session:unsubscribe` for selective event delivery
- `agent:interrupt` command from clients
- `approval:respond` for HITL approvals

Event types (from FRONTEND_DESIGN.md §4):
- `agent:status` — agent status changes
- `agent:output` — complete message output per turn
- `session:update` — session state changes
- `task:update` — task status changes
- `approval:request` — HITL approval needed
- `error:agent` — agent errors
- `metrics:update` — periodic metrics

The orchestrator emits events via an `EventBus` class that the WS server subscribes to.

**Commit:** `feat: add WebSocket server with typed event protocol and event bus`

---

### Task 13: Event Bus — Bridge Orchestrator to API

**Files:**
- Create: `src/event-bus.ts`
- Modify: `src/agent-runner.ts` — emit events during message stream processing
- Modify: `src/group-queue.ts` — emit status change events

The EventBus is an in-process `EventEmitter` that the orchestrator writes to and the WS server reads from. Events flow:
```
SDK message stream → agent-runner → EventBus → WS server → browser clients
GroupQueue status changes → EventBus → WS server → browser clients
```

**Commit:** `feat: add event bus bridging orchestrator to WebSocket server`

---

### Task 14: HITL Approval Flow

**Files:**
- Create: `src/api/approvals.ts`
- Modify: `src/hooks/security.ts` — add HITL hook for high-risk tools

Implement the approval bridge:
1. PreToolUse hook detects high-risk tool call
2. Hook creates a Promise and stores it in an approval registry keyed by approval ID
3. Hook emits `approval:request` event via EventBus
4. Hook `await`s the Promise (blocks the tool call)
5. WS server receives `approval:respond` from client
6. WS handler resolves the stored Promise
7. Hook returns approve/deny based on resolution

Include timeout with configurable default (5 minutes). Auto-deny on timeout.

**Commit:** `feat: add HITL approval flow with hook suspension and WS bridge`

---

## Phase 3: Frontend Management Console

### Task 15: Initialize Next.js Frontend

**Files:**
- Create: `frontend/` directory with Next.js 15 app

**Step 1: Create Next.js project**

```bash
cd /c/development/claude-claw
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

**Step 2: Install dependencies**

```bash
cd frontend
npm install zustand recharts @tanstack/react-table react-hook-form @hookform/resolvers zod date-fns cronstrue sonner next-auth@5
npx shadcn@latest init
npx shadcn@latest add button card input label select tabs table badge dialog sheet toast separator scroll-area
```

**Step 3: Configure proxy to API server**

In `frontend/next.config.ts`:
```typescript
const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:3001/api/:path*" }
    ];
  }
};
export default nextConfig;
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Next.js 15 frontend with shadcn/ui and dependencies"
```

---

### Task 16: Zustand Store & WebSocket Hook

**Files:**
- Create: `frontend/src/lib/store.ts`
- Create: `frontend/src/lib/use-websocket.ts`
- Create: `frontend/src/lib/types.ts`

Implement the Zustand store from FRONTEND_DESIGN.md §19:
- Use `Record<string, T>` (not `Map`) for all collections
- Immutable spread patterns for updates
- `liveOutputs` capped at 500 per session
- `applySnapshot()` for WS reconnect reconciliation

WebSocket hook from §4:
- Cookie-based auth (no token in URL)
- Reconnect with exponential backoff
- `reconnectTimerRef` cleared on cleanup (React Strict Mode safe)
- `onopen` fetches `/api/state/snapshot` after reconnect
- `try/catch` around `JSON.parse(event.data)`

Types from §18 — all interfaces using `folder` as canonical identifier.

**Commit:** `feat: add Zustand store and WebSocket hook with reconnect reconciliation`

---

### Task 17: App Shell & Navigation

**Files:**
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/components/nav-sidebar.tsx`
- Create: `frontend/src/components/header.tsx`

Implement the nav sidebar from FRONTEND_DESIGN.md §5:
- Dashboard, Agents, Sessions, Tasks, Integrations, Memory, Tools, Security, Analytics, Approvals, Settings
- Collapsible sidebar
- Active state highlighting

**Commit:** `feat: add app shell with sidebar navigation`

---

### Task 18: Dashboard Page

**Files:**
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/dashboard/`

Implement FRONTEND_DESIGN.md §6:
- Agent status grid (running/idle/error counts)
- Queue depth indicator
- Cost accumulator
- Recent activity feed (last 100 events, virtualized)
- Error log

**Commit:** `feat: add dashboard with agent status grid and activity feed`

---

### Task 19: Agent Manager Page

**Files:**
- Create: `frontend/src/app/agents/page.tsx`
- Create: `frontend/src/app/agents/[folder]/page.tsx`
- Create: `frontend/src/components/agents/`

Implement FRONTEND_DESIGN.md §7:
- Agent list table (folder, status, session, queue depth, cost, actions)
- Agent detail view with config editor
- Start/Stop/Interrupt actions
- Queue mode selector (collect/followup/interrupt)

**Commit:** `feat: add agent manager with list, detail, and config editor`

---

### Task 20: Session Explorer & Conversation View

**Files:**
- Create: `frontend/src/app/sessions/page.tsx`
- Create: `frontend/src/app/sessions/[id]/page.tsx`
- Create: `frontend/src/components/sessions/`
- Create: `frontend/src/components/conversation/`

Implement FRONTEND_DESIGN.md §8-9:
- Session list (summary only, paginated)
- Session detail with transcript view
- Conversation view with message bubbles
- Agent output rendering (complete messages, typewriter effect optional)
- "Processing..." indicator while agent runs
- Queue mode badge

**Commit:** `feat: add session explorer and conversation view`

---

### Task 21: Task Scheduler Page

**Files:**
- Create: `frontend/src/app/tasks/page.tsx`
- Create: `frontend/src/components/tasks/`

Implement FRONTEND_DESIGN.md §10:
- Task list table
- Create/edit task dialog (cron/interval/once)
- Human-readable cron descriptions via cronstrue
- Pause/resume/delete actions

**Commit:** `feat: add task scheduler with CRUD and cron editor`

---

### Task 22: Memory Editor Page

**Files:**
- Create: `frontend/src/app/memory/page.tsx`
- Create: `frontend/src/components/memory/`

Implement FRONTEND_DESIGN.md §12 (revised):
- List CLAUDE.md files (global + per-group)
- Monaco editor (lazy-loaded) for editing
- Save with ETag conflict detection
- "Last saved" timestamp + Revert button
- 412 Precondition Failed → show diff dialog

**Commit:** `feat: add memory editor with conflict detection`

---

### Task 23: Approval Queue Page

**Files:**
- Create: `frontend/src/app/approvals/page.tsx`
- Create: `frontend/src/components/approvals/`

Implement FRONTEND_DESIGN.md §16 (revised):
- Pending approvals with countdown timers
- Approve/Deny buttons
- Tool call details (command, risk level, context)
- Resolved list with outcomes
- Browser Notification API for new approvals (active tab)
- 409 Conflict handling for concurrent operators

**Commit:** `feat: add HITL approval queue with countdown and conflict handling`

---

### Task 24: Remaining Pages — Integrations, Tools, Security, Analytics, Settings

**Files:**
- Create pages for each remaining section

Brief implementations:
- **Integrations** (§11): Channel list, connection status, config dialog (WhatsApp/Telegram/Slack)
- **Tool Registry** (§13, revised): List of available tools per agent, risk level badges
- **Security** (§14): Permission rules, mount allowlist editor
- **Analytics** (§15, revised): Cost over time, task completion rate, error breakdown (no "accuracy" metrics)
- **Settings** (§17): Global config, RBAC user management

**Commit:** `feat: add integrations, tools, security, analytics, and settings pages`

---

### Task 25: RBAC Enforcement

**Files:**
- Modify: `frontend/src/middleware.ts`
- Modify: `frontend/src/components/` — conditional rendering based on role
- Modify: `src/api/middleware/auth.ts` — role checks on API routes

Implement FRONTEND_DESIGN.md §20:
- Server Component role guard via `auth()`
- API middleware rejects write ops from viewers
- UI conditionally renders action buttons based on role

**Commit:** `feat: add RBAC enforcement on routes, API, and UI components`

---

## Phase 4: Integration & Polish

### Task 26: End-to-End Wiring

**Files:**
- Modify: `src/index.ts` — start API server alongside orchestrator
- Modify: `package.json` — add `"dev"` script for concurrent backend + frontend

Wire the API server startup into the main orchestrator. Add dev script:
```json
{
  "scripts": {
    "dev": "concurrently \"tsx watch src/index.ts\" \"cd frontend && npm run dev\"",
    "build": "tsc && cd frontend && npm run build",
    "start": "node dist/index.js"
  }
}
```

Install `concurrently` as dev dependency.

**Commit:** `feat: wire API server into orchestrator and add dev scripts`

---

### Task 27: Channel Implementations (Stub)

**Files:**
- Create: `src/channels/whatsapp.ts`
- Create: `src/channels/telegram.ts`
- Create: `src/channels/slack.ts`

Create stub channel implementations with the `Channel` interface. Each exports a `connect()` function that returns a Channel. Actual messaging library integration (baileys, grammy, bolt) deferred — stubs return empty message arrays and log outbound messages.

**Commit:** `feat: add stub channel implementations for WhatsApp, Telegram, Slack`

---

### Task 28: Global Memory & CLAUDE.md Setup

**Files:**
- Create: `groups/global/CLAUDE.md`
- Create: `.claude/settings.json`
- Create: `.claude/CLAUDE.md`

Set up the hierarchical memory structure:
- `groups/global/CLAUDE.md` — shared facts and preferences
- `.claude/settings.json` — SDK project settings
- `.claude/CLAUDE.md` — project-level instructions

**Commit:** `feat: set up hierarchical memory structure with CLAUDE.md files`

---

### Task 29: Observability — Logging & Metrics

**Files:**
- Modify: `src/agent-runner.ts` — add structured logging via pino
- Create: `src/observability.ts` — metrics collection from SDK streams

Follow implementation guide §15. Add `processWithObservability()` wrapper that tracks turns, tool calls, cost, errors, and emits metrics via EventBus.

**Commit:** `feat: add structured logging and metrics collection`

---

### Task 30: Run Full Test Suite & Final Commit

**Step 1: Run all backend tests**

```bash
npx vitest run
```
Expected: All PASS

**Step 2: Build backend**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Build frontend**

```bash
cd frontend && npm run build
```
Expected: Build succeeds

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify full build and test suite"
```

---

## Task Dependency Graph

```
Phase 1 (Backend Core):
  Task 1 (scaffold) → Task 2 (DB) → Task 3 (queue) → Task 4 (runner)
                                   → Task 5 (hooks) → Task 6 (MCP)
                                   → Task 7 (inputs) → Task 8 (IPC)
                                   → Task 9 (recovery) → Task 10 (wiring)

Phase 2 (API Server):
  Task 10 → Task 11 (REST) → Task 12 (WS) → Task 13 (events) → Task 14 (HITL)

Phase 3 (Frontend):
  Task 14 → Task 15 (scaffold) → Task 16 (store) → Task 17 (shell)
         → Task 18 (dashboard) → Task 19 (agents) → Task 20 (sessions)
         → Task 21 (tasks) → Task 22 (memory) → Task 23 (approvals)
         → Task 24 (remaining) → Task 25 (RBAC)

Phase 4 (Integration):
  Task 25 → Task 26 (wiring) → Task 27 (channels) → Task 28 (memory)
         → Task 29 (observability) → Task 30 (verify)
```

## Parallelization Opportunities

Tasks within each phase can be parallelized where they don't share files:
- **Phase 1**: Tasks 5, 6, 7, 8 can run in parallel after Task 4
- **Phase 3**: Tasks 18-24 can run in parallel after Task 17
- **Phase 4**: Tasks 27, 28, 29 can run in parallel
