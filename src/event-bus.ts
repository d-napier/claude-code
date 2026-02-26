/**
 * EventEmitter-based event bus bridging orchestrator to WebSocket server.
 *
 * Typed with the event types from events.ts. Connects:
 * - agent-runner emits during message stream -> EventBus -> WS server -> browser
 * - GroupQueue status changes -> EventBus -> WS server -> browser
 */
import { EventEmitter } from "events";
import type {
  WsEvent,
  WsEventType,
  AgentStatusEvent,
  AgentOutputEvent,
  SessionUpdateEvent,
  TaskUpdateEvent,
  ApprovalRequestEvent,
  ErrorAgentEvent,
  MetricsUpdateEvent,
} from "./api/events.js";

type EventMap = {
  "agent:status": [AgentStatusEvent];
  "agent:output": [AgentOutputEvent];
  "session:update": [SessionUpdateEvent];
  "task:update": [TaskUpdateEvent];
  "approval:request": [ApprovalRequestEvent];
  "error:agent": [ErrorAgentEvent];
  "metrics:update": [MetricsUpdateEvent];
  "*": [WsEvent];
};

export class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Allow many listeners (one per WS client subscription, hooks, etc.)
    this.emitter.setMaxListeners(100);
  }

  on<K extends keyof EventMap>(event: K, listener: (...args: EventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  off<K extends keyof EventMap>(event: K, listener: (...args: EventMap[K]) => void): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  emit<K extends WsEventType>(event: K, data: WsEvent & { type: K }): void {
    this.emitter.emit(event, data);
    this.emitter.emit("*", data);
  }

  /**
   * Helper: emit an agent status change.
   */
  emitAgentStatus(folder: string, status: string, sessionId?: string): void {
    this.emit("agent:status", {
      type: "agent:status",
      timestamp: new Date().toISOString(),
      payload: { folder, status, sessionId },
    });
  }

  /**
   * Helper: emit agent output text.
   */
  emitAgentOutput(folder: string, sessionId: string, text: string, isPartial?: boolean): void {
    this.emit("agent:output", {
      type: "agent:output",
      timestamp: new Date().toISOString(),
      payload: { folder, sessionId, text, isPartial },
    });
  }

  /**
   * Helper: emit a task update.
   */
  emitTaskUpdate(taskId: string, status: string, nextRun?: string): void {
    this.emit("task:update", {
      type: "task:update",
      timestamp: new Date().toISOString(),
      payload: { taskId, status, nextRun },
    });
  }

  /**
   * Helper: emit an agent error.
   */
  emitAgentError(folder: string, error: string, sessionId?: string, errorSubtype?: string): void {
    this.emit("error:agent", {
      type: "error:agent",
      timestamp: new Date().toISOString(),
      payload: { folder, error, sessionId, errorSubtype },
    });
  }

  /**
   * Helper: emit an approval request.
   */
  emitApprovalRequest(
    approvalId: string,
    folder: string,
    sessionId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    reason: string,
  ): void {
    this.emit("approval:request", {
      type: "approval:request",
      timestamp: new Date().toISOString(),
      payload: { approvalId, folder, sessionId, toolName, toolInput, reason },
    });
  }

  /**
   * Helper: emit metrics update.
   */
  emitMetrics(activeAgents: number, totalCostUsd: number, queueDepth: number): void {
    this.emit("metrics:update", {
      type: "metrics:update",
      timestamp: new Date().toISOString(),
      payload: { activeAgents, totalCostUsd, queueDepth },
    });
  }
}

/** Singleton event bus instance. */
export const eventBus = new EventBus();
