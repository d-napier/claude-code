"use client";

import { useAppStore } from "@/lib/store";
import { Separator } from "@/components/ui/separator";

export function Header() {
  const wsStatus = useAppStore((s) => s.wsStatus);
  const totalCost = useAppStore((s) => s.metrics.totalCost);

  const isConnected = wsStatus === "open";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">Claude Claw</h1>
        <span className="text-xs text-muted-foreground">
          Agent Orchestration Console
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Global cost display */}
        <div className="text-sm text-muted-foreground">
          Cost:{" "}
          <span className="font-mono font-medium text-foreground">
            ${totalCost.toFixed(2)}
          </span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Connection status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
            aria-label={isConnected ? "Connected" : "Disconnected"}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </header>
  );
}
