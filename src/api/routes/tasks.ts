/**
 * Task CRUD routes.
 */
import { Router } from "express";
import type { Database } from "../../db.js";
import { requireWriteAccess } from "../middleware/auth.js";

export function taskRoutes(db: Database): Router {
  const router = Router();

  // GET /api/tasks — list tasks
  router.get("/", (req, res) => {
    const { folder } = req.query;
    const tasks = folder && typeof folder === "string"
      ? db.getTasksByGroup(folder)
      : db.getAllTasks();
    res.json({ tasks });
  });

  // POST /api/tasks — create task
  router.post("/", requireWriteAccess, (req, res) => {
    const { prompt, scheduleType, scheduleValue, groupFolder, status, nextRun } = req.body;

    if (!prompt || !scheduleType || !scheduleValue || !groupFolder) {
      res.status(400).json({ error: "Missing required fields: prompt, scheduleType, scheduleValue, groupFolder" });
      return;
    }

    const id = db.createTask({
      prompt,
      scheduleType,
      scheduleValue,
      groupFolder,
      status: status ?? "active",
      nextRun,
    });

    const task = db.getTask(id);
    res.status(201).json({ task });
  });

  // PUT /api/tasks/:id — update task
  router.put("/:id", requireWriteAccess, (req, res) => {
    const existing = db.getTask((req.params.id as string));
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const { status, nextRun } = req.body;
    if (status) {
      db.setTaskStatus((req.params.id as string), status);
    }
    if (nextRun) {
      db.updateNextRun((req.params.id as string), nextRun);
    }

    const updated = db.getTask((req.params.id as string));
    res.json({ task: updated });
  });

  // DELETE /api/tasks/:id — delete task
  router.delete("/:id", requireWriteAccess, (req, res) => {
    const existing = db.getTask((req.params.id as string));
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    db.deleteTask((req.params.id as string));
    res.json({ deleted: true, id: (req.params.id as string) });
  });

  return router;
}
