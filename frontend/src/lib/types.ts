// Frontend type definitions
// All interfaces use `folder` as the canonical agent identifier.

// --- RBAC ---

export type UserRole = "admin" | "operator" | "viewer";

// --- Agent ---

export type AgentStatus = "idle" | "running" | "error" | "queued";
export type QueueMode = "collect" | "followup" | "interrupt";

export interface AgentState {
  folder: string;
  status: AgentStatus;
  sessionId?: string;
  queueMode: QueueMode;
  queueDepth: number;
  cost: number;
  lastActive?: string;
}

// --- Session ---

export type SessionStatus = "active" | "completed" | "error" | "timeout";

export interface SessionState {
  id: string;
  agentFolder: string;
  status: SessionStatus;
  startedAt: string;
  messageCount: number;
  cost: number;
}

// --- Task ---

export type ScheduleType = "cron" | "interval" | "once";
export type TaskStatus = "active" | "paused" | "completed";

export interface TaskState {
  id: string;
  prompt: string;
  scheduleType: ScheduleType;
  scheduleValue: string;
  groupFolder: string;
  status: TaskStatus;
  nextRun?: string;
  createdAt: string;
}

// --- Approval ---

export type RiskLevel = "medium" | "medium-high" | "high" | "critical";
export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

export interface ApprovalState {
  id: string;
  agentFolder: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: RiskLevel;
  requestedAt: string;
  expiresAt: string;
  status: ApprovalStatus;
}

// --- WebSocket Events (Server -> Client) ---

export interface AgentStatusEvent {
  folder: string;
  status: AgentStatus;
  sessionId?: string;
  queueDepth: number;
  cost: number;
}

export interface AgentOutputEvent {
  sessionId: string;
  content: string;
  timestamp: string;
}

export interface AgentErrorEvent {
  folder: string;
  sessionId?: string;
  error: string;
  timestamp: string;
}

export interface SessionUpdateEvent {
  id: string;
  agentFolder: string;
  status: SessionStatus;
  messageCount: number;
  cost: number;
  startedAt: string;
}

export interface QueueDepthEvent {
  folder: string;
  depth: number;
}

export interface MetricsTickEvent {
  totalCost: number;
  activeSessions: number;
  totalAgents: number;
  pendingApprovals: number;
}

export interface ApprovalRequestEvent {
  id: string;
  agentFolder: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: RiskLevel;
  requestedAt: string;
  expiresAt: string;
}

export interface ApprovalResolvedEvent {
  id: string;
  status: "approved" | "denied" | "expired";
}

export interface TaskFiredEvent {
  id: string;
  folder: string;
  prompt: string;
}

export interface TaskCompletedEvent {
  id: string;
  status: TaskStatus;
  nextRun?: string;
}

export type ServerEvent =
  | { type: "agent:status"; payload: AgentStatusEvent }
  | { type: "agent:output"; payload: AgentOutputEvent }
  | { type: "agent:error"; payload: AgentErrorEvent }
  | { type: "session:update"; payload: SessionUpdateEvent }
  | { type: "queue:depth"; payload: QueueDepthEvent }
  | { type: "metrics:tick"; payload: MetricsTickEvent }
  | { type: "approval:request"; payload: ApprovalRequestEvent }
  | { type: "approval:resolved"; payload: ApprovalResolvedEvent }
  | { type: "task:fired"; payload: TaskFiredEvent }
  | { type: "task:completed"; payload: TaskCompletedEvent };

// --- WebSocket Commands (Client -> Server) ---

export type ClientMessage =
  | { type: "approval:respond"; payload: { id: string; decision: "approved" | "denied" } }
  | { type: "agent:interrupt"; payload: { folder: string } }
  | { type: "session:subscribe"; payload: { sessionId: string } }
  | { type: "session:unsubscribe"; payload: { sessionId: string } };

// --- State Snapshot (for reconnect reconciliation) ---

export interface StateSnapshot {
  agents: Record<string, AgentStatusEvent>;
  sessions: Record<string, SessionUpdateEvent>;
  tasks: Record<string, TaskState>;
  approvals: ApprovalState[];
  queueDepths: Record<string, number>;
}
