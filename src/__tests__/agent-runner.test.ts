import { describe, it, expect } from "vitest";

describe("agent-runner", () => {
  it("should export runAgent function", async () => {
    const { runAgent } = await import("../agent-runner.js");
    expect(typeof runAgent).toBe("function");
  });

  // Integration tests require ANTHROPIC_API_KEY — skip in CI
  it.skipIf(!process.env.ANTHROPIC_API_KEY)(
    "should run a simple query",
    async () => {
      const { runAgent } = await import("../agent-runner.js");
      const result = await runAgent("Say 'hello world' and nothing else.", "global", {
        maxTurns: 1,
        maxBudgetUsd: 0.01,
        allowedTools: [],
      });
      expect(result.status).toBe("success");
      expect(result.sessionId).toBeTruthy();
    },
    30_000
  );
});
