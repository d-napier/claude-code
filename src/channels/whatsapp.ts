import { Channel, ChannelMessage } from "./types.js";

export function connect(config: Record<string, string>): Channel {
  console.log("[whatsapp] connecting with config:", Object.keys(config).join(", "));

  return {
    name: "whatsapp",

    async fetchMessages(since?: string): Promise<ChannelMessage[]> {
      console.log(`[whatsapp] fetching messages${since ? ` since ${since}` : ""}`);
      return [];
    },

    async sendMessage(chatId: string, text: string): Promise<void> {
      console.log(`[whatsapp] sending to ${chatId}: ${text}`);
    },
  };
}
