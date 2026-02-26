import { CronExpressionParser } from "cron-parser";
import type { GroupQueue } from "./group-queue.js";
import type { Database } from "./db.js";

let shuttingDown = false;

export function stopSchedulerLoop() {
  shuttingDown = true;
}

export function resetSchedulerLoop() {
  shuttingDown = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function startSchedulerLoop(
  queue: GroupQueue,
  db: Database,
  pollInterval: number = 60_000
): Promise<void> {
  while (!shuttingDown) {
    try {
      const dueTasks = db.getDueTasks();

      for (const task of dueTasks) {
        await queue.enqueue(task.groupFolder, task.prompt);

        if (task.scheduleType === "cron") {
          const interval = CronExpressionParser.parse(task.scheduleValue);
          db.updateNextRun(task.id, interval.next().toISOString());
        } else if (task.scheduleType === "interval") {
          const nextRun = new Date(Date.now() + parseInt(task.scheduleValue));
          db.updateNextRun(task.id, nextRun.toISOString());
        } else {
          // "once" — mark completed after execution
          db.setTaskStatus(task.id, "completed");
        }
      }
    } catch (err) {
      console.error("[scheduler] Error processing due tasks:", err);
    }

    await sleep(pollInterval);
  }
}
