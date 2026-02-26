"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CostTracker() {
  const totalCost = useAppStore((s) => s.metrics.totalCost);
  const agents = useAppStore((s) => s.agents);

  const agentList = Object.values(agents);
  const topSpenders = [...agentList]
    .filter((a) => a.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Cost</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold font-mono">${totalCost.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">total accumulated</span>
        </div>

        {topSpenders.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Top spenders</p>
            {topSpenders.map((agent) => (
              <div
                key={agent.folder}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{agent.folder}</span>
                <span className="font-mono font-medium">${agent.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
