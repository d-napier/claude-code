"use client";

import { useEffect, useRef } from "react";
import { MessageBubble, type Message } from "./message-bubble";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { QueueMode } from "@/lib/types";

interface ConversationViewProps {
  messages: Message[];
  isProcessing?: boolean;
  queueMode?: QueueMode;
}

const queueModeLabels: Record<QueueMode, { label: string; variant: "default" | "secondary" | "outline" }> = {
  collect: { label: "Collect", variant: "secondary" },
  followup: { label: "Follow-up", variant: "default" },
  interrupt: { label: "Interrupt", variant: "outline" },
};

export function ConversationView({
  messages,
  isProcessing = false,
  queueMode,
}: ConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isProcessing]);

  return (
    <div className="flex h-full flex-col">
      {/* Queue mode header */}
      {queueMode && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <span className="text-xs text-muted-foreground">Queue mode:</span>
          <Badge variant={queueModeLabels[queueMode].variant}>
            {queueModeLabels[queueMode].label}
          </Badge>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No messages in this session yet.
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-lg bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
                <span className="animate-pulse">Processing...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
