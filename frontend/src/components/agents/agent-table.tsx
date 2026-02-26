"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AgentActions } from "@/components/agents/agent-actions";
import type { AgentStatus } from "@/lib/types";

const statusBadgeVariant: Record<AgentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  idle: "secondary",
  queued: "outline",
  error: "destructive",
};

export function AgentTable() {
  const agents = useAppStore((s) => s.agents);
  const agentList = Object.values(agents).sort((a, b) =>
    a.folder.localeCompare(b.folder)
  );

  if (agentList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8">
        <p className="text-sm text-muted-foreground">No agents registered yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Agents will appear here once the orchestrator registers them.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Folder</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Queue</TableHead>
          <TableHead>Queue Depth</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Last Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agentList.map((agent) => (
          <TableRow key={agent.folder}>
            <TableCell>
              <Badge variant={statusBadgeVariant[agent.status]}>
                {agent.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Link
                href={`/agents/${encodeURIComponent(agent.folder)}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {agent.folder}
              </Link>
            </TableCell>
            <TableCell>
              {agent.sessionId ? (
                <span className="font-mono text-xs">{agent.sessionId.slice(0, 8)}</span>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {agent.queueMode}
              </Badge>
            </TableCell>
            <TableCell>
              <span className="font-mono">{agent.queueDepth}</span>
            </TableCell>
            <TableCell>
              <span className="font-mono">${agent.cost.toFixed(2)}</span>
            </TableCell>
            <TableCell>
              {agent.lastActive ? (
                <span className="text-xs text-muted-foreground">
                  {new Date(agent.lastActive).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <AgentActions folder={agent.folder} status={agent.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
