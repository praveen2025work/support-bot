import express from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import {
  errorHandler,
  notFoundHandler,
  sendError,
  ErrorCodes,
} from "./lib/error-envelope";
import { config } from "./lib/config";
import { getGroupConfigs, initGroupConfig } from "./config/group-config";
import { migrateQueriesFromDbJson } from "./core/catalog/query-registry";
import {
  startHealthMonitor,
  stopHealthMonitor,
  getAllHealth,
} from "./core/sources/health-monitor";
import { metricsRouter } from "./routes/metrics";
import { openapiRouter } from "./routes/openapi";
import { registerGauge } from "./lib/metrics";
import { getEngineCount } from "./lib/singleton";
import { setDraining } from "./lib/lifecycle";
import {
  startCalibrationScheduler,
  stopCalibrationScheduler,
} from "./core/scheduler/calibration-scheduler";
import { chatRouter } from "./routes/chat";
import { adminRouter } from "./routes/admin/index";
import { viewsRouter } from "./routes/views";
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
import homeFeedRouter from "./routes/home-feed";
import workflowsRouter from "./routes/workflows";
import { logger } from "./lib/logger";
import {
  startScheduleExecutor,
  stopScheduleExecutor,
} from "./core/scheduler/schedule-executor";
import { WatchExecutor } from "./core/watch/watch-executor";
import { tenantContextMiddleware } from "./middleware/tenant-context";
import { securityHeaders } from "./lib/security-headers";

const app = express();
const PORT = parseInt(process.env.ENGINE_PORT || "4001", 10);

// Middleware
app.use(
  cors({
    origin: process.env.UI_ORIGIN || "http://localhost:3001",
    credentials: true,
  }),
);
// Security headers (X-Content-Type-Options, X-Frame-Options,
// Referrer-Policy, Permissions-Policy). CSP is opt-in via ENGINE_CSP
// env — see lib/security-headers.ts for rationale.
app.use(securityHeaders);
// Response compression (gzip/brotli). Sits after security headers and before
// the routes so JSON responses — especially the large (~2MB) chat result
// payloads — are compressed on the wire. The default threshold (1KB) skips
// tiny bodies. The Next proxy uses fetch, which transparently decodes
// Content-Encoding, so no proxy-side change is needed.
//
// SSE EXCEPTION: the streaming /api/events route (text/event-stream) must NOT
// be compressed — the gzip transform buffers writes and a never-ending SSE
// stream would never flush, so the client would hang on the first event. The
// filter skips event-stream responses and defers to compression's default for
// everything else.
app.use(
  compression({
    filter: (req, res) => {
      const contentType = res.getHeader("Content-Type");
      if (
        typeof contentType === "string" &&
        contentType.includes("text/event-stream")
      ) {
        return false;
      }
      return compression.filter(req, res);
    },
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
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(
      res,
      429,
      ErrorCodes.RATE_LIMITED,
      "Too many requests, please try again later",
    ),
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_ADMIN || "200", 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(
      res,
      429,
      ErrorCodes.RATE_LIMITED,
      "Too many admin requests, please try again later",
    ),
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
app.use("/api/home-feed", homeFeedRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/views", viewsRouter);
// /api/metrics — Prometheus scrape (public, no admin auth)
app.use("/api", metricsRouter);
// /api/openapi.json — hand-maintained OpenAPI 3.0 spec (public)
app.use("/api", openapiRouter);

// Register gauge providers — pulled on every scrape, no buffering.
// Engines map and source health map are cheap to read.
registerGauge("engines_initialized", () => getEngineCount());
registerGauge(
  "sources_ok",
  () => getAllHealth().filter((s) => s.status === "ok").length,
);
registerGauge(
  "sources_unreachable",
  () => getAllHealth().filter((s) => s.status === "unreachable").length,
);

// 404 + global error handler — both return the structured envelope
// from lib/error-envelope.ts ({error, code, requestId, retryable}).
app.use(notFoundHandler());
app.use(errorHandler());

// Seed in-memory group config from the runtime CONFIG_DIR file before serving.
// dist bundles a build-time groups.json snapshot; the live config lives on the
// CONFIG_DIR volume. Without this, restarts revert reads to the stale snapshot
// and admin-created groups 404 on edit. See config/group-config.ts.
initGroupConfig();

// One-time, idempotent: if this deployment still carries a legacy mock-api
// db.json and has no per-group query files yet, seed the file-based store from
// it. No-op in steady state (per-group files present) and in db.json-free
// deployments. See core/catalog/query-registry.ts.
migrateQueriesFromDbJson(getGroupConfigs());

const server = app.listen(PORT, () => {
  logger.info(`Engine server running at http://localhost:${PORT}`);

  // Start the schedule executor (checks every 60s for due schedules)
  startScheduleExecutor();

  // Start the NLP calibration scheduler (off unless CALIBRATION_ENABLED=true)
  startCalibrationScheduler();

  // Start the watch executor (checks every 60s for triggered watch rules)
  const watchExecutor = new WatchExecutor(path.resolve(__dirname, "../data"));
  watchExecutor.start();

  // Start the data-source health monitor with every unique baseUrl
  // we know about: the global default + any per-group overrides.
  // The monitor probes each at ~30s intervals and exposes status at
  // /api/admin/sources/health.
  try {
    const groupConfigs = getGroupConfigs();
    const baseUrls = new Set<string>();
    if (config.apiBaseUrl) baseUrls.add(config.apiBaseUrl);
    for (const g of Object.values(groupConfigs)) {
      if (g.apiBaseUrl) baseUrls.add(g.apiBaseUrl);
    }
    startHealthMonitor(Array.from(baseUrls));
    logger.info(
      { sources: Array.from(baseUrls) },
      "Source health monitor started",
    );
  } catch (err) {
    logger.warn(
      { err },
      "Could not start source health monitor (continuing without it)",
    );
  }
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
// How long to keep serving in-flight traffic after flipping readiness to
// 503, before we stop the server. Gives load balancers time to observe
// /health/ready failing and drain this instance out of rotation.
const SHUTDOWN_DRAIN_MS = Number(process.env.SHUTDOWN_DRAIN_MS) || 5_000;

let shuttingDown = false;

async function shutdown(signal: string) {
  // Idempotent — a second SIGTERM/SIGINT during drain must not restart it.
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(
    { signal, drainMs: SHUTDOWN_DRAIN_MS },
    "Draining before shutdown — readiness now reports 503...",
  );

  // Backstop: force-exit if the graceful path stalls (covers drain + close).
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, SHUTDOWN_DRAIN_MS + 10_000).unref();

  // Flip readiness to 503 and let the load balancer stop sending new
  // requests before we tear anything down.
  setDraining(true);
  await new Promise((resolve) => setTimeout(resolve, SHUTDOWN_DRAIN_MS));

  logger.info("Drain window elapsed — closing server");
  stopScheduleExecutor();
  stopCalibrationScheduler();
  stopHealthMonitor();
  // Stop accepting new connections and close existing ones
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
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
