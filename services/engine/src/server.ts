import express from "express";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { chatRouter } from "./routes/chat";
import { adminRouter } from "./routes/admin/index";
import { queriesRouter } from "./routes/queries";
import { statsRouter } from "./routes/stats";
import { healthRouter } from "./routes/health";
import { userRouter } from "./routes/user";
import docsRouter from "./routes/docs";
import { preferencesRouter } from "./routes/preferences";
import { dashboardsRouter } from "./routes/dashboards";
import { gridboardViewsRouter } from "./routes/gridboard-views";
import { eventsRouter } from "./routes/events";
import { dataApiRouter } from "./routes/data-api";
import { integrationsRouter } from "./routes/integrations";
import { feedbackRouter } from "./routes/feedback";
import { sessionRouter } from "./routes/session";
import { uploadRouter } from "./routes/upload";
import { urlIngestRouter } from "./routes/url-ingest";
import catalogRouter from "./routes/catalog";
import watchRouter from "./routes/watch";
import workflowsRouter from "./routes/workflows";
import { logger } from "./lib/logger";
import {
  startScheduleExecutor,
  stopScheduleExecutor,
} from "./core/scheduler/schedule-executor";
import { WatchExecutor } from "./core/watch/watch-executor";
import { tenantContextMiddleware } from "./middleware/tenant-context";

const app = express();
const PORT = parseInt(process.env.ENGINE_PORT || "4001", 10);

// Middleware
app.use(
  cors({
    origin: process.env.UI_ORIGIN || "http://localhost:3001",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(tenantContextMiddleware);

// Rate limiting — tuned for 1500 req/min throughput
// Chat: 1500/min per IP (the target throughput)
// Admin: 200/min per IP (admin operations are heavier)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_CHAT || "1500", 10),
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_ADMIN || "200", 10),
  message: { error: "Too many admin requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Concurrency limiter — prevents CPU saturation from too many simultaneous
// NLP classifications. At 25 req/sec with ~50ms NLP time, we need ~2
// concurrent slots to keep up. Set to 50 to handle burst + API wait time.
let activeRequests = 0;
const MAX_CONCURRENT = parseInt(
  process.env.MAX_CONCURRENT_REQUESTS || "50",
  10,
);

function concurrencyLimiter(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (activeRequests >= MAX_CONCURRENT) {
    logger.warn(
      { activeRequests, maxConcurrent: MAX_CONCURRENT },
      "Concurrency limit reached — rejecting request",
    );
    return res.status(503).json({ error: "Server busy, please retry shortly" });
  }
  activeRequests++;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      activeRequests--;
    }
  };
  res.on("finish", release);
  res.on("close", release);
  next();
}

// Request logging (debug level to reduce I/O at high throughput)
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, "Request");
  next();
});

// Routes
app.use("/api/chat", chatLimiter, concurrencyLimiter, chatRouter);
app.use("/api/admin", adminLimiter, adminRouter);
app.use("/api", queriesRouter);
app.use("/api/data", chatLimiter, dataApiRouter);
app.use("/api/stats", statsRouter);
app.use("/api", healthRouter);
app.use("/api", userRouter);
app.use("/api", docsRouter);
app.use("/api/preferences", preferencesRouter);
app.use("/api/dashboards", dashboardsRouter);
app.use("/api/gridboard-views", gridboardViewsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/session", sessionRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/url-ingest", urlIngestRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/watch", watchRouter);
app.use("/api/workflows", workflowsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
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

const server = app.listen(PORT, () => {
  logger.info(`Engine server running at http://localhost:${PORT}`);

  // Start the schedule executor (checks every 60s for due schedules)
  startScheduleExecutor();

  // Start the watch executor (checks every 60s for triggered watch rules)
  const watchExecutor = new WatchExecutor(path.resolve(__dirname, "../data"));
  watchExecutor.start();
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully...");
  stopScheduleExecutor();
  // Stop accepting new connections and close existing ones
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit if the server hasn't closed within 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
// Windows: NSSM sends SIGHUP or uses process.kill(); handle 'beforeExit' as fallback
process.on("SIGHUP", () => shutdown("SIGHUP"));
// Windows service stop — ensure clean exit even if signals are missed
process.on("beforeExit", (code) => {
  if (code === 0) logger.info("Process exiting cleanly");
});

// ---------------------------------------------------------------------------
// Crash protection — prevent unhandled errors from killing the process
// ---------------------------------------------------------------------------
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
  // Note: for truly fatal errors (out of memory, etc.), the process will still die.
  // For recoverable errors (bad request handling, missing file, etc.), we stay alive.
});

export default app;
