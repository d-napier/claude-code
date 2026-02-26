export interface ChannelMessage {
  chatId: string;
  messageId: string;
  text: string;
  timestamp: string;
  sender: string;
  isDm: boolean;
  peerId?: string;
}

export interface Channel {
  name: string;
  fetchMessages(since?: string): Promise<ChannelMessage[]>;
  sendMessage(chatId: string, text: string): Promise<void>;
}
