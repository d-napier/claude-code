"use client";

import { AgentTable } from "@/components/agents/agent-table";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Agents</h2>
      </div>
      <AgentTable />
    </div>
  );
}
