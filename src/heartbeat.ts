import type { GroupQueue } from "./group-queue.js";

let shuttingDown = false;

export function stopHeartbeatLoop() {
  shuttingDown = true;
}

export function resetHeartbeatLoop() {
  shuttingDown = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const HEARTBEAT_PROMPT =
  "HEARTBEAT: Check if there is any pending work or proactive action needed. " +
  "If nothing needs attention, respond with HEARTBEAT_OK.";

export async function startHeartbeatLoop(
  queue: GroupQueue,
  groups: Map<string, { folder: string }>,
  intervalMs: number = 30 * 60 * 1000
): Promise<void> {
  while (!shuttingDown) {
    for (const [folder] of groups) {
      try {
        await queue.enqueue(folder, HEARTBEAT_PROMPT);
      } catch (err) {
        console.error(`[heartbeat] Error enqueuing heartbeat for ${folder}:`, err);
      }
    }

    await sleep(intervalMs);
  }
}
