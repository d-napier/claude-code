import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Database } from "../db.js";
import { GroupQueue } from "../group-queue.js";
import {
  recoverPendingMessages,
  updateCursorAfterProcessing,
} from "../recovery.js";
import fs from "fs";

const TEST_DB = "./data/test-recovery.db";

describe("recovery", () => {
  let db: Database;
  let queue: GroupQueue;

  beforeEach(() => {
    db = new Database(TEST_DB);
    queue = new GroupQueue(5);
    // Set a no-op process function so enqueue doesn't throw
    queue.setProcessFn(async () => {});
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    // Clean up WAL/SHM files
    if (fs.existsSync(TEST_DB + "-wal")) fs.unlinkSync(TEST_DB + "-wal");
    if (fs.existsSync(TEST_DB + "-shm")) fs.unlinkSync(TEST_DB + "-shm");
  });

  describe("recoverPendingMessages", () => {
    it("should recover messages that arrived after the cursor", async () => {
      // Register a group and set its cursor
      db.registerGroup({
        folder: "group-a",
        chatJid: "chat-a",
        isMain: false,
        queueMode: "followup",
        debounceMs: 0,
        maxRetries: 3,
      });
      db.setAgentCursor("group-a", "2026-01-01T00:00:00Z");

      // Store messages: one before cursor (at cursor), two after
      db.storeMessage({
        chatId: "chat-a",
        messageId: "m1",
        text: "old message",
        timestamp: "2026-01-01T00:00:00Z",
        sender: "user1",
        isDm: false,
      });
      db.storeMessage({
        chatId: "chat-a",
        messageId: "m2",
        text: "new message 1",
        timestamp: "2026-01-01T00:01:00Z",
        sender: "user2",
        isDm: false,
      });
      db.storeMessage({
        chatId: "chat-a",
        messageId: "m3",
        text: "new message 2",
        timestamp: "2026-01-01T00:02:00Z",
        sender: "user3",
        isDm: false,
      });

      const enqueueSpy = vi.spyOn(queue, "enqueue");

      const recovered = await recoverPendingMessages(queue, db);

      expect(recovered).toBe(2);
      expect(enqueueSpy).toHaveBeenCalledOnce();
      expect(enqueueSpy).toHaveBeenCalledWith(
        "group-a",
        expect.stringContaining("new message 1"),
        undefined
      );
      expect(enqueueSpy.mock.calls[0][1]).toContain("new message 2");
    });

    it("should not recover messages when cursor is current", async () => {
      db.registerGroup({
        folder: "group-b",
        chatJid: "chat-b",
        isMain: false,
        queueMode: "followup",
        debounceMs: 0,
        maxRetries: 3,
      });

      // Store a message and set cursor to its timestamp
      db.storeMessage({
        chatId: "chat-b",
        messageId: "m1",
        text: "latest",
        timestamp: "2026-01-01T00:05:00Z",
        sender: "user1",
        isDm: false,
      });
      db.setAgentCursor("group-b", "2026-01-01T00:05:00Z");

      const enqueueSpy = vi.spyOn(queue, "enqueue");

      const recovered = await recoverPendingMessages(queue, db);

      expect(recovered).toBe(0);
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it("should recover from multiple groups independently", async () => {
      db.registerGroup({
        folder: "group-x",
        chatJid: "chat-x",
        isMain: false,
        queueMode: "followup",
        debounceMs: 0,
        maxRetries: 3,
      });
      db.registerGroup({
        folder: "group-y",
        chatJid: "chat-y",
        isMain: false,
        queueMode: "followup",
        debounceMs: 0,
        maxRetries: 3,
      });

      db.setAgentCursor("group-x", "2026-01-01T00:00:00Z");
      db.setAgentCursor("group-y", "2026-01-01T00:00:00Z");

      db.storeMessage({
        chatId: "chat-x",
        messageId: "mx1",
        text: "x msg",
        timestamp: "2026-01-01T00:01:00Z",
        sender: "u1",
        isDm: false,
      });
      db.storeMessage({
        chatId: "chat-y",
        messageId: "my1",
        text: "y msg 1",
        timestamp: "2026-01-01T00:01:00Z",
        sender: "u2",
        isDm: false,
      });
      db.storeMessage({
        chatId: "chat-y",
        messageId: "my2",
        text: "y msg 2",
        timestamp: "2026-01-01T00:02:00Z",
        sender: "u3",
        isDm: false,
      });

      const enqueueSpy = vi.spyOn(queue, "enqueue");

      const recovered = await recoverPendingMessages(queue, db);

      expect(recovered).toBe(3);
      expect(enqueueSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("updateCursorAfterProcessing", () => {
    it("should update the cursor for the group", () => {
      db.registerGroup({
        folder: "group-c",
        chatJid: "chat-c",
        isMain: false,
        queueMode: "followup",
        debounceMs: 0,
        maxRetries: 3,
      });
      db.setAgentCursor("group-c", "2026-01-01T00:00:00Z");

      updateCursorAfterProcessing(db, "group-c", "2026-01-01T00:05:00Z");

      expect(db.getAgentCursor("group-c")).toBe("2026-01-01T00:05:00Z");
    });

    it("should set cursor even when no previous cursor exists", () => {
      updateCursorAfterProcessing(db, "new-group", "2026-01-01T00:01:00Z");

      expect(db.getAgentCursor("new-group")).toBe("2026-01-01T00:01:00Z");
    });
  });
});
