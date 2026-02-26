"use client";

import Link from "next/link";
import type { SessionState } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface SessionTableProps {
  sessions: SessionState[];
}

function statusBadge(status: SessionState["status"]) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 text-white">Active</Badge>;
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "timeout":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
          Timeout
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function SessionTable({ sessions }: SessionTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No sessions found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead className="text-right">Turns</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead>Started</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell>{statusBadge(session.status)}</TableCell>
            <TableCell>
              <Link
                href={`/sessions/${session.id}`}
                className="font-mono text-sm text-primary underline-offset-4 hover:underline"
              >
                {session.id.length > 12
                  ? `${session.id.slice(0, 12)}...`
                  : session.id}
              </Link>
            </TableCell>
            <TableCell className="font-medium">{session.agentFolder}</TableCell>
            <TableCell className="text-right font-mono">
              {session.messageCount}
            </TableCell>
            <TableCell className="text-right font-mono">
              ${session.cost.toFixed(2)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(session.startedAt), {
                addSuffix: true,
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
