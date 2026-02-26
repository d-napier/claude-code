import { Channel, ChannelMessage } from "./types.js";

export function connect(config: Record<string, string>): Channel {
  console.log("[telegram] connecting with config:", Object.keys(config).join(", "));

  return {
    name: "telegram",

    async fetchMessages(since?: string): Promise<ChannelMessage[]> {
      console.log(`[telegram] fetching messages${since ? ` since ${since}` : ""}`);
      return [];
    },

    async sendMessage(chatId: string, text: string): Promise<void> {
      console.log(`[telegram] sending to ${chatId}: ${text}`);
    },
  };
}
