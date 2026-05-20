/**
 * Serve the hand-maintained OpenAPI 3.0 spec for the engine.
 *
 * Spec lives at services/engine/openapi.json — updated by hand when
 * new admin endpoints land. A pre-merge CI gate verifies the spec
 * is valid JSON (and the harness exercises the documented routes).
 *
 * Endpoint is public — operators want to point Swagger UI / Redoc /
 * Postman / Bruno at it without auth gates. Don't put secrets in
 * the spec itself; descriptions are fine, but no credentials.
 */

import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/logger";

export const openapiRouter = Router();

const SPEC_PATH =
  process.env.OPENAPI_PATH || path.join(process.cwd(), "openapi.json");

let cached: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

openapiRouter.get("/openapi.json", async (_req: Request, res: Response) => {
  try {
    // Cache for 60s — the file is hand-edited so it doesn't churn,
    // but we don't want a stat per scrape either.
    if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
      res.set("Content-Type", "application/json");
      return res.send(cached);
    }
    const raw = await fs.readFile(SPEC_PATH, "utf-8");
    // Validate it parses — better to 500 here than send malformed
    // JSON to Swagger UI.
    JSON.parse(raw);
    cached = raw;
    cachedAt = Date.now();
    res.set("Content-Type", "application/json");
    return res.send(raw);
  } catch (err) {
    logger.error({ err, specPath: SPEC_PATH }, "Failed to serve openapi.json");
    return res.status(500).json({
      error: "OpenAPI spec not available",
      code: "INTERNAL_ERROR",
    });
  }
});
