import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { config } from "./config.js";
import type { AgentResult } from "./types.js";

export async function runAgent(
  prompt: string,
  groupFolder: string,
  options: {
    sessionId?: string;
    abortController?: AbortController;
    isMain?: boolean;
    model?: string;
    maxTurns?: number;
    maxBudgetUsd?: number;
    allowedTools?: string[];
    systemPromptAppend?: string;
    onOutput?: (text: string) => void;
    onMessage?: (msg: SDKMessage) => void;
    hooks?: Record<string, any>;
    mcpServers?: Record<string, any>;
  } = {}
): Promise<AgentResult> {
  const q = query({
    prompt,
    options: {
      resume: options.sessionId,
      model: options.model ?? config.DEFAULT_MODEL,
      maxTurns: options.maxTurns ?? config.DEFAULT_MAX_TURNS,
      maxBudgetUsd: options.maxBudgetUsd ?? config.DEFAULT_MAX_BUDGET_USD,
      allowedTools: options.allowedTools ?? [
        "Read", "Write", "Edit", "Bash", "Glob", "Grep",
        "WebSearch", "WebFetch", "Task"
      ],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      settingSources: ["project"],
      cwd: `./groups/${groupFolder}`,
      additionalDirectories: ["./groups/global"],
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: options.systemPromptAppend ?? "You are a helpful assistant. Respond concisely."
      },
      sandbox: { enabled: true, autoAllowBashIfSandboxed: true },
      hooks: options.hooks,
      mcpServers: options.mcpServers,
      abortController: options.abortController,
    }
  });

  const result: AgentResult = { text: "", sessionId: "", cost: 0, status: "success" };

  for await (const msg of q) {
    options.onMessage?.(msg);

    switch (msg.type) {
      case "system":
        if (msg.subtype === "init") {
          result.sessionId = msg.session_id;
        }
        break;

      case "assistant":
        for (const block of msg.message.content) {
          if (block.type === "text") {
            options.onOutput?.(block.text);
          }
        }
        break;

      case "result":
        result.cost = msg.total_cost_usd;
        if (msg.subtype === "success") {
          result.text = msg.result;
          result.status = "success";
        } else {
          result.text = `Error: ${msg.subtype} — ${msg.errors?.join(", ") ?? "unknown"}`;
          result.status = "error";
          result.errorSubtype = msg.subtype;
        }
        break;
    }
  }

  return result;
}
