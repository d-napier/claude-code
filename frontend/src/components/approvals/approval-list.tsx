"use client";

import { useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useWebSocket } from "@/lib/use-websocket";
import { ApprovalCard } from "./approval-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, Inbox } from "lucide-react";

export function ApprovalList() {
  const approvals = useAppStore((s) => s.approvals);
  const { sendMessage } = useWebSocket();

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const resolvedApprovals = approvals
    .filter((a) => a.status !== "pending")
    .sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

  const handleApprove = useCallback(
    (id: string) => {
      sendMessage({
        type: "approval:respond",
        payload: { id, decision: "approved" },
      });
    },
    [sendMessage]
  );

  const handleDeny = useCallback(
    (id: string) => {
      sendMessage({
        type: "approval:respond",
        payload: { id, decision: "denied" },
      });
    },
    [sendMessage]
  );

  return (
    <div className="space-y-6">
      {/* Pending approvals section */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Pending Approvals</h2>
          {pendingApprovals.length > 0 && (
            <Badge variant="destructive">{pendingApprovals.length}</Badge>
          )}
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No pending approvals
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              High-risk tool calls will appear here for review
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={handleApprove}
                onDeny={handleDeny}
              />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Resolved approvals section */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Resolved</h2>

        {resolvedApprovals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No resolved approvals yet.
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Time</TableHead>
                  <TableHead className="w-24">Outcome</TableHead>
                  <TableHead className="w-32">Agent</TableHead>
                  <TableHead>Tool Call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedApprovals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.requestedAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === "approved"
                            ? "default"
                            : a.status === "denied"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {a.agentFolder}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs">
                        {a.toolName}
                        {typeof a.toolInput.command === "string" && (
                          <>: {(a.toolInput.command as string).slice(0, 60)}</>
                        )}
                        {typeof a.toolInput.file_path === "string" && (
                          <>: {a.toolInput.file_path as string}</>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </section>
    </div>
  );
}
