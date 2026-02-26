"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { ScheduleType, TaskState } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import cronstrue from "cronstrue";

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask?: TaskState | null;
  onSubmit: (data: {
    prompt: string;
    scheduleType: ScheduleType;
    scheduleValue: string;
    groupFolder: string;
  }) => void;
}

export function TaskForm({
  open,
  onOpenChange,
  editingTask,
  onSubmit,
}: TaskFormProps) {
  const agents = useAppStore((s) => s.agents);
  const agentFolders = useMemo(
    () => Object.keys(agents).sort(),
    [agents]
  );

  const [prompt, setPrompt] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("cron");
  const [scheduleValue, setScheduleValue] = useState("");
  const [groupFolder, setGroupFolder] = useState("");
  const [cronDescription, setCronDescription] = useState("");
  const [cronError, setCronError] = useState("");

  // Reset form when dialog opens or editing task changes
  useEffect(() => {
    if (open) {
      if (editingTask) {
        setPrompt(editingTask.prompt);
        setScheduleType(editingTask.scheduleType);
        setScheduleValue(editingTask.scheduleValue);
        setGroupFolder(editingTask.groupFolder);
      } else {
        setPrompt("");
        setScheduleType("cron");
        setScheduleValue("");
        setGroupFolder(agentFolders[0] ?? "");
      }
      setCronDescription("");
      setCronError("");
    }
  }, [open, editingTask, agentFolders]);

  // Compute human-readable cron description
  useEffect(() => {
    if (scheduleType !== "cron" || !scheduleValue.trim()) {
      setCronDescription("");
      setCronError("");
      return;
    }
    try {
      const desc = cronstrue.toString(scheduleValue);
      setCronDescription(desc);
      setCronError("");
    } catch {
      setCronDescription("");
      setCronError("Invalid cron expression");
    }
  }, [scheduleType, scheduleValue]);

  const isValid =
    prompt.trim().length > 0 &&
    scheduleValue.trim().length > 0 &&
    groupFolder.trim().length > 0 &&
    (scheduleType !== "cron" || !cronError);

  function handleSubmit() {
    if (!isValid) return;
    onSubmit({
      prompt: prompt.trim(),
      scheduleType,
      scheduleValue: scheduleValue.trim(),
      groupFolder: groupFolder.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingTask ? "Edit Task" : "Create Scheduled Task"}
          </DialogTitle>
          <DialogDescription>
            {editingTask
              ? "Modify the scheduled task configuration."
              : "Schedule a recurring or one-time prompt for an agent."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="task-prompt">Prompt</Label>
            <textarea
              id="task-prompt"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Generate a daily standup summary..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Target Agent */}
          <div className="space-y-2">
            <Label htmlFor="task-agent">Target Agent</Label>
            {agentFolders.length > 0 ? (
              <Select value={groupFolder} onValueChange={setGroupFolder}>
                <SelectTrigger id="task-agent">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agentFolders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="task-agent"
                placeholder="agent-folder-name"
                value={groupFolder}
                onChange={(e) => setGroupFolder(e.target.value)}
              />
            )}
          </div>

          {/* Schedule Type */}
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <div className="flex gap-2">
              {(["cron", "interval", "once"] as ScheduleType[]).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={scheduleType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setScheduleType(type);
                    setScheduleValue("");
                  }}
                >
                  {type === "cron"
                    ? "Cron"
                    : type === "interval"
                      ? "Interval"
                      : "Once"}
                </Button>
              ))}
            </div>
          </div>

          {/* Schedule Value */}
          <div className="space-y-2">
            <Label htmlFor="task-schedule">
              {scheduleType === "cron"
                ? "Cron Expression"
                : scheduleType === "interval"
                  ? "Interval (e.g., 30m, 2h, 1d)"
                  : "Date/Time (ISO 8601)"}
            </Label>
            <Input
              id="task-schedule"
              placeholder={
                scheduleType === "cron"
                  ? "0 9 * * 1-5"
                  : scheduleType === "interval"
                    ? "30m"
                    : "2026-03-31T09:00:00Z"
              }
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
            />
            {scheduleType === "cron" && cronDescription && (
              <p className="text-xs text-muted-foreground">{cronDescription}</p>
            )}
            {scheduleType === "cron" && cronError && (
              <p className="text-xs text-destructive">{cronError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {editingTask ? "Save Changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
