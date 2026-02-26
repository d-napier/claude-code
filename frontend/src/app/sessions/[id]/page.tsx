"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { ConversationView } from "@/components/conversation/conversation-view";
import type { Message } from "@/components/conversation/message-bubble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, DollarSign, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SessionDetailPageProps {
  params: Promise<{ id: string }>;
}

function statusBadge(status: string) {
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

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = use(params);
  const session = useAppStore((s) => s.sessions[id]);
  const agents = useAppStore((s) => s.agents);
  const liveOutputs = useAppStore((s) => s.liveOutputs[id] ?? []);

  // Build messages from live output lines for this session
  const messages: Message[] = useMemo(() => {
    return liveOutputs.map((line, i) => ({
      id: `${id}-output-${i}`,
      role: "assistant" as const,
      content: line,
    }));
  }, [liveOutputs, id]);

  if (!session) {
    return (
      <div className="space-y-6">
        <Link href="/sessions">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sessions
          </Button>
        </Link>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Session not found. It may not have been loaded yet.
        </div>
      </div>
    );
  }

  const agent = agents[session.agentFolder];
  const isProcessing = agent?.status === "running" && agent?.sessionId === id;
  const queueMode = agent?.queueMode;

  return (
    <div className="space-y-6">
      {/* Back link and header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sessions">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl font-semibold">
                {id.length > 20 ? `${id.slice(0, 20)}...` : id}
              </h1>
              {statusBadge(session.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Agent: <span className="font-medium">{session.agentFolder}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Turns</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.messageCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ${session.cost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Started</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {formatDistanceToNow(new Date(session.startedAt), {
                addSuffix: true,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Conversation transcript */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Transcript</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px]">
            <ConversationView
              messages={messages}
              isProcessing={isProcessing}
              queueMode={queueMode}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
