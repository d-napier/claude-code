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
      let processCount = 0;
      queue.setProcessFn(async (_g, _msg, abort) => {
        processCount++;
        if (processCount === 1) {
          // First call: slow task that responds to abort
          try {
            await new Promise((resolve, reject) => {
              abort.signal.addEventListener("abort", () => reject(new Error("aborted")));
              setTimeout(resolve, 5000);
            });
          } catch {
            aborted = true;
            throw new Error("aborted");
          }
        }
        // Second call (urgent): complete quickly
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
