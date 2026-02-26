import type { Channel, ChannelMessage } from "./channels/types.js";
import type { GroupQueue } from "./group-queue.js";
import type { Database } from "./db.js";

let shuttingDown = false;

export function stopMessageLoop() {
  shuttingDown = true;
}

export function resetMessageLoop() {
  shuttingDown = false;
}

const TRIGGER_PATTERN = /^[!\/]|@agent|@bot/i;

function formatMessage(channel: string, msg: ChannelMessage): string {
  return `[${channel}] ${msg.sender} (${msg.timestamp}): ${msg.text}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function startMessageLoop(
  channels: Channel[],
  queue: GroupQueue,
  db: Database,
  pollInterval: number = 2000
): Promise<void> {
  while (!shuttingDown) {
    for (const channel of channels) {
      try {
        const messages = await channel.fetchMessages();

        for (const msg of messages) {
          // Look up which group this chat belongs to
          const groups = db.getAllGroups();
          const group = groups.find(g => g.chatJid === msg.chatId);
          if (!group) continue;

          // Non-main groups require a trigger pattern
          if (!group.isMain && !TRIGGER_PATTERN.test(msg.text)) continue;

          // Dedup key prevents reprocessing on polling overlap
          const dedupKey = `${channel.name}:${msg.messageId}`;

          // Store message in DB for history
          db.storeMessage({
            chatId: msg.chatId,
            messageId: msg.messageId,
            text: msg.text,
            timestamp: msg.timestamp,
            sender: msg.sender,
            isDm: msg.isDm,
            peerId: msg.peerId,
          });

          await queue.enqueue(group.folder, formatMessage(channel.name, msg), dedupKey);
        }
      } catch (err) {
        // Log and continue — one channel failure shouldn't stop the loop
        console.error(`[message-loop] Error polling channel ${channel.name}:`, err);
      }
    }

    await sleep(pollInterval);
  }
}
