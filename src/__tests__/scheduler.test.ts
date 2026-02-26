import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Database } from "../db.js";
import { GroupQueue } from "../group-queue.js";
import { startSchedulerLoop, stopSchedulerLoop, resetSchedulerLoop } from "../scheduler.js";
import fs from "fs";
import path from "path";
import os from "os";

describe("scheduler", () => {
  let db: Database;
  let queue: GroupQueue;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `scheduler-test-${Date.now()}.db`);
    db = new Database(dbPath);
    queue = new GroupQueue(5);
    resetSchedulerLoop();
  });

  afterEach(() => {
    stopSchedulerLoop();
    db.close();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // ignore
    }
  });

  it("should find and enqueue due tasks", async () => {
    const enqueueSpy = vi.spyOn(queue, "enqueue");

    // Create a task that is already due
    const pastTime = new Date(Date.now() - 60_000).toISOString();
    db.createTask({
      prompt: "Run daily report",
      scheduleType: "once",
      scheduleValue: "",
      groupFolder: "test-group",
      status: "active",
      nextRun: pastTime,
    });

    // Run one iteration of the scheduler then stop
    const loopPromise = startSchedulerLoop(queue, db, 50);

    // Wait for one poll cycle then stop
    await new Promise(resolve => setTimeout(resolve, 100));
    stopSchedulerLoop();
    await loopPromise;

    expect(enqueueSpy).toHaveBeenCalledWith("test-group", "Run daily report");
  });

  it("should mark one-time tasks as completed after execution", async () => {
    const pastTime = new Date(Date.now() - 60_000).toISOString();
    const taskId = db.createTask({
      prompt: "One-time task",
      scheduleType: "once",
      scheduleValue: "",
      groupFolder: "test-group",
      status: "active",
      nextRun: pastTime,
    });

    const loopPromise = startSchedulerLoop(queue, db, 50);

    await new Promise(resolve => setTimeout(resolve, 100));
    stopSchedulerLoop();
    await loopPromise;

    const task = db.getTask(taskId);
    expect(task?.status).toBe("completed");
  });

  it("should compute next run for cron tasks", async () => {
    const pastTime = new Date(Date.now() - 60_000).toISOString();
    const taskId = db.createTask({
      prompt: "Cron task",
      scheduleType: "cron",
      scheduleValue: "0 * * * *", // Every hour
      groupFolder: "test-group",
      status: "active",
      nextRun: pastTime,
    });

    const loopPromise = startSchedulerLoop(queue, db, 50);

    await new Promise(resolve => setTimeout(resolve, 100));
    stopSchedulerLoop();
    await loopPromise;

    const task = db.getTask(taskId);
    expect(task?.nextRun).toBeDefined();
    // Next run should be in the future
    expect(new Date(task!.nextRun!).getTime()).toBeGreaterThan(Date.now() - 5000);
  });

  it("should compute next run for interval tasks", async () => {
    const pastTime = new Date(Date.now() - 60_000).toISOString();
    const intervalMs = "300000"; // 5 minutes
    const taskId = db.createTask({
      prompt: "Interval task",
      scheduleType: "interval",
      scheduleValue: intervalMs,
      groupFolder: "test-group",
      status: "active",
      nextRun: pastTime,
    });

    const loopPromise = startSchedulerLoop(queue, db, 50);

    await new Promise(resolve => setTimeout(resolve, 100));
    stopSchedulerLoop();
    await loopPromise;

    const task = db.getTask(taskId);
    expect(task?.nextRun).toBeDefined();
    const nextRunTime = new Date(task!.nextRun!).getTime();
    // Next run should be approximately 5 minutes from now
    expect(nextRunTime).toBeGreaterThan(Date.now() + 200_000);
    expect(nextRunTime).toBeLessThan(Date.now() + 400_000);
  });

  it("should not enqueue tasks that are not yet due", async () => {
    const enqueueSpy = vi.spyOn(queue, "enqueue");

    // Create a task that is due in the future
    const futureTime = new Date(Date.now() + 3_600_000).toISOString();
    db.createTask({
      prompt: "Future task",
      scheduleType: "once",
      scheduleValue: "",
      groupFolder: "test-group",
      status: "active",
      nextRun: futureTime,
    });

    const loopPromise = startSchedulerLoop(queue, db, 50);

    await new Promise(resolve => setTimeout(resolve, 100));
    stopSchedulerLoop();
    await loopPromise;

    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it("should not enqueue paused tasks", async () => {
    const enqueueSpy = vi.spyOn(queue, "enqueue");

    const pastTime = new Date(Date.now() - 60_000).toISOString();
    db.createTask({
      prompt: "Paused task",
      scheduleType: "once",
      scheduleValue: "",
      groupFolder: "test-group",
      status: "paused",
      nextRun: pastTime,
    });

    const loopPromise = startSchedulerLoop(queue, db, 50);

    await new Promise(resolve => setTimeout(resolve, 100));
    stopSchedulerLoop();
    await loopPromise;

    expect(enqueueSpy).not.toHaveBeenCalled();
  });
});
