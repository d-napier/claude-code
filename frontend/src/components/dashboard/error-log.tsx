"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function ErrorLog() {
  const agents = useAppStore((s) => s.agents);

  const errorAgents = Object.values(agents).filter((a) => a.status === "error");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Error Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          {errorAgents.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No errors</p>
          ) : (
            <div className="space-y-2">
              {errorAgents.map((agent) => (
                <div
                  key={agent.folder}
                  className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm"
                >
                  <Badge variant="destructive" className="text-[10px]">
                    ERROR
                  </Badge>
                  <span className="font-medium">{agent.folder}</span>
                  <span className="text-muted-foreground">
                    {agent.lastActive
                      ? `Last active: ${new Date(agent.lastActive).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "No recent activity"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
