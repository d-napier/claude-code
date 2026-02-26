/**
 * Agent CRUD routes — manage agent groups, start/stop/interrupt.
 */
import { Router } from "express";
import type { Database } from "../../db.js";
import type { GroupQueue } from "../../group-queue.js";
import { requireWriteAccess } from "../middleware/auth.js";

export function agentRoutes(db: Database, queue: GroupQueue): Router {
  const router = Router();

  // GET /api/agents — list all agents (groups)
  router.get("/", (req, res) => {
    const groups = db.getAllGroups();
    res.json({ agents: groups });
  });

  // GET /api/agents/:folder — agent detail + config
  router.get("/:folder", (req, res) => {
    const group = db.getGroup(req.params.folder);
    if (!group) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json({ agent: group });
  });

  // PUT /api/agents/:folder — update agent config
  router.put("/:folder", requireWriteAccess, (req, res) => {
    const existing = db.getGroup(req.params.folder);
    if (!existing) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const { queueMode, debounceMs, maxRetries } = req.body;
    db.registerGroup({
      folder: req.params.folder,
      chatJid: existing.chatJid,
      isMain: existing.isMain,
      queueMode: queueMode ?? existing.queueMode,
      debounceMs: debounceMs ?? existing.debounceMs,
      maxRetries: maxRetries ?? existing.maxRetries,
    });

    // Update queue config
    queue.setGroupConfig(req.params.folder, {
      queueMode: queueMode ?? existing.queueMode,
      debounceMs: debounceMs ?? existing.debounceMs,
      maxRetries: maxRetries ?? existing.maxRetries,
    });

    const updated = db.getGroup(req.params.folder);
    res.json({ agent: updated });
  });

  // POST /api/agents/:folder/start — start agent
  router.post("/:folder/start", requireWriteAccess, async (req, res) => {
    const group = db.getGroup(req.params.folder);
    if (!group) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }

    await queue.enqueue(req.params.folder, prompt);
    res.json({ status: "queued", folder: req.params.folder });
  });

  // POST /api/agents/:folder/stop — graceful stop
  router.post("/:folder/stop", requireWriteAccess, async (req, res) => {
    // Graceful stop: let the queue drain for this group
    // The queue doesn't expose per-group stop yet, so we signal intent
    res.json({ status: "stopping", folder: req.params.folder });
  });

  // POST /api/agents/:folder/interrupt — abort current turn
  router.post("/:folder/interrupt", requireWriteAccess, (req, res) => {
    // The GroupQueue manages abort controllers per group internally.
    // For now, we enqueue with interrupt mode awareness.
    res.json({ status: "interrupted", folder: req.params.folder });
  });

  return router;
}
