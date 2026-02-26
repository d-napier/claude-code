"use client";

import type { TaskState } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pause, Play, Trash2 } from "lucide-react";
import cronstrue from "cronstrue";
import { formatDistanceToNow } from "date-fns";

interface TaskTableProps {
  tasks: TaskState[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: TaskState) => void;
}

function statusBadge(status: TaskState["status"]) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 text-white">Active</Badge>;
    case "paused":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
          Paused
        </Badge>
      );
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function scheduleLabel(task: TaskState): string {
  switch (task.scheduleType) {
    case "cron":
      try {
        return cronstrue.toString(task.scheduleValue);
      } catch {
        return task.scheduleValue;
      }
    case "interval":
      return `Every ${task.scheduleValue}`;
    case "once":
      return "Once";
    default:
      return task.scheduleValue;
  }
}

function scheduleTypeBadge(type: TaskState["scheduleType"]) {
  switch (type) {
    case "cron":
      return <Badge variant="outline">Cron</Badge>;
    case "interval":
      return <Badge variant="outline">Interval</Badge>;
    case "once":
      return <Badge variant="outline">Once</Badge>;
  }
}

export function TaskTable({
  tasks,
  onPause,
  onResume,
  onDelete,
  onEdit,
}: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No scheduled tasks. Create one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Prompt</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>Next Run</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow
            key={task.id}
            className="cursor-pointer"
            onClick={() => onEdit(task)}
          >
            <TableCell>{statusBadge(task.status)}</TableCell>
            <TableCell className="max-w-[300px]">
              <div className="truncate text-sm" title={task.prompt}>
                {task.prompt}
              </div>
            </TableCell>
            <TableCell className="font-medium">{task.groupFolder}</TableCell>
            <TableCell>{scheduleTypeBadge(task.scheduleType)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {scheduleLabel(task)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {task.nextRun
                ? formatDistanceToNow(new Date(task.nextRun), {
                    addSuffix: true,
                  })
                : task.status === "completed"
                  ? "Done"
                  : "N/A"}
            </TableCell>
            <TableCell className="text-right">
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {task.status === "active" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPause(task.id)}
                    aria-label="Pause task"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                ) : task.status === "paused" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onResume(task.id)}
                    aria-label="Resume task"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(task.id)}
                  aria-label="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
