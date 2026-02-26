import fs from "fs";
import path from "path";
import type { GroupQueue } from "./group-queue.js";
import type { Database } from "./db.js";

export interface IpcMessage {
  type: "message";
  text: string;
  sender: string;
  timestamp: string;
}

export interface IpcTask {
  type: "task";
  prompt: string;
  scheduleType: "cron" | "interval" | "once";
  scheduleValue: string;
  groupFolder: string;
}

export type IpcPayload = IpcMessage | IpcTask;

/**
 * Move a file to the errors/ directory under the group's IPC folder.
 */
async function moveToErrors(
  filePath: string,
  groupIpcDir: string
): Promise<void> {
  const errorsDir = path.join(groupIpcDir, "errors");
  await fs.promises.mkdir(errorsDir, { recursive: true });
  const dest = path.join(errorsDir, path.basename(filePath));
  await fs.promises.rename(filePath, dest);
}

/**
 * List .json files in a directory, ignoring .tmp files (in-progress writes).
 * Returns an empty array if the directory does not exist.
 */
async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(dir);
    return entries
      .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"))
      .sort()
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/**
 * Process message files from a group's IPC messages directory.
 * Each file is read, parsed, enqueued, then deleted. On failure the file
 * is moved to the errors/ subdirectory.
 */
async function processMessageFiles(
  groupFolder: string,
  groupIpcDir: string,
  queue: GroupQueue
): Promise<void> {
  const messagesDir = path.join(groupIpcDir, "messages");
  const files = await listJsonFiles(messagesDir);

  for (const file of files) {
    try {
      const raw = await fs.promises.readFile(file, "utf-8");
      const data: IpcMessage = JSON.parse(raw);

      if (data.type !== "message" || typeof data.text !== "string") {
        throw new Error("Invalid IPC message format");
      }

      await queue.enqueue(
        groupFolder,
        data.text,
        `ipc-${path.basename(file)}`
      );
      await fs.promises.unlink(file);
    } catch {
      await moveToErrors(file, groupIpcDir);
    }
  }
}

/**
 * Process task files from a group's IPC tasks directory.
 * Each file is read, parsed, persisted to the database, then deleted.
 * On failure the file is moved to the errors/ subdirectory.
 */
async function processTaskFiles(
  groupFolder: string,
  groupIpcDir: string,
  db: Database
): Promise<void> {
  const tasksDir = path.join(groupIpcDir, "tasks");
  const files = await listJsonFiles(tasksDir);

  for (const file of files) {
    try {
      const raw = await fs.promises.readFile(file, "utf-8");
      const data: IpcTask = JSON.parse(raw);

      if (
        data.type !== "task" ||
        typeof data.prompt !== "string" ||
        typeof data.scheduleType !== "string" ||
        typeof data.scheduleValue !== "string"
      ) {
        throw new Error("Invalid IPC task format");
      }

      db.createTask({
        prompt: data.prompt,
        scheduleType: data.scheduleType,
        scheduleValue: data.scheduleValue,
        groupFolder: data.groupFolder || groupFolder,
        status: "active",
        nextRun:
          data.scheduleType === "once" ? data.scheduleValue : undefined,
      });

      await fs.promises.unlink(file);
    } catch {
      await moveToErrors(file, groupIpcDir);
    }
  }
}

/**
 * Start the IPC watcher that polls group directories for message and task files.
 *
 * @param queue - The GroupQueue to enqueue incoming messages into
 * @param db - The Database for persisting tasks
 * @param groups - Array of group folder names to watch
 * @param pollInterval - Polling interval in milliseconds (default 1000)
 * @returns An object with a `stop()` method to halt the watcher
 */
export function startIpcWatcher(
  queue: GroupQueue,
  db: Database,
  groups: string[],
  pollInterval: number = 1000
): { stop: () => void } {
  let running = true;

  const poll = async () => {
    while (running) {
      for (const groupFolder of groups) {
        if (!running) break;
        const groupIpcDir = path.join("data", "ipc", groupFolder);
        await processMessageFiles(groupFolder, groupIpcDir, queue);
        await processTaskFiles(groupFolder, groupIpcDir, db);
      }

      if (running) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }
  };

  // Start polling (fire-and-forget)
  poll();

  return {
    stop() {
      running = false;
    },
  };
}

/**
 * Write an IPC message file atomically.
 * Writes to a .tmp file first, then renames for atomic visibility.
 *
 * @param groupFolder - The group folder name (used to resolve the IPC directory)
 * @param message - The IPC payload to write
 */
export async function writeIpcMessage(
  groupFolder: string,
  message: IpcPayload
): Promise<string> {
  const subdir = message.type === "task" ? "tasks" : "messages";
  const dir = path.join("data", "ipc", groupFolder, subdir);
  await fs.promises.mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const filepath = path.join(dir, filename);
  const tmpPath = filepath + ".tmp";

  await fs.promises.writeFile(tmpPath, JSON.stringify(message, null, 2));
  await fs.promises.rename(tmpPath, filepath);

  return filepath;
}
