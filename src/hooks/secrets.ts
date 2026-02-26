/**
 * Secrets hook — PreToolUse hook that redacts API keys and secrets from tool inputs.
 */

import type { HookEvent, HookContext, HookResult } from "./security.js";

/**
 * Patterns that match common secret/API key formats.
 * Each entry has a regex and a replacement label.
 */
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, label: "[REDACTED_API_KEY]" },
  { pattern: /sk-ant-[a-zA-Z0-9-]{20,}/g, label: "[REDACTED_ANTHROPIC_KEY]" },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/g, label: "[REDACTED_GITHUB_TOKEN]" },
  { pattern: /gho_[a-zA-Z0-9]{36,}/g, label: "[REDACTED_GITHUB_TOKEN]" },
  { pattern: /xoxb-[a-zA-Z0-9-]+/g, label: "[REDACTED_SLACK_TOKEN]" },
  { pattern: /xoxp-[a-zA-Z0-9-]+/g, label: "[REDACTED_SLACK_TOKEN]" },
  { pattern: /AKIA[0-9A-Z]{16}/g, label: "[REDACTED_AWS_KEY]" },
  { pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g, label: "[REDACTED_PRIVATE_KEY]" },
  { pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/g, label: "[REDACTED_BEARER_TOKEN]" },
];

/**
 * Deep-clone and redact string values in an object.
 */
export function redactSecrets(input: unknown): unknown {
  if (typeof input === "string") {
    let result = input;
    for (const { pattern, label } of SECRET_PATTERNS) {
      // Reset lastIndex since we reuse the regex
      pattern.lastIndex = 0;
      result = result.replace(pattern, label);
    }
    return result;
  }

  if (Array.isArray(input)) {
    return input.map(redactSecrets);
  }

  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = redactSecrets(value);
    }
    return out;
  }

  return input;
}

export async function secretsHook(
  event: HookEvent,
  _sessionId: string,
  _context: HookContext,
): Promise<HookResult> {
  // Mutate tool_input in place to redact secrets before the tool executes.
  if (event.tool_input) {
    const redacted = redactSecrets(event.tool_input) as Record<string, unknown>;
    Object.assign(event.tool_input, redacted);
  }

  return {};
}
