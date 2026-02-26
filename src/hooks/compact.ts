/**
 * Compact hook — Notification hook for context window compaction events.
 * Fires on PreCompact to archive transcripts before compaction.
 */
import fs from "node:fs";
import path from "node:path";

import type { HookEvent, HookContext, HookResult } from "./security.js";

export function compactHook(groupFolder: string) {
  return async function compact(
    event: HookEvent,
    sessionId: string,
    _context: HookContext,
  ): Promise<HookResult> {
    const logDir = path.join("./groups", groupFolder, "logs");
    await fs.promises.mkdir(logDir, { recursive: true });

    const entry = {
      timestamp: new Date().toISOString(),
      event: "compact",
      group: groupFolder,
      sessionId,
      hookEvent: event.hook_event_name,
    };

    await fs.promises.appendFile(
      path.join(logDir, "compact.jsonl"),
      JSON.stringify(entry) + "\n",
    );

    return {};
  };
}
