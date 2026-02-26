"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ApprovalState, RiskLevel } from "@/lib/types";
import { ShieldAlert, ShieldCheck, ShieldX, Clock, Eye } from "lucide-react";

const riskColors: Record<RiskLevel, string> = {
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  "medium-high": "bg-orange-500/10 text-orange-700 border-orange-500/30",
  high: "bg-red-500/10 text-red-700 border-red-500/30",
  critical: "bg-red-600/10 text-red-800 border-red-600/40",
};

const riskLabels: Record<RiskLevel, string> = {
  medium: "MEDIUM RISK",
  "medium-high": "MEDIUM-HIGH RISK",
  high: "HIGH RISK",
  critical: "CRITICAL RISK",
};

interface ApprovalCardProps {
  approval: ApprovalState;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}

function useCountdown(expiresAt: string): string {
  const [remaining, setRemaining] = useState(() =>
    formatRemaining(expiresAt)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(formatRemaining(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

function formatRemaining(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1m ago";
  return `${minutes}m ago`;
}

function formatToolInput(toolInput: Record<string, unknown>): string {
  // For Bash commands, show the command directly
  if (typeof toolInput.command === "string") return toolInput.command;
  // For Write/Edit, show the file path
  if (typeof toolInput.file_path === "string") return `File: ${toolInput.file_path}`;
  // Fallback: show JSON
  return JSON.stringify(toolInput, null, 2);
}

export function ApprovalCard({ approval, onApprove, onDeny }: ApprovalCardProps) {
  const [optimisticStatus, setOptimisticStatus] = useState<
    "pending" | "approved" | "denied" | null
  >(null);

  const countdown = useCountdown(approval.expiresAt);
  const isExpired = countdown === "Expired";
  const isPending = approval.status === "pending" && !optimisticStatus;
  const displayStatus = optimisticStatus ?? approval.status;

  const handleApprove = useCallback(() => {
    setOptimisticStatus("approved");
    onApprove(approval.id);
  }, [approval.id, onApprove]);

  const handleDeny = useCallback(() => {
    setOptimisticStatus("denied");
    onDeny(approval.id);
  }, [approval.id, onDeny]);

  // Reset optimistic status when real status catches up
  useEffect(() => {
    if (approval.status !== "pending") {
      setOptimisticStatus(null);
    }
  }, [approval.status]);

  return (
    <Card
      className={isPending ? "border-l-4 border-l-yellow-500" : "opacity-80"}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-yellow-600" />
            <Badge variant="outline" className={riskColors[approval.riskLevel]}>
              {riskLabels[approval.riskLevel]}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Requested {formatTimeAgo(approval.requestedAt)}
          </span>
        </div>

        {/* Agent and session info */}
        <div className="mt-3 text-sm text-muted-foreground">
          Agent: <span className="font-medium text-foreground">{approval.agentFolder}</span>
          <span className="mx-2">|</span>
          Tool: <span className="font-medium text-foreground">{approval.toolName}</span>
        </div>

        {/* Tool input details */}
        <div className="mt-3">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono leading-relaxed">
            {formatToolInput(approval.toolInput)}
          </pre>
        </div>

        <Separator className="my-3" />

        {/* Actions row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPending && !isExpired ? (
              <>
                <Button size="sm" onClick={handleApprove}>
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDeny}>
                  <ShieldX className="mr-1.5 h-3.5 w-3.5" />
                  Deny
                </Button>
              </>
            ) : (
              <Badge
                variant={
                  displayStatus === "approved"
                    ? "default"
                    : displayStatus === "denied"
                      ? "destructive"
                      : "secondary"
                }
              >
                {displayStatus === "approved" && "Approved"}
                {displayStatus === "denied" && "Denied"}
                {displayStatus === "expired" && "Expired"}
                {displayStatus === "pending" && isExpired && "Expired"}
              </Badge>
            )}
          </div>

          {/* Countdown timer */}
          {isPending && (
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className={
                  isExpired
                    ? "font-medium text-red-600"
                    : countdown.startsWith("0:")
                      ? "font-medium text-orange-600"
                      : "text-muted-foreground"
                }
              >
                {isExpired ? "Expired" : `${countdown} left`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
