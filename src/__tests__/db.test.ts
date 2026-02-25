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
