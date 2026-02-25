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
    const result = this.db.prepare("UPDATE groups SET session_id = ? WHERE folder = ?").run(sessionId, folder);
    if (result.changes === 0) {
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
    const result = this.db.prepare("UPDATE groups SET webhook_secret = ? WHERE folder = ?").run(secret, folder);
    if (result.changes === 0) {
      this.db.prepare("INSERT INTO groups (folder, chat_jid, is_main, webhook_secret) VALUES (?, '', 0, ?)").run(folder, secret);
    }
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
