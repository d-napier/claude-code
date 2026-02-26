"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QueueDepth() {
  const agents = useAppStore((s) => s.agents);
  const agentList = Object.values(agents);

  const totalDepth = agentList.reduce((sum, a) => sum + a.queueDepth, 0);
  const agentsWithQueue = agentList.filter((a) => a.queueDepth > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Queue Depth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold">{totalDepth}</span>
          <span className="text-xs text-muted-foreground">
            {totalDepth === 1 ? "message" : "messages"} waiting
          </span>
        </div>

        {agentsWithQueue.length > 0 && (
          <div className="mt-4 space-y-1">
            {agentsWithQueue.map((agent) => (
              <div
                key={agent.folder}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{agent.folder}</span>
                <span className="font-mono font-medium">{agent.queueDepth}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
