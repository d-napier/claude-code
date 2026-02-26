"use client";

import { use } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentActions } from "@/components/agents/agent-actions";
import { AgentConfigEditor } from "@/components/agents/agent-config-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentStatus } from "@/lib/types";

const statusBadgeVariant: Record<AgentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  idle: "secondary",
  queued: "outline",
  error: "destructive",
};

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ folder: string }>;
}) {
  const { folder } = use(params);
  const decodedFolder = decodeURIComponent(folder);
  const agent = useAppStore((s) => s.agents[decodedFolder]);
  const sessions = useAppStore((s) => s.sessions);
  const liveOutputs = useAppStore((s) =>
    agent?.sessionId ? s.liveOutputs[agent.sessionId] ?? [] : []
  );

  const agentSessions = Object.values(sessions).filter(
    (s) => s.agentFolder === decodedFolder
  );

  if (!agent) {
    return (
      <div className="space-y-4">
        <Link
          href="/agents"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Agents
        </Link>
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12">
          <p className="text-sm text-muted-foreground">
            Agent &quot;{decodedFolder}&quot; not found.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            It may not be registered yet or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/agents"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Agents
      </Link>

      {/* Agent header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{decodedFolder}</h2>
          <Badge variant={statusBadgeVariant[agent.status]}>{agent.status}</Badge>
        </div>
        <AgentActions folder={decodedFolder} status={agent.status} size="default" />
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="output">Live Output</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center gap-1 pt-0">
                <span className="text-2xl font-bold">{agentSessions.length}</span>
                <span className="text-xs text-muted-foreground">Sessions</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 pt-0">
                <span className="text-2xl font-bold font-mono">
                  ${agent.cost.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">Total Cost</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 pt-0">
                <span className="text-2xl font-bold">{agent.queueDepth}</span>
                <span className="text-xs text-muted-foreground">Queue Depth</span>
              </CardContent>
            </Card>
          </div>

          {/* Active session info */}
          {agent.sessionId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono">{agent.sessionId.slice(0, 12)}</span>
                  <Badge variant="outline">{agent.queueMode} mode</Badge>
                  <span className="text-muted-foreground">
                    Cost: ${agent.cost.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration">
          <AgentConfigEditor
            folder={decodedFolder}
            initialConfig={{ queueMode: agent.queueMode }}
          />
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-2">
          {agentSessions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No sessions recorded for this agent.
            </p>
          ) : (
            <div className="space-y-2">
              {agentSessions
                .sort(
                  (a, b) =>
                    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
                )
                .map((session) => (
                  <Card key={session.id}>
                    <CardContent className="flex items-center justify-between pt-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">
                          {session.id.slice(0, 8)}
                        </span>
                        <Badge
                          variant={
                            session.status === "active"
                              ? "default"
                              : session.status === "error"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{session.messageCount} messages</span>
                        <span className="font-mono">${session.cost.toFixed(2)}</span>
                        <span>
                          {new Date(session.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Live Output Tab */}
        <TabsContent value="output">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Live Output</CardTitle>
              {agent.sessionId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    useAppStore.getState().clearOutput(agent.sessionId!)
                  }
                >
                  Clear
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {liveOutputs.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">
                    {agent.status === "running"
                      ? "Waiting for output..."
                      : "No live output. Agent is not running."}
                  </p>
                ) : (
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {liveOutputs.join("\n")}
                  </pre>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
