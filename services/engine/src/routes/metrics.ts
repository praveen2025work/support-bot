/**
 * Prometheus scrape endpoint. Public by design — scrapers don't
 * authenticate, so we route this OUTSIDE the admin path. Don't put
 * any sensitive labels in your metrics (no PII, no full user IDs;
 * use opaque tenant IDs if you must).
 *
 * Renders text/plain in the Prometheus exposition format. Any scraper
 * that speaks OpenMetrics also accepts this.
 */

import { Router, Request, Response } from "express";
import { renderPrometheus } from "@/lib/metrics";

export const metricsRouter = Router();

metricsRouter.get("/metrics", (_req: Request, res: Response) => {
  res.set("Content-Type", "text/plain; version=0.0.4");
  res.send(renderPrometheus());
});
