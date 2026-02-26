/**
 * Hook index — exports buildHooks() combining all hooks.
 */

export { securityHook } from "./security.js";
export { auditHook } from "./audit.js";
export { secretsHook, redactSecrets } from "./secrets.js";
export { compactHook } from "./compact.js";

export type { HookEvent, HookContext, HookResult } from "./security.js";

import { securityHook } from "./security.js";
import { auditHook } from "./audit.js";
import { secretsHook } from "./secrets.js";
import { compactHook } from "./compact.js";
import type { HookEvent, HookContext, HookResult } from "./security.js";

export type HookFn = (
  event: HookEvent,
  sessionId: string,
  context: HookContext,
) => Promise<HookResult>;

export interface HookMatcher {
  matcher?: string;
  hooks: HookFn[];
}

export interface HookConfig {
  PreToolUse: HookMatcher[];
  PostToolUse: HookMatcher[];
  PreCompact: HookMatcher[];
}

/**
 * Build the complete hook configuration for a group.
 *
 * @param groupFolder — the group's working directory name
 * @param isMain — whether this is the main orchestrator (may get stricter rules)
 */
export function buildHooks(groupFolder: string, isMain: boolean = false): HookConfig {
  const preToolUse: HookMatcher[] = [
    {
      matcher: "Bash",
      hooks: [securityHook],
    },
    {
      hooks: [secretsHook],
    },
  ];

  // Main orchestrator gets no additional restrictions currently,
  // but the flag is available for future use.
  if (isMain) {
    // Reserved for main-only hooks
  }

  return {
    PreToolUse: preToolUse,
    PostToolUse: [
      { hooks: [auditHook(groupFolder)] },
    ],
    PreCompact: [
      { hooks: [compactHook(groupFolder)] },
    ],
  };
}
