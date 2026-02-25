import fs from "fs";

interface QueuedMessage {
  text: string;
  timestamp: number;
  id: string;
  retryCount: number;
}

interface GroupState {
  active: boolean;
  abortController?: AbortController;
  pendingMessages: QueuedMessage[];
  batchBuffer: QueuedMessage[];
  debounceTimer?: ReturnType<typeof setTimeout>;
  sessionId?: string;
}

export interface GroupConfig {
  queueMode: "collect" | "followup" | "interrupt";
  debounceMs: number;
  maxRetries: number;
}

export type DeadLetterEntry = {
  message: QueuedMessage;
  groupFolder: string;
  error: string;
  failedAt: string;
};

export class GroupQueue {
  private groups = new Map<string, GroupState>();
  private configs = new Map<string, GroupConfig>();
  private activeCount = 0;
  private waitingGroups: string[] = [];
  private processFn?: (group: string, message: string, abort: AbortController) => Promise<void>;
  private deadLetterFn?: (entry: DeadLetterEntry) => Promise<void>;

  private seenIds = new Map<string, number>();
  private dedupeWindowMs = 30_000;

  private idleResolvers: Array<() => void> = [];

  constructor(private maxConcurrent: number = 5) {}

  setProcessFn(fn: (group: string, message: string, abort: AbortController) => Promise<void>) {
    this.processFn = fn;
  }

  setDeadLetterFn(fn: (entry: DeadLetterEntry) => Promise<void>) {
    this.deadLetterFn = fn;
  }

  setGroupConfig(groupFolder: string, config: GroupConfig) {
    this.configs.set(groupFolder, config);
  }

  private getConfig(groupFolder: string): GroupConfig {
    return this.configs.get(groupFolder) ?? {
      queueMode: "followup",
      debounceMs: 0,
      maxRetries: 3,
    };
  }

  async enqueue(groupFolder: string, message: string, dedupKey?: string) {
    if (dedupKey) {
      const now = Date.now();
      for (const [k, exp] of this.seenIds) {
        if (exp < now) this.seenIds.delete(k);
      }
      const key = `${groupFolder}:${dedupKey}`;
      if (this.seenIds.has(key)) return;
      this.seenIds.set(key, now + this.dedupeWindowMs);
    }

    const state = this.getOrCreateState(groupFolder);
    const queued: QueuedMessage = {
      text: message,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      retryCount: 0,
    };

    if (state.active) {
      this.pipeToActiveSession(groupFolder, state, queued);
      return;
    }

    if (this.activeCount >= this.maxConcurrent) {
      state.pendingMessages.push(queued);
      if (!this.waitingGroups.includes(groupFolder)) {
        this.waitingGroups.push(groupFolder);
      }
      return;
    }

    // Fire-and-forget: don't await so enqueue returns immediately
    this.execute(groupFolder, queued);
  }

  private pipeToActiveSession(
    groupFolder: string,
    state: GroupState,
    queued: QueuedMessage
  ) {
    const config = this.getConfig(groupFolder);

    switch (config.queueMode) {
      case "collect": {
        state.batchBuffer.push(queued);
        if (config.debounceMs > 0) {
          if (state.debounceTimer) clearTimeout(state.debounceTimer);
          state.debounceTimer = setTimeout(() => {
            // Batch will be picked up by drainWaiting after active run finishes
          }, config.debounceMs);
        }
        break;
      }

      case "followup": {
        state.pendingMessages.push(queued);
        break;
      }

      case "interrupt": {
        state.abortController?.abort();
        const requeue = [...state.pendingMessages, queued];
        state.pendingMessages = requeue;
        break;
      }
    }
  }

  private async execute(groupFolder: string, queued: QueuedMessage) {
    const state = this.getOrCreateState(groupFolder);
    const config = this.getConfig(groupFolder);

    state.active = true;
    const abort = new AbortController();
    state.abortController = abort;
    this.activeCount++;

    try {
      await this.processFn?.(groupFolder, queued.text, abort);
    } catch (error) {
      // Don't retry if this was an intentional abort (interrupt mode)
      if (abort.signal.aborted) {
        // Aborted intentionally — don't retry, don't dead-letter
      } else if (queued.retryCount < config.maxRetries) {
        queued.retryCount++;
        // Re-enqueue for retry — don't recurse to avoid double-decrement in finally
        state.pendingMessages.unshift(queued);
      } else {
        await this.writeDeadLetter(groupFolder, queued, String(error));
      }
    } finally {
      state.active = false;
      state.abortController = undefined;
      this.activeCount--;

      if (state.batchBuffer.length > 0) {
        const batchText = state.batchBuffer.map(m => m.text).join("\n\n---\n\n");
        state.batchBuffer = [];
        state.pendingMessages.unshift({
          text: batchText,
          timestamp: Date.now(),
          id: `batch-${Date.now()}`,
          retryCount: 0,
        });
      }

      this.drainWaiting();
      this.checkIdle();
    }
  }

  private drainWaiting() {
    for (const [groupFolder, state] of this.groups) {
      if (
        !state.active &&
        state.pendingMessages.length > 0 &&
        this.activeCount < this.maxConcurrent
      ) {
        const next = state.pendingMessages.shift()!;
        this.execute(groupFolder, next);
      }
    }

    while (this.waitingGroups.length > 0 && this.activeCount < this.maxConcurrent) {
      const next = this.waitingGroups.shift()!;
      const state = this.groups.get(next);
      if (state?.pendingMessages.length) {
        const msg = state.pendingMessages.shift()!;
        this.execute(next, msg);
      }
    }
  }

  private async writeDeadLetter(
    groupFolder: string,
    message: QueuedMessage,
    error: string
  ) {
    const entry: DeadLetterEntry = {
      message,
      groupFolder,
      error,
      failedAt: new Date().toISOString(),
    };

    if (this.deadLetterFn) {
      await this.deadLetterFn(entry);
      return;
    }

    const filename = `${Date.now()}-${message.id}.json`;
    await fs.promises.mkdir("./data/dead-letter", { recursive: true });
    await fs.promises.writeFile(
      `./data/dead-letter/${filename}`,
      JSON.stringify(entry, null, 2)
    );
  }

  async shutdown(timeoutMs: number = 10_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (this.activeCount > 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (this.activeCount > 0) {
      for (const state of this.groups.values()) {
        state.abortController?.abort();
      }
    }

    // Wait briefly for aborted tasks to settle
    await new Promise(resolve => setTimeout(resolve, 50));

    for (const [groupFolder, state] of this.groups) {
      for (const msg of [...state.pendingMessages, ...state.batchBuffer]) {
        await this.writeDeadLetter(groupFolder, msg, "shutdown");
      }
      state.pendingMessages = [];
      state.batchBuffer = [];
    }
  }

  waitForIdle(): Promise<void> {
    if (this.isIdle()) return Promise.resolve();
    return new Promise(resolve => {
      this.idleResolvers.push(resolve);
    });
  }

  private isIdle(): boolean {
    if (this.activeCount > 0) return false;
    for (const state of this.groups.values()) {
      if (state.pendingMessages.length > 0 || state.batchBuffer.length > 0) return false;
    }
    return true;
  }

  private checkIdle() {
    if (this.isIdle() && this.idleResolvers.length > 0) {
      const resolvers = this.idleResolvers.splice(0);
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }

  private getOrCreateState(groupFolder: string): GroupState {
    if (!this.groups.has(groupFolder)) {
      this.groups.set(groupFolder, {
        active: false,
        pendingMessages: [],
        batchBuffer: [],
      });
    }
    return this.groups.get(groupFolder)!;
  }
}
