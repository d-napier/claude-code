/**
 * Security hook — PreToolUse hook that blocks dangerous bash commands.
 */

export interface HookEvent {
  hook_event_name: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface HookContext {
  signal: AbortSignal;
}

export interface HookResult {
  hookSpecificOutput?: {
    permissionDecision?: "deny";
    reason?: string;
  };
}

const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\//,
  /mkfs\./,
  /dd\s+if=/,
  />\s*\/dev\/sd/,
  /chmod\s+-R\s+777/,
  /curl.*\|\s*(?:bash|sh)/,
  /format\s+[a-zA-Z]:/i,
  /drop\s+table/i,
  /drop\s+database/i,
  /truncate\s+table/i,
  /shutdown\s+(-h|now)/i,
  /:(){ :\|:& };:/,
];

export async function securityHook(
  event: HookEvent,
  _sessionId: string,
  _context: HookContext,
): Promise<HookResult> {
  if (event.tool_name !== "Bash") {
    return {};
  }

  const command = (event.tool_input?.command as string) ?? "";

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return {
        hookSpecificOutput: {
          permissionDecision: "deny",
          reason: `Blocked dangerous command: ${command.slice(0, 80)}`,
        },
      };
    }
  }

  return {};
}
