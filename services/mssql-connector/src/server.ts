import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { healthRouter } from "@/routes/health";
import { connectorsRouter } from "@/routes/connectors";
import { queriesRouter } from "@/routes/queries";
import { filtersRouter } from "@/routes/filters";
import { apiKeyAuth } from "@/middleware/auth";
import { connectionManager } from "@/core/connection-manager";
import { logger } from "@/lib/logger";
import { CONNECTOR_PORT, CONNECTOR_TYPE, UI_ORIGIN } from "@/lib/env-config";

const app = express();

// ── Middleware ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: UI_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT || "300", 10),
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// API key auth (only active when CONNECTOR_API_KEY env is set)
app.use(apiKeyAuth);

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, "Request");
  next();
});

// ── Routes ───────────────────────────────────────────────────────────
app.use("/", healthRouter);
app.use("/api/connectors", connectorsRouter);
app.use("/api/queries", queriesRouter);
app.use("/api/filters", filtersRouter);

// ── 404 handler ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Error handler ────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ error: err.message, stack: err.stack }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  },
);

// ── Start ────────────────────────────────────────────────────────────
const server = app.listen(CONNECTOR_PORT, () => {
  logger.info(
    `MSSQL Connector service (${CONNECTOR_TYPE}) running at http://localhost:${CONNECTOR_PORT}`,
  );
});

// ── Graceful shutdown ────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully...");

  // Close all database connection pools
  await connectionManager.shutdown();

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGHUP", () => shutdown("SIGHUP"));

process.on("unhandledRejection", (reason, promise) => {
  logger.error(
    { reason, promise: String(promise) },
    "Unhandled promise rejection — keeping server alive",
  );
});

process.on("uncaughtException", (error) => {
  logger.error(
    { error: error.message, stack: error.stack },
    "Uncaught exception — keeping server alive",
  );
});

export default app;
