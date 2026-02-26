/**
 * Session list and detail routes.
 */
import { Router } from "express";
import type { Database } from "../../db.js";

export function sessionRoutes(db: Database): Router {
  const router = Router();

  // GET /api/sessions — list sessions (derived from groups with active sessionIds)
  router.get("/", (req, res) => {
    const groups = db.getAllGroups();
    const sessions = groups
      .filter(g => g.sessionId)
      .map(g => ({
        id: g.sessionId!,
        folder: g.folder,
        chatJid: g.chatJid,
      }));
    res.json({ sessions });
  });

  // GET /api/sessions/:id — session detail
  router.get("/:id", (req, res) => {
    const groups = db.getAllGroups();
    const group = groups.find(g => g.sessionId === (req.params.id as string));
    if (!group) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({
      session: {
        id: group.sessionId,
        folder: group.folder,
        chatJid: group.chatJid,
        queueMode: group.queueMode,
      },
    });
  });

  return router;
}
