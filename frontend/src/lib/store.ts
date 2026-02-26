import { create } from "zustand";
import type {
  AgentState,
  SessionState,
  TaskState,
  ApprovalState,
  AgentStatusEvent,
  AgentOutputEvent,
  SessionUpdateEvent,
  QueueDepthEvent,
  MetricsTickEvent,
  ApprovalRequestEvent,
  ApprovalResolvedEvent,
  TaskCompletedEvent,
  StateSnapshot,
  ServerEvent,
  UserRole,
} from "./types";

const MAX_OUTPUT_LINES = 500;

export interface AppStore {
  // User role
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  canWrite: () => boolean;
  isAdmin: () => boolean;

  // Connection status
  wsStatus: "connecting" | "open" | "closed";
  setWsStatus: (status: "connecting" | "open" | "closed") => void;

  // Agents keyed by folder
  agents: Record<string, AgentState>;
  updateAgent: (event: AgentStatusEvent) => void;

  // Sessions keyed by session id
  sessions: Record<string, SessionState>;
  updateSession: (event: SessionUpdateEvent) => void;

  // Tasks keyed by task id
  tasks: Record<string, TaskState>;
  updateTask: (task: TaskState) => void;
  completeTask: (event: TaskCompletedEvent) => void;

  // Approvals as array (pending approvals are small and ordered)
  approvals: ApprovalState[];
  addApproval: (event: ApprovalRequestEvent) => void;
  resolveApproval: (event: ApprovalResolvedEvent) => void;

  // Live output lines keyed by sessionId, capped at MAX_OUTPUT_LINES
  liveOutputs: Record<string, string[]>;
  addOutput: (event: AgentOutputEvent) => void;
  clearOutput: (sessionId: string) => void;

  // Queue depths keyed by folder
  updateQueueDepth: (event: QueueDepthEvent) => void;

  // Metrics
  metrics: MetricsTickEvent;
  updateMetrics: (event: MetricsTickEvent) => void;

  // Snapshot reconciliation after WS reconnect
  applySnapshot: (snapshot: StateSnapshot) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // --- User Role ---
  userRole: "admin",
  setUserRole: (role) => set({ userRole: role }),
  canWrite: () => get().userRole !== "viewer",
  isAdmin: () => get().userRole === "admin",

  // --- Connection ---
  wsStatus: "connecting",
  setWsStatus: (status) => set({ wsStatus: status }),

