/**
 * Auth middleware with role-based access control.
 *
 * Roles:
 *  - admin: full access
 *  - operator: can read and write (start/stop agents, manage tasks)
 *  - viewer: read-only access
 */
import type { Request, Response, NextFunction } from "express";

export type UserRole = "admin" | "operator" | "viewer";

declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
    }
  }
}

/**
 * Extracts user role from the request.
 * Currently uses X-User-Role header (placeholder for real auth).
 * Defaults to "admin" when no header is present (dev mode).
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const roleHeader = req.headers["x-user-role"];
  const role = (typeof roleHeader === "string" && ["admin", "operator", "viewer"].includes(roleHeader))
    ? roleHeader as UserRole
    : "admin";
  req.userRole = role;
  next();
}

/**
 * Middleware that rejects requests from viewers (read-only users).
 * Use on routes that perform write operations.
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole === "viewer") {
    res.status(403).json({ error: "Forbidden: viewers have read-only access" });
    return;
  }
  next();
}

/**
 * Middleware that restricts access to admin users only.
 * Use on dangerous operations (settings, user management).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}
