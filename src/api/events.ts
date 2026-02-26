/**
 * Event type definitions for WebSocket protocol.
 */

export type WsEventType =
  | "agent:status"
  | "agent:output"
  | "session:update"
  | "task:update"
  | "approval:request"
  | "error:agent"
  | "metrics:update";

export interface WsEvent {
  type: WsEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface AgentStatusEvent extends WsEvent {
  type: "agent:status";
  payload: {
    folder: string;
    status: string;
    sessionId?: string;
  };
}

export interface AgentOutputEvent extends WsEvent {
  type: "agent:output";
  payload: {
    folder: string;
    sessionId: string;
    text: string;
    isPartial?: boolean;
  };
}

export interface SessionUpdateEvent extends WsEvent {
  type: "session:update";
  payload: {
    sessionId: string;
    folder: string;
    status: string;
  };
}

export interface TaskUpdateEvent extends WsEvent {
  type: "task:update";
  payload: {
    taskId: string;
    status: string;
    nextRun?: string;
  };
}

export interface ApprovalRequestEvent extends WsEvent {
  type: "approval:request";
  payload: {
    approvalId: string;
    folder: string;
    sessionId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    reason: string;
  };
}

export interface ErrorAgentEvent extends WsEvent {
  type: "error:agent";
  payload: {
    folder: string;
    sessionId?: string;
    error: string;
    errorSubtype?: string;
  };
}

export interface MetricsUpdateEvent extends WsEvent {
  type: "metrics:update";
  payload: {
    activeAgents: number;
    totalCostUsd: number;
    queueDepth: number;
  };
}

/**
 * Client-to-server message types.
 */
export type WsClientMessageType =
  | "session:subscribe"
  | "session:unsubscribe"
  | "agent:interrupt"
  | "approval:respond";

export interface WsClientMessage {
  type: WsClientMessageType;
  payload: Record<string, unknown>;
}

export interface SessionSubscribeMessage extends WsClientMessage {
  type: "session:subscribe";
  payload: { sessionId: string };
}

export interface SessionUnsubscribeMessage extends WsClientMessage {
  type: "session:unsubscribe";
  payload: { sessionId: string };
}

export interface AgentInterruptMessage extends WsClientMessage {
  type: "agent:interrupt";
  payload: { folder: string };
}

export interface ApprovalRespondMessage extends WsClientMessage {
  type: "approval:respond";
  payload: {
    approvalId: string;
    approved: boolean;
    reason?: string;
  };
}
