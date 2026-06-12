import pino from "pino";
import { config } from "./config";
import { INSTANCE_ID } from "./env-config";
import { createLogShipStream } from "./log-ship-stream";

// ---------------------------------------------------------------------------
// Sensitive data redaction
// Pino's built-in redaction replaces values at the listed paths with
// "[Redacted]" before the log record is serialised.
// ---------------------------------------------------------------------------
const redactPaths = [
  "apiKey",
  "api_key",
  "token",
  "password",
  "secret",
  "authorization",
  "cookie",
  // Nested variants (e.g. req.headers.authorization)
  "req.headers.authorization",
  "req.headers.cookie",
];

// ---------------------------------------------------------------------------
// Log destinations
//   - Dev (no shipping):       pretty, colorized console (pino-pretty).
//   - Production (no shipping): structured single-line JSON to stdout — the
//     container runtime / process manager handles rotation + collection.
//   - LOG_SHIP_URL set:        structured JSON to stdout AND an external HTTP
//     sink (see createLogger / log-ship-stream). Hosting-agnostic; no-op when
//     LOG_SHIP_URL is unset.
// ---------------------------------------------------------------------------

/**
 * Build pino options from an env snapshot. Pure and fully env-driven (it does
 * not read module-level state) so it can be unit-tested without constructing
 * the logger singleton.
 */
export function buildLoggerOptions(
  env: NodeJS.ProcessEnv = process.env,
): pino.LoggerOptions {
  const nodeEnv = env.NODE_ENV || config.nodeEnv;
  const isDev = nodeEnv !== "production";
  const level = env.LOG_LEVEL || (isDev ? "debug" : "info");
  const shipUrl = env.LOG_SHIP_URL?.trim();

  const options: pino.LoggerOptions = {
    level,
    // Attribute every record to this instance/env so multi-instance log search
    // can tell pods apart.
    base: { instance: INSTANCE_ID, env: nodeEnv },
    redact: { paths: redactPaths, censor: "[Redacted]" },
  };

  // Pretty console only in dev AND only when we're not shipping: shipping uses
  // a multistream fan-out which is incompatible with a transport worker.
  if (isDev && !shipUrl) {
    options.transport = {
      target: "pino-pretty",
      options: { colorize: true },
    };
  }

  return options;
}

function parseShipHeaders(
  raw: string | undefined,
): Record<string, string> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, string>;
    }
  } catch {
    // Malformed LOG_SHIP_HEADERS — ship without the extra headers rather than
    // crash the process on a logging-config typo.
  }
  return undefined;
}

function createLogger(): pino.Logger {
  const env = process.env;
  const options = buildLoggerOptions(env);
  const shipUrl = env.LOG_SHIP_URL?.trim();
  if (!shipUrl) {
    return pino(options);
  }

  // External shipping: fan out to stdout (structured JSON) and the HTTP sink.
  const level = (options.level as pino.Level) ?? "info";
  const shipLevel = (env.LOG_SHIP_LEVEL as pino.Level) || level;
  const shipStream = createLogShipStream({
    url: shipUrl,
    headers: parseShipHeaders(env.LOG_SHIP_HEADERS),
    batchSize: Number(env.LOG_SHIP_BATCH_SIZE) || undefined,
    intervalMs: Number(env.LOG_SHIP_INTERVAL_MS) || undefined,
  });

  return pino(
    options,
    pino.multistream([
      { level, stream: process.stdout },
      { level: shipLevel, stream: shipStream },
    ]),
  );
}

export const logger = createLogger();
