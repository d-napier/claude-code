import { Database, MessageRow } from "./db.js";
import { GroupQueue } from "./group-queue.js";

/**
 * Format recovered messages into a single text block for the agent.
 */
function formatMessages(messages: MessageRow[]): string {
  return messages
    .map((m) => `[${m.sender} @ ${m.timestamp}]: ${m.text}`)
    .join("\n");
}

/**
 * On startup, check each registered group's last cursor position,
 * fetch any messages that arrived since the cursor from the database,
 * and re-enqueue those messages to the GroupQueue for processing.
 */
export async function recoverPendingMessages(
  queue: GroupQueue,
  db: Database
): Promise<number> {
  const groups = db.getAllGroups();
  let totalRecovered = 0;

  for (const group of groups) {
    const cursor = db.getAgentCursor(group.folder) ?? "";
    const pending = db.getMessagesSince(group.chatJid, cursor);

    if (pending.length > 0) {
      console.log(
        `Recovering ${pending.length} messages for ${group.folder}`
      );
      const combined = formatMessages(pending);
      await queue.enqueue(group.folder, combined, undefined);
      totalRecovered += pending.length;
    }
  }

  return totalRecovered;
}

/**
 * Update the cursor for a group after successfully processing messages.
 * The cursor is set to the timestamp of the last processed message so
 * that subsequent recovery only picks up newer messages.
 */
export function updateCursorAfterProcessing(
  db: Database,
  groupFolder: string,
  lastMessageTimestamp: string
): void {
  db.setAgentCursor(groupFolder, lastMessageTimestamp);
}
