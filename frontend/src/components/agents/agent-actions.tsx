"use client";

import { Button } from "@/components/ui/button";
import type { AgentStatus } from "@/lib/types";

interface AgentActionsProps {
  folder: string;
  status: AgentStatus;
  size?: "sm" | "default";
}

async function postAction(folder: string, action: "start" | "stop" | "interrupt") {
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(folder)}/${action}`, {
      method: "POST",
    });
    if (!res.ok) {
      console.error(`Failed to ${action} agent ${folder}: ${res.statusText}`);
    }
  } catch (err) {
    console.error(`Failed to ${action} agent ${folder}:`, err);
  }
}

export function AgentActions({ folder, status, size = "sm" }: AgentActionsProps) {
  const isRunning = status === "running";
  const isIdle = status === "idle" || status === "error";

  return (
    <div className="flex items-center gap-1">
      {isIdle && (
        <Button
          size={size}
          variant="outline"
          onClick={() => postAction(folder, "start")}
        >
          Start
        </Button>
      )}
      {(isRunning || status === "queued") && (
        <Button
          size={size}
          variant="outline"
          onClick={() => postAction(folder, "stop")}
        >
          Stop
        </Button>
      )}
      {isRunning && (
        <Button
          size={size}
          variant="destructive"
          onClick={() => postAction(folder, "interrupt")}
        >
          Interrupt
        </Button>
      )}
    </div>
  );
}
