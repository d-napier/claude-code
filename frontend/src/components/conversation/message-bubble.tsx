"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Terminal, Wrench } from "lucide-react";

export type MessageRole = "user" | "assistant" | "system" | "tool_call" | "tool_result" | "result";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: string;
  toolName?: string;
  toolInput?: string;
}

interface MessageBubbleProps {
  message: Message;
}

function roleIcon(role: MessageRole) {
  switch (role) {
    case "user":
      return <User className="h-4 w-4" />;
    case "assistant":
    case "result":
      return <Bot className="h-4 w-4" />;
    case "tool_call":
    case "tool_result":
      return <Wrench className="h-4 w-4" />;
    case "system":
      return <Terminal className="h-4 w-4" />;
  }
}

function roleLabel(role: MessageRole) {
  switch (role) {
    case "user":
      return "User";
    case "assistant":
      return "Assistant";
    case "tool_call":
      return "Tool Call";
    case "tool_result":
      return "Tool Result";
    case "system":
      return "System";
    case "result":
      return "Result";
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool_call" || message.role === "tool_result";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : isTool
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              : isSystem
                ? "bg-muted text-muted-foreground"
                : "bg-secondary text-secondary-foreground"
        )}
      >
        {roleIcon(message.role)}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1 rounded-lg px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : isTool
              ? "border border-amber-200 bg-amber-50 text-foreground dark:border-amber-800 dark:bg-amber-950"
              : isSystem
                ? "bg-muted text-muted-foreground"
                : "bg-secondary text-secondary-foreground"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase opacity-70">
            {roleLabel(message.role)}
          </span>
          {message.toolName && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {message.toolName}
            </Badge>
          )}
          {message.timestamp && (
            <span className="text-[10px] opacity-50">{message.timestamp}</span>
          )}
        </div>

        {/* Content */}
        {isTool && message.toolInput ? (
          <div className="space-y-1">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
              {message.toolInput}
            </pre>
            {message.content && (
              <div className="border-t border-amber-200 pt-1 dark:border-amber-800">
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed opacity-80">
                  {message.content}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
