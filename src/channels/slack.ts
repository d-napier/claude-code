import { Channel, ChannelMessage } from "./types.js";

export function connect(config: Record<string, string>): Channel {
  console.log("[slack] connecting with config:", Object.keys(config).join(", "));

  return {
    name: "slack",

    async fetchMessages(since?: string): Promise<ChannelMessage[]> {
      console.log(`[slack] fetching messages${since ? ` since ${since}` : ""}`);
      return [];
    },

    async sendMessage(chatId: string, text: string): Promise<void> {
      console.log(`[slack] sending to ${chatId}: ${text}`);
    },
  };
}
