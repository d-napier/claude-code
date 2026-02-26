"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ScheduleType, TaskState, TaskStatus } from "@/lib/types";

export default function TasksPage() {
  const tasks = useAppStore((s) => s.tasks);
  const updateTask = useAppStore((s) => s.updateTask);
  const canWrite = useAppStore((s) => s.canWrite);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskState | null>(null);

  const allTasks = useMemo(() => {
    return Object.values(tasks).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [tasks]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return allTasks;
    return allTasks.filter((t) => t.status === statusFilter);
  }, [allTasks, statusFilter]);

  function handlePause(id: string) {
    const task = tasks[id];
    if (!task) return;
    updateTask({ ...task, status: "paused" });
    toast.success("Task paused");
  }

  function handleResume(id: string) {
    const task = tasks[id];
    if (!task) return;
    updateTask({ ...task, status: "active" });
    toast.success("Task resumed");
  }

  function handleDelete(id: string) {
    const task = tasks[id];
    if (!task) return;
    // Mark as completed to remove from active list
    updateTask({ ...task, status: "completed" });
    toast.success("Task deleted");
  }

  function handleEdit(task: TaskState) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function handleSubmit(data: {
    prompt: string;
    scheduleType: ScheduleType;
    scheduleValue: string;
    groupFolder: string;
  }) {
    if (editingTask) {
      updateTask({
        ...editingTask,
        prompt: data.prompt,
        scheduleType: data.scheduleType,
        scheduleValue: data.scheduleValue,
        groupFolder: data.groupFolder,
      });
      toast.success("Task updated");
    } else {
      const newTask: TaskState = {
        id: `task-${Date.now()}`,
        prompt: data.prompt,
        scheduleType: data.scheduleType,
        scheduleValue: data.scheduleValue,
        groupFolder: data.groupFolder,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      updateTask(newTask);
      toast.success("Task created");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Scheduled Tasks
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage recurring and one-time agent tasks
            </p>
          </div>
        </div>
        {canWrite() && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <TaskTable
        tasks={filtered}
        onPause={handlePause}
        onResume={handleResume}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      {/* Form Dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingTask={editingTask}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
