/**
 * Full state snapshot route for WS reconnect.
 */
import { Router } from "express";
import type { Database } from "../../db.js";

export function stateRoutes(db: Database): Router {
  const router = Router();

  // GET /api/state/snapshot — full state for WS reconnect
  router.get("/snapshot", (req, res) => {
    const agents = db.getAllGroups();
    const tasks = db.getAllTasks();
    const sessions = agents
      .filter(g => g.sessionId)
      .map(g => ({
        id: g.sessionId!,
        folder: g.folder,
        chatJid: g.chatJid,
      }));

    res.json({
      snapshot: {
        agents,
        sessions,
        tasks,
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}
