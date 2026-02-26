/**
 * Express API server setup with JSON, CORS, and route mounting.
 */
import express from "express";
import type { Database } from "../db.js";
import type { GroupQueue } from "../group-queue.js";
import { authMiddleware } from "./middleware/auth.js";
import { agentRoutes } from "./routes/agents.js";
import { sessionRoutes } from "./routes/sessions.js";
import { taskRoutes } from "./routes/tasks.js";
import { stateRoutes } from "./routes/state.js";

export function createApiServer(db: Database, queue: GroupQueue): express.Express {
  const app = express();

  // Middleware
  app.use(express.json());

  // CORS — allow all origins for development
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Auth
  app.use(authMiddleware);

  // Routes
  app.use("/api/agents", agentRoutes(db, queue));
  app.use("/api/sessions", sessionRoutes(db));
  app.use("/api/tasks", taskRoutes(db));
  app.use("/api/state", stateRoutes(db));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Error handler (Express 5 supports async error handling)
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