  // --- Agents ---
  agents: {},
  updateAgent: (event) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [event.folder]: {
          ...(state.agents[event.folder] ?? {
            folder: event.folder,
            queueMode: "followup" as const,
            queueDepth: 0,
            cost: 0,
          }),
          folder: event.folder,
          status: event.status,
          sessionId: event.sessionId,
          queueDepth: event.queueDepth,
          cost: event.cost,
          lastActive: new Date().toISOString(),
        },
      },
    })),

  // --- Sessions ---
  sessions: {},
  updateSession: (event) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [event.id]: {
          id: event.id,
          agentFolder: event.agentFolder,
          status: event.status,
          startedAt: event.startedAt,
          messageCount: event.messageCount,
          cost: event.cost,
        },
      },
    })),

  // --- Tasks ---
  tasks: {},
  updateTask: (task) =>
    set((state) => ({
      tasks: {
        ...state.tasks,
        [task.id]: task,
      },
    })),
  completeTask: (event) =>
    set((state) => {
      const existing = state.tasks[event.id];
      if (!existing) return state;
      return {
        tasks: {
          ...state.tasks,
          [event.id]: {
            ...existing,
            status: event.status,
            nextRun: event.nextRun,
          },
        },
      };
    }),

  // --- Approvals ---
  approvals: [],
  addApproval: (event) =>
    set((state) => ({
      approvals: [
        ...state.approvals,
        {
          id: event.id,
          agentFolder: event.agentFolder,
          toolName: event.toolName,
          toolInput: event.toolInput,
          riskLevel: event.riskLevel,
          requestedAt: event.requestedAt,
          expiresAt: event.expiresAt,
          status: "pending" as const,
        },
      ],
    })),
  resolveApproval: (event) =>
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === event.id ? { ...a, status: event.status } : a
      ),
    })),

  // --- Live Outputs ---
  liveOutputs: {},
  addOutput: (event) =>
    set((state) => {
      const existing = state.liveOutputs[event.sessionId] ?? [];
      const updated = [...existing, event.content].slice(-MAX_OUTPUT_LINES);
      return {
        liveOutputs: {
          ...state.liveOutputs,
          [event.sessionId]: updated,
        },
      };
    }),
  clearOutput: (sessionId) =>
    set((state) => {
      const { [sessionId]: _, ...rest } = state.liveOutputs;
      return { liveOutputs: rest };
    }),

  // --- Queue Depths ---
  updateQueueDepth: (event) =>
    set((state) => {
      const agent = state.agents[event.folder];
      if (!agent) return state;
      return {
        agents: {
          ...state.agents,
          [event.folder]: { ...agent, queueDepth: event.depth },
        },
      };
    }),

  // --- Metrics ---
  metrics: {
    totalCost: 0,
    activeSessions: 0,
    totalAgents: 0,
    pendingApprovals: 0,
  },
  updateMetrics: (event) => set({ metrics: event }),

  // --- Snapshot Reconciliation ---
  applySnapshot: (snapshot) =>
    set(() => {
      const agents: Record<string, AgentState> = {};
      for (const [folder, event] of Object.entries(snapshot.agents)) {
        agents[folder] = {
          folder,
          status: event.status,
          sessionId: event.sessionId,
          queueMode: "followup",
          queueDepth: snapshot.queueDepths[folder] ?? event.queueDepth,
          cost: event.cost,
        };
      }

      const sessions: Record<string, SessionState> = {};
      for (const [id, event] of Object.entries(snapshot.sessions ?? {})) {
        sessions[id] = {
          id,
          agentFolder: event.agentFolder,
          status: event.status,
          startedAt: event.startedAt,
          messageCount: event.messageCount,
          cost: event.cost,
        };
      }

      const tasks: Record<string, TaskState> = {};
      for (const [id, task] of Object.entries(snapshot.tasks ?? {})) {
        tasks[id] = task;
      }

      const approvals: ApprovalState[] = (snapshot.approvals ?? []).map((a) => ({
        id: a.id,
        agentFolder: a.agentFolder,
        toolName: a.toolName,
        toolInput: a.toolInput,
        riskLevel: a.riskLevel,
        requestedAt: a.requestedAt,
        expiresAt: a.expiresAt,
        status: a.status,
      }));

      return { agents, sessions, tasks, approvals, liveOutputs: {} };
    }),
}));

/**
 * Dispatch a server event to the appropriate store action.
 */
export function dispatchServerEvent(event: ServerEvent): void {
  const store = useAppStore.getState();

  switch (event.type) {
    case "agent:status":
      store.updateAgent(event.payload);
      break;
    case "agent:output":
      store.addOutput(event.payload);
      break;
    case "agent:error":
      // Update agent status to error
      store.updateAgent({
        folder: event.payload.folder,
        status: "error",
        sessionId: event.payload.sessionId,
        queueDepth: 0,
        cost: 0,
      });
      break;
    case "session:update":
      store.updateSession(event.payload);
      break;
    case "queue:depth":
      store.updateQueueDepth(event.payload);
      break;
    case "metrics:tick":
      store.updateMetrics(event.payload);
      break;
    case "approval:request":
      store.addApproval(event.payload);
      break;
    case "approval:resolved":
      store.resolveApproval(event.payload);
      break;
    case "task:fired":
      // Task fired is informational; no store update needed
      break;
    case "task:completed":
      store.completeTask(event.payload);
      break;
  }
}
