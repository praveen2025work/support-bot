import { Request, Response, NextFunction } from "express";
import { CONNECTOR_API_KEY } from "@/lib/env-config";

/**
 * API key authentication middleware.
 * Only active when CONNECTOR_API_KEY is set.
 */
export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!CONNECTOR_API_KEY) {
    next();
    return;
  }

  const provided =
    req.headers["x-api-key"] ||
    req.headers["authorization"]?.replace("Bearer ", "");
  if (provided !== CONNECTOR_API_KEY) {
    res.status(401).json({ error: "Unauthorized — valid API key required" });
    return;
  }
  next();
}
