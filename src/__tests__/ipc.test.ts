import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { writeIpcMessage, startIpcWatcher } from "../ipc.js";
import type { IpcMessage, IpcTask } from "../ipc.js";
import { Database } from "../db.js";
import { GroupQueue } from "../group-queue.js";

const TEST_IPC_BASE = path.join("data", "ipc", "test-group");
const TEST_DB = "./data/ipc-test.db";

function cleanDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("IPC", () => {
  let db: Database;
  let queue: GroupQueue;

  beforeEach(() => {
    cleanDir(TEST_IPC_BASE);
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    db = new Database(TEST_DB);
    queue = new GroupQueue(5);
  });

  afterEach(() => {
    db.close();
    cleanDir(TEST_IPC_BASE);
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  describe("writeIpcMessage", () => {
    it("should write a message file atomically", async () => {
      const msg: IpcMessage = {
        type: "message",
        text: "Hello from external process",
        sender: "external",
        timestamp: "2026-01-01T00:00:00Z",
      };

      const filepath = await writeIpcMessage("test-group", msg);

      expect(fs.existsSync(filepath)).toBe(true);
      // The .tmp file should not remain
      expect(fs.existsSync(filepath + ".tmp")).toBe(false);

      const content = JSON.parse(fs.readFileSync(filepath, "utf-8"));
      expect(content.type).toBe("message");
      expect(content.text).toBe("Hello from external process");
      expect(content.sender).toBe("external");
    });

    it("should write a task file to the tasks subdirectory", async () => {
      const task: IpcTask = {
        type: "task",
        prompt: "Do something",
        scheduleType: "once",
        scheduleValue: "2026-01-01T00:00:00Z",
        groupFolder: "test-group",
      };

      const filepath = await writeIpcMessage("test-group", task);

      expect(filepath).toContain("tasks");
      expect(fs.existsSync(filepath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filepath, "utf-8"));
      expect(content.type).toBe("task");
      expect(content.prompt).toBe("Do something");
    });
  });

  describe("startIpcWatcher", () => {
    it("should process message files and enqueue them", async () => {
      const enqueued: Array<{ group: string; text: string }> = [];
      queue.enqueue = async (group: string, text: string) => {
        enqueued.push({ group, text });
      };

      // Write a message file
      const msg: IpcMessage = {
        type: "message",
        text: "Hello from IPC",
        sender: "external",
        timestamp: "2026-01-01T00:00:00Z",
      };
      await writeIpcMessage("test-group", msg);

      // Start watcher with short poll interval
      const watcher = startIpcWatcher(queue, db, ["test-group"], 50);

      // Wait for the watcher to process
      await new Promise((resolve) => setTimeout(resolve, 200));
      watcher.stop();

      expect(enqueued.length).toBe(1);
      expect(enqueued[0].text).toBe("Hello from IPC");
      expect(enqueued[0].group).toBe("test-group");

      // File should be deleted after processing
      const remaining = fs.existsSync(
        path.join(TEST_IPC_BASE, "messages")
      )
        ? fs.readdirSync(path.join(TEST_IPC_BASE, "messages")).filter(
            (f) => f.endsWith(".json")
          )
        : [];
      expect(remaining.length).toBe(0);
    });

    it("should process task files and create tasks in database", async () => {
      const task: IpcTask = {
        type: "task",
        prompt: "Scheduled action",
        scheduleType: "once",
        scheduleValue: "2026-06-01T00:00:00Z",
        groupFolder: "test-group",
      };
      await writeIpcMessage("test-group", task);

      const watcher = startIpcWatcher(queue, db, ["test-group"], 50);

      await new Promise((resolve) => setTimeout(resolve, 200));
      watcher.stop();

      const tasks = db.getAllTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].prompt).toBe("Scheduled action");
      expect(tasks[0].scheduleType).toBe("once");
      expect(tasks[0].scheduleValue).toBe("2026-06-01T00:00:00Z");
      expect(tasks[0].groupFolder).toBe("test-group");

      // File should be deleted after processing
      const remaining = fs.existsSync(
        path.join(TEST_IPC_BASE, "tasks")
      )
        ? fs.readdirSync(path.join(TEST_IPC_BASE, "tasks")).filter(
            (f) => f.endsWith(".json")
          )
        : [];
      expect(remaining.length).toBe(0);
    });

    it("should move invalid JSON files to errors directory", async () => {
      // Write an invalid JSON file directly
      const messagesDir = path.join(TEST_IPC_BASE, "messages");
      fs.mkdirSync(messagesDir, { recursive: true });
      const badFile = path.join(messagesDir, "bad-file.json");
      fs.writeFileSync(badFile, "not valid json {{{");

      const watcher = startIpcWatcher(queue, db, ["test-group"], 50);

      await new Promise((resolve) => setTimeout(resolve, 200));
      watcher.stop();

      // Original file should be gone
      expect(fs.existsSync(badFile)).toBe(false);

      // File should be in errors directory
      const errorsDir = path.join(TEST_IPC_BASE, "errors");
      expect(fs.existsSync(errorsDir)).toBe(true);
      const errorFiles = fs.readdirSync(errorsDir);
      expect(errorFiles.length).toBe(1);
      expect(errorFiles[0]).toBe("bad-file.json");
    });

    it("should move files with invalid structure to errors directory", async () => {
      // Write a valid JSON file but with wrong structure
      const messagesDir = path.join(TEST_IPC_BASE, "messages");
      fs.mkdirSync(messagesDir, { recursive: true });
      const badStructure = path.join(messagesDir, "bad-structure.json");
      fs.writeFileSync(
        badStructure,
        JSON.stringify({ type: "unknown", data: 123 })
      );

      const watcher = startIpcWatcher(queue, db, ["test-group"], 50);

      await new Promise((resolve) => setTimeout(resolve, 200));
      watcher.stop();

      expect(fs.existsSync(badStructure)).toBe(false);

      const errorsDir = path.join(TEST_IPC_BASE, "errors");
      const errorFiles = fs.readdirSync(errorsDir);
      expect(errorFiles.length).toBe(1);
      expect(errorFiles[0]).toBe("bad-structure.json");
    });

    it("should ignore .tmp files (in-progress writes)", async () => {
      const messagesDir = path.join(TEST_IPC_BASE, "messages");
      fs.mkdirSync(messagesDir, { recursive: true });
      const tmpFile = path.join(messagesDir, "in-progress.json.tmp");
      fs.writeFileSync(
        tmpFile,
        JSON.stringify({
          type: "message",
          text: "partial write",
          sender: "ext",
          timestamp: "2026-01-01T00:00:00Z",
        })
      );

      const enqueued: string[] = [];
      queue.enqueue = async (_group: string, text: string) => {
        enqueued.push(text);
      };

      const watcher = startIpcWatcher(queue, db, ["test-group"], 50);
      await new Promise((resolve) => setTimeout(resolve, 200));
      watcher.stop();

      // Should not have processed the .tmp file
      expect(enqueued.length).toBe(0);
      // .tmp file should still exist
      expect(fs.existsSync(tmpFile)).toBe(true);
    });
  });
});
