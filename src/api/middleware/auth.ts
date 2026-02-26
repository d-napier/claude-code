/**
 * Basic auth middleware — placeholder for future auth implementation.
 */
import type { Request, Response, NextFunction } from "express";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Placeholder: accept all requests for now.
  // Future: validate Bearer token or API key from Authorization header.
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // Token validation would go here
  }
  next();
}
