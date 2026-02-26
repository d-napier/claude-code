"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgentStatus } from "@/lib/types";

const statusConfig: Record<
  AgentStatus,
  { label: string; dotClass: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  running: { label: "Running", dotClass: "bg-green-500", badgeVariant: "default" },
  idle: { label: "Idle", dotClass: "bg-gray-400", badgeVariant: "secondary" },
  queued: { label: "Queued", dotClass: "bg-yellow-500", badgeVariant: "outline" },
  error: { label: "Error", dotClass: "bg-red-500", badgeVariant: "destructive" },
};

export function AgentStatusGrid() {
  const agents = useAppStore((s) => s.agents);
  const agentList = Object.values(agents);

  const counts: Record<AgentStatus, number> = { running: 0, idle: 0, queued: 0, error: 0 };
  for (const agent of agentList) {
    counts[agent.status] = (counts[agent.status] ?? 0) + 1;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Agent Status</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary counts */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {(Object.keys(counts) as AgentStatus[]).map((status) => {
            const config = statusConfig[status];
            return (
              <div key={status} className="flex flex-col items-center gap-1 rounded-md border p-2">
                <div className={`h-2.5 w-2.5 rounded-full ${config.dotClass}`} />
                <span className="text-lg font-semibold">{counts[status]}</span>
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
            );
          })}
        </div>

        {/* Agent list */}
        <div className="space-y-2">
          {agentList.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">No agents registered</p>
          )}
          {agentList.map((agent) => {
            const config = statusConfig[agent.status];
            return (
              <div
                key={agent.folder}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${config.dotClass}`} />
                  <span className="text-sm font-medium">{agent.folder}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.badgeVariant} className="text-xs">
                    {config.label}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    ${agent.cost.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
