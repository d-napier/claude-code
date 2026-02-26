import { EventBus } from "./event-bus.js";
import pino from "pino";

const logger = pino({ name: "observability" });

export interface AgentMetrics {
  folder: string;
  sessionId: string;
  turns: number;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  status: string;
  errors: string[];
}

export class MetricsCollector {
  private startTime: number = 0;
  private turns: number = 0;
  private toolCalls: number = 0;
  private errors: string[] = [];

  constructor(
    private folder: string,
    private sessionId: string,
  ) {
    this.startTime = Date.now();
  }

  recordTurn(): void {
    this.turns++;
  }

  recordToolCall(toolName: string): void {
    this.toolCalls++;
    logger.debug({ folder: this.folder, toolName }, "Tool call recorded");
  }

  recordError(error: string): void {
    this.errors.push(error);
    logger.warn({ folder: this.folder, error }, "Agent error recorded");
  }

  finalize(costUsd: number, status: string): AgentMetrics {
    const metrics: AgentMetrics = {
      folder: this.folder,
      sessionId: this.sessionId,
      turns: this.turns,
      toolCalls: this.toolCalls,
      inputTokens: 0,
      outputTokens: 0,
      costUsd,
      durationMs: Date.now() - this.startTime,
      status,
      errors: this.errors,
    };

    logger.info(
      {
        folder: metrics.folder,
        turns: metrics.turns,
        toolCalls: metrics.toolCalls,
        costUsd: metrics.costUsd,
        durationMs: metrics.durationMs,
        status: metrics.status,
      },
      "Agent run metrics"
    );

    return metrics;
  }
}
