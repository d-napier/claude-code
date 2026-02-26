/**
 * Audit hook — PostToolUse hook that logs tool usage to a JSONL file.
 */
import fs from "node:fs";
import path from "node:path";

import type { HookEvent, HookContext, HookResult } from "./security.js";

export interface AuditEntry {
  timestamp: string;
  group: string;
  sessionId: string;
  tool: string;
  input: string;
}

export function auditHook(groupFolder: string) {
  return async function audit(
    event: HookEvent,
    sessionId: string,
    _context: HookContext,
  ): Promise<HookResult> {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      group: groupFolder,
      sessionId,
      tool: event.tool_name,
      input: JSON.stringify(event.tool_input).slice(0, 500),
    };

    const logDir = path.join("./groups", groupFolder, "logs");
    await fs.promises.mkdir(logDir, { recursive: true });
    await fs.promises.appendFile(
      path.join(logDir, "audit.jsonl"),
      JSON.stringify(entry) + "\n",
    );

    return {};
  };
}
