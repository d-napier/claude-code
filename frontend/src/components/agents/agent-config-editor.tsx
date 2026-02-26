"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QueueMode } from "@/lib/types";

interface AgentConfig {
  model: string;
  maxTurns: number;
  maxBudgetUsd: number;
  allowedTools: string[];
  queueMode: QueueMode;
}

interface AgentConfigEditorProps {
  folder: string;
  initialConfig?: Partial<AgentConfig>;
}

const DEFAULT_CONFIG: AgentConfig = {
  model: "claude-sonnet-4-6",
  maxTurns: 50,
  maxBudgetUsd: 2.0,
  allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
  queueMode: "followup",
};

const AVAILABLE_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "Task",
];

export function AgentConfigEditor({ folder, initialConfig }: AgentConfigEditorProps) {
  const [config, setConfig] = useState<AgentConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(folder)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        console.error(`Failed to save config: ${res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG, ...initialConfig });
  };

  const toggleTool = (tool: string) => {
    setConfig((prev) => ({
      ...prev,
      allowedTools: prev.allowedTools.includes(tool)
        ? prev.allowedTools.filter((t) => t !== tool)
        : [...prev.allowedTools, tool],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model */}
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select
            value={config.model}
            onValueChange={(value) => setConfig((prev) => ({ ...prev, model: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
              <SelectItem value="claude-opus-4-6">claude-opus-4-6</SelectItem>
              <SelectItem value="claude-haiku-4">claude-haiku-4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Turns */}
        <div className="space-y-2">
          <Label htmlFor="maxTurns">Max Turns</Label>
          <Input
            id="maxTurns"
            type="number"
            min={1}
            max={200}
            value={config.maxTurns}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, maxTurns: parseInt(e.target.value) || 50 }))
            }
          />
        </div>

        {/* Max Budget */}
        <div className="space-y-2">
          <Label htmlFor="maxBudget">Max Budget (USD)</Label>
          <Input
            id="maxBudget"
            type="number"
            min={0.01}
            step={0.01}
            value={config.maxBudgetUsd}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                maxBudgetUsd: parseFloat(e.target.value) || 2.0,
              }))
            }
          />
        </div>

        {/* Queue Mode */}
        <div className="space-y-2">
          <Label>Queue Mode</Label>
          <Select
            value={config.queueMode}
            onValueChange={(value) =>
              setConfig((prev) => ({ ...prev, queueMode: value as QueueMode }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select queue mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="collect">Collect</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="interrupt">Interrupt</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {config.queueMode === "collect" &&
              "Queue messages and deliver as a batch when the agent is free."}
            {config.queueMode === "followup" &&
              "Deliver each queued message as a follow-up turn."}
            {config.queueMode === "interrupt" &&
              "Interrupt the running session to handle new messages immediately."}
          </p>
        </div>

        {/* Allowed Tools */}
        <div className="space-y-2">
          <Label>Allowed Tools</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TOOLS.map((tool) => {
              const isActive = config.allowedTools.includes(tool);
              return (
                <Button
                  key={tool}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => toggleTool(tool)}
                  className="text-xs"
                >
                  {tool}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved" : "Save Configuration"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
