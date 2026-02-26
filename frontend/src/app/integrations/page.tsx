"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Webhook,
  Server,
  Key,
  Plus,
  Settings,
} from "lucide-react";

interface Channel {
  name: string;
  type: "whatsapp" | "telegram" | "slack";
  connected: boolean;
  groupCount: number;
}

interface WebhookEndpoint {
  name: string;
  path: string;
  eventsPerDay: number;
}

interface McpServer {
  name: string;
  connected: boolean;
  toolCount: number;
  mode: string;
}

interface ApiKey {
  provider: string;
  maskedKey: string | null;
  valid: boolean;
}

// Placeholder data — will be replaced with API calls
const channels: Channel[] = [
  { name: "WhatsApp", type: "whatsapp", connected: true, groupCount: 4 },
  { name: "Telegram", type: "telegram", connected: false, groupCount: 0 },
  { name: "Slack", type: "slack", connected: true, groupCount: 2 },
];

const webhooks: WebhookEndpoint[] = [
  { name: "GitHub", path: "/webhook/github", eventsPerDay: 47 },
  { name: "Stripe", path: "/webhook/stripe", eventsPerDay: 3 },
];

const mcpServers: McpServer[] = [
  { name: "agent", connected: true, toolCount: 6, mode: "In-process" },
  { name: "playwright", connected: true, toolCount: 12, mode: "Subprocess" },
  { name: "database", connected: false, toolCount: 0, mode: "HTTP" },
];

const apiKeys: ApiKey[] = [
  { provider: "Anthropic", maskedKey: "********hx4Q", valid: true },
  { provider: "OpenAI", maskedKey: null, valid: false },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Manage messaging channels, webhooks, MCP servers, and API keys.
          </p>
        </div>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Integration
        </Button>
      </div>

      {/* Messaging Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Messaging Channels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((ch) => (
                <TableRow key={ch.name}>
                  <TableCell className="font-medium">{ch.name}</TableCell>
                  <TableCell>
                    <Badge variant={ch.connected ? "default" : "secondary"}>
                      {ch.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ch.connected ? `${ch.groupCount} groups` : "--"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      {ch.connected ? (
                        <>
                          <Settings className="mr-1.5 h-3.5 w-3.5" />
                          Configure
                        </>
                      ) : (
                        "Connect"
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4" />
            Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Events (24h)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((wh) => (
                <TableRow key={wh.name}>
                  <TableCell className="font-medium">{wh.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    POST {wh.path}
                  </TableCell>
                  <TableCell>{wh.eventsPerDay}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-3">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Webhook Endpoint
          </Button>
        </CardContent>
      </Card>

      {/* MCP Servers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            MCP Servers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead>Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mcpServers.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant={s.connected ? "default" : "secondary"}>
                      {s.connected ? "Connected" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.connected ? `${s.toolCount} tools` : "--"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.mode}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-3">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add MCP Server
          </Button>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((k) => (
                <TableRow key={k.provider}>
                  <TableCell className="font-medium">{k.provider}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {k.maskedKey ?? "Not configured"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.valid ? "default" : "secondary"}>
                      {k.valid ? "Valid" : "Missing"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      {k.valid ? "Rotate" : "Add"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
