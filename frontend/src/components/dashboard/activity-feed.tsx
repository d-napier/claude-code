"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ActivityEntry {
  id: string;
  timestamp: string;
  type: "agent" | "session" | "approval";
  folder: string;
  message: string;
}

const MAX_ENTRIES = 100;

export function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const counterRef = useRef(0);

  const agents = useAppStore((s) => s.agents);
  const sessions = useAppStore((s) => s.sessions);
  const approvals = useAppStore((s) => s.approvals);

  // Build activity entries from store changes
  const prevAgentsRef = useRef<typeof agents>({});
  const prevSessionsRef = useRef<typeof sessions>({});
  const prevApprovalsRef = useRef<typeof approvals>([]);

  const addEntry = useCallback(
    (type: ActivityEntry["type"], folder: string, message: string) => {
      counterRef.current += 1;
      setEntries((prev) =>
        [
          {
            id: `${Date.now()}-${counterRef.current}`,
            timestamp: new Date().toISOString(),
            type,
            folder,
            message,
          },
          ...prev,
        ].slice(0, MAX_ENTRIES)
      );
    },
    []
  );

  // Track agent status changes
  useEffect(() => {
    const prev = prevAgentsRef.current;
    for (const [folder, agent] of Object.entries(agents)) {
      const prevAgent = prev[folder];
      if (!prevAgent || prevAgent.status !== agent.status) {
        addEntry("agent", folder, `Status changed to ${agent.status}`);
      }
    }
    prevAgentsRef.current = agents;
  }, [agents, addEntry]);

  // Track session updates
  useEffect(() => {
    const prev = prevSessionsRef.current;
    for (const [id, session] of Object.entries(sessions)) {
      const prevSession = prev[id];
      if (!prevSession) {
        addEntry("session", session.agentFolder, `Session ${id.slice(0, 8)} started`);
      } else if (prevSession.status !== session.status) {
        addEntry("session", session.agentFolder, `Session ${id.slice(0, 8)} ${session.status}`);
      }
    }
    prevSessionsRef.current = sessions;
  }, [sessions, addEntry]);

  // Track approval events
  useEffect(() => {
    const prev = prevApprovalsRef.current;
    if (approvals.length > prev.length) {
      const newApprovals = approvals.slice(prev.length);
      for (const approval of newApprovals) {
        addEntry(
          "approval",
          approval.agentFolder,
          `Approval requested for ${approval.toolName}`
        );
      }
    }
    prevApprovalsRef.current = approvals;
  }, [approvals, addEntry]);

  const typeColors: Record<ActivityEntry["type"], "default" | "secondary" | "outline"> = {
    agent: "default",
    session: "secondary",
    approval: "outline",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {entries.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-sm">
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge variant={typeColors[entry.type]} className="shrink-0 text-[10px]">
                    {entry.type}
                  </Badge>
                  <span className="font-medium">{entry.folder}:</span>
                  <span className="text-muted-foreground">{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
