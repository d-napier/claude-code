/**
 * Approval registry with Promise-based suspension for HITL approval flow.
 *
 * Flow:
 * 1. PreToolUse hook detects high-risk tool call
 * 2. Creates a Promise stored in registry keyed by approval ID
 * 3. Emits `approval:request` via EventBus
 * 4. Awaits the Promise (blocks tool call)
 * 5. WS handler resolves/rejects Promise on client response
 * 6. Hook returns approve/deny
 */
import { randomUUID } from "crypto";
import { eventBus } from "../event-bus.js";

export interface ApprovalDetails {
  folder: string;
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  reason: string;
}

export interface ApprovalResult {
  approved: boolean;
  reason?: string;
}

interface PendingApproval {
  id: string;
  details: ApprovalDetails;
  createdAt: number;
  resolve: (result: ApprovalResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

class ApprovalRegistry {
  private pending = new Map<string, PendingApproval>();
  private timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Request approval for a tool call. Returns a Promise that resolves
   * when the approval is granted/denied or times out (auto-deny).
   */
  requestApproval(details: ApprovalDetails): Promise<ApprovalResult> {
    const id = randomUUID();

    return new Promise<ApprovalResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ approved: false, reason: "Approval timed out" });
      }, this.timeoutMs);

      this.pending.set(id, {
        id,
        details,
        createdAt: Date.now(),
        resolve,
        timer,
      });

      // Emit approval request event via EventBus
      eventBus.emitApprovalRequest(
        id,
        details.folder,
        details.sessionId,
        details.toolName,
        details.toolInput,
        details.reason,
      );
    });
  }

  /**
   * Resolve a pending approval (called from WS handler).
   * Returns true if the approval was found and resolved.
   */
  resolveApproval(id: string, approved: boolean, reason?: string): boolean {
    const entry = this.pending.get(id);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pending.delete(id);
    entry.resolve({ approved, reason });
    return true;
  }

  /**
   * Get all pending approvals for display in the UI.
   */
  getPendingApprovals(): Array<{
    id: string;
    details: ApprovalDetails;
    createdAt: number;
  }> {
    return Array.from(this.pending.values()).map(({ id, details, createdAt }) => ({
      id,
      details,
      createdAt,
    }));
  }

  /**
   * Clear all pending approvals (e.g., on shutdown).
   */
  clear(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.resolve({ approved: false, reason: "Registry cleared" });
    }
    this.pending.clear();
  }
}

/** Singleton approval registry. */
export const approvalRegistry = new ApprovalRegistry();
