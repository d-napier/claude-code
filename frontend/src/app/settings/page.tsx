"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, RotateCcw, UserPlus, AlertTriangle } from "lucide-react";

interface GeneralSettings {
  assistantName: string;
  defaultModel: string;
  maxConcurrent: number;
  defaultMaxTurns: number;
  defaultBudgetUsd: number;
  containerTimeoutMinutes: number;
  heartbeatIntervalMinutes: number;
  messagePollIntervalSeconds: number;
  queueMode: string;
  timezone: string;
}

const defaultSettings: GeneralSettings = {
  assistantName: "Andy",
  defaultModel: "claude-sonnet-4-6",
  maxConcurrent: 5,
  defaultMaxTurns: 50,
  defaultBudgetUsd: 2.0,
  containerTimeoutMinutes: 30,
  heartbeatIntervalMinutes: 30,
  messagePollIntervalSeconds: 2,
  queueMode: "collect",
  timezone: "America/New_York",
};

interface User {
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
}

const placeholderUsers: User[] = [
  { name: "Admin", email: "admin@company.com", role: "admin" },
  { name: "Dev 1", email: "dev1@company.com", role: "operator" },
  { name: "Dev 2", email: "dev2@company.com", role: "viewer" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);

  function updateSetting<K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  function handleSave() {
    // TODO: POST to /api/settings
    setIsDirty(false);
  }

  function handleReset() {
    setSettings(defaultSettings);
    setIsDirty(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure global system settings, user access, and environment.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">General Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assistantName">Assistant Name</Label>
                  <Input
                    id="assistantName"
                    value={settings.assistantName}
                    onChange={(e) =>
                      updateSetting("assistantName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultModel">Default Model</Label>
                  <Select
                    value={settings.defaultModel}
                    onValueChange={(v) => updateSetting("defaultModel", v)}
                  >
                    <SelectTrigger id="defaultModel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
                      <SelectItem value="claude-opus-4-6">claude-opus-4-6</SelectItem>
                      <SelectItem value="claude-haiku-3-5">claude-haiku-3-5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxConcurrent">Max Concurrent Agents</Label>
                  <Input
                    id="maxConcurrent"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.maxConcurrent}
                    onChange={(e) =>
                      updateSetting("maxConcurrent", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultMaxTurns">Default Max Turns</Label>
                  <Input
                    id="defaultMaxTurns"
                    type="number"
                    min={1}
                    value={settings.defaultMaxTurns}
                    onChange={(e) =>
                      updateSetting(
                        "defaultMaxTurns",
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultBudget">Default Budget (USD)</Label>
                  <Input
                    id="defaultBudget"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={settings.defaultBudgetUsd}
                    onChange={(e) =>
                      updateSetting(
                        "defaultBudgetUsd",
                        parseFloat(e.target.value) || 0.01
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Container Timeout (min)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1}
                    value={settings.containerTimeoutMinutes}
                    onChange={(e) =>
                      updateSetting(
                        "containerTimeoutMinutes",
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heartbeat">Heartbeat Interval (min)</Label>
                  <Input
                    id="heartbeat"
                    type="number"
                    min={1}
                    value={settings.heartbeatIntervalMinutes}
                    onChange={(e) =>
                      updateSetting(
                        "heartbeatIntervalMinutes",
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pollInterval">Message Poll (sec)</Label>
                  <Input
                    id="pollInterval"
                    type="number"
                    min={1}
                    value={settings.messagePollIntervalSeconds}
                    onChange={(e) =>
                      updateSetting(
                        "messagePollIntervalSeconds",
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="queueMode">Default Queue Mode</Label>
                  <Select
                    value={settings.queueMode}
                    onValueChange={(v) => updateSetting("queueMode", v)}
                  >
                    <SelectTrigger id="queueMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collect">Collect</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                      <SelectItem value="interrupt">Interrupt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) => updateSetting("timezone", v)}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="America/Chicago">America/Chicago</SelectItem>
                      <SelectItem value="America/Denver">America/Denver</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <Button onClick={handleSave} disabled={!isDirty}>
                  <Save className="mr-1.5 h-4 w-4" />
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">User Management</CardTitle>
              <Button size="sm">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Invite User
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placeholderUsers.map((user) => (
                    <TableRow key={user.email}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "default"
                              : user.role === "operator"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm">
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Role Definitions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Admin</span>
                  <span className="text-muted-foreground">
                    {" "}-- Full system access including settings, user management,
                    and danger zone operations.
                  </span>
                </div>
                <div>
                  <span className="font-medium">Operator</span>
                  <span className="text-muted-foreground">
                    {" "}-- Can manage agents, approve tool calls, edit memory, and
                    view all data. Cannot modify system settings or users.
                  </span>
                </div>
                <div>
                  <span className="font-medium">Viewer</span>
                  <span className="text-muted-foreground">
                    {" "}-- Read-only access to dashboards, sessions, and logs.
                    Cannot approve tool calls or modify configuration.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Environment */}
        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Environment Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Environment variables are read from the server .env file.
                Sensitive values are masked. Changes require a server restart.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variable</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">ANTHROPIC_API_KEY</TableCell>
                    <TableCell className="font-mono text-xs">********hx4Q</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">NODE_ENV</TableCell>
                    <TableCell className="font-mono text-xs">production</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">PORT</TableCell>
                    <TableCell className="font-mono text-xs">3001</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">DB_PATH</TableCell>
                    <TableCell className="font-mono text-xs">./data/claude-claw.db</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger" className="space-y-4">
          <Card className="border-red-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-red-500/20 p-4">
                <div>
                  <p className="text-sm font-medium">Stop All Agents</p>
                  <p className="text-xs text-muted-foreground">
                    Gracefully stop all running agent sessions. In-progress turns
                    will complete before shutdown.
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Stop All
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-md border border-red-500/20 p-4">
                <div>
                  <p className="text-sm font-medium">Clear All Sessions</p>
                  <p className="text-xs text-muted-foreground">
                    Delete all session transcripts and history. This cannot be
                    undone.
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Clear Sessions
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-md border border-red-500/20 p-4">
                <div>
                  <p className="text-sm font-medium">Reset Database</p>
                  <p className="text-xs text-muted-foreground">
                    Drop and recreate all database tables. All data will be lost
                    permanently.
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Reset Database
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
