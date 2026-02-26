"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { AgentStatusGrid } from "@/components/dashboard/agent-status-grid";
import { QueueDepth } from "@/components/dashboard/queue-depth";
import { CostTracker } from "@/components/dashboard/cost-tracker";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ErrorLog } from "@/components/dashboard/error-log";

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 pt-0">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {detail && (
          <span className="text-[10px] text-muted-foreground">{detail}</span>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const metrics = useAppStore((s) => s.metrics);
  const agents = useAppStore((s) => s.agents);

  const totalQueueDepth = Object.values(agents).reduce(
    (sum, a) => sum + a.queueDepth,
    0
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Active Sessions"
          value={metrics.activeSessions}
          detail="currently running"
        />
        <KpiCard
          label="Total Agents"
          value={metrics.totalAgents}
          detail="registered"
        />
        <KpiCard
          label="Queue Depth"
          value={totalQueueDepth}
          detail="messages waiting"
        />
        <KpiCard
          label="Pending Approvals"
          value={metrics.pendingApprovals}
        />
      </div>

      {/* Main content: Status Grid + Cost */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgentStatusGrid />
        </div>
        <div className="space-y-4">
          <CostTracker />
          <QueueDepth />
        </div>
      </div>

      {/* Activity Feed + Error Log */}
      <div className="grid gap-4 md:grid-cols-2">
        <ActivityFeed />
        <ErrorLog />
      </div>
    </div>
  );
}
