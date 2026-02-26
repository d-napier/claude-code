export interface AgentResult {
  text: string;
  sessionId: string;
  cost: number;
  status: "success" | "error" | "timeout";
  errorSubtype?: string;
}

export type AgentStatus = "idle" | "running" | "queued" | "error" | "timeout";
export type SessionStatus = "active" | "completed" | "error" | "timeout";
export type QueueMode = "collect" | "followup" | "interrupt";

export interface AgentConfig {
  folder: string;
  model?: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  allowedTools?: string[];
  queueMode: QueueMode;
  debounceMs: number;
  maxRetries: number;
  systemPromptAppend?: string;
}
