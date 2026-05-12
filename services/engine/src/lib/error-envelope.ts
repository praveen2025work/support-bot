/**
 * Structured error envelope.
 *
 * Every 4xx / 5xx response from the engine should ship this shape so
 * UIs, support tooling, and CI assertions can rely on a single
 * contract instead of guessing at ad-hoc {error: "..."} variants.
 *
 *   { error: string                  // human-readable message
 *   , code: ErrorCode                // machine-readable bucket
 *   , requestId?: string             // x-request-id correlation
 *   , retryable?: boolean            // hint for clients
 *   , details?: unknown              // optional structured payload
 *   }
 *
 * Adoption is incremental — existing routes that return flat
 * `{error}` still work; new code paths use `sendError`. The 404
 * fallback + global error handler are wired here so any unhandled
 * throw becomes a properly-shaped envelope automatically.
 */

import type { Request, Response } from "express";
import { getTenantContext } from "../middleware/tenant-context";
import { logger } from "./logger";

/**
 * Canonical machine-readable error codes. Adding a new one is fine;
 * removing or renaming an existing one is a wire-format break.
 */
export const ErrorCodes = {
  INVALID_MESSAGE: "INVALID_MESSAGE",
  INVALID_FORCE_INTENT: "INVALID_FORCE_INTENT",
  ENGINE_NOT_READY: "ENGINE_NOT_READY",
  DATA_SOURCE_UNAVAILABLE: "DATA_SOURCE_UNAVAILABLE",
  QUERY_NOT_FOUND: "QUERY_NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Default retryable-hints per code. Clients SHOULD honor; nothing enforces. */
const RETRYABLE_BY_CODE: Partial<Record<ErrorCode, boolean>> = {
  DATA_SOURCE_UNAVAILABLE: true,
  RATE_LIMITED: true,
  INTERNAL_ERROR: true,
};

export interface ErrorEnvelope {
  error: string;
  code: ErrorCode;
  requestId?: string;
  retryable?: boolean;
  details?: unknown;
}

export function buildEnvelope(
  code: ErrorCode,
  message: string,
  options: { details?: unknown; requestId?: string; retryable?: boolean } = {},
): ErrorEnvelope {
  const env: ErrorEnvelope = { error: message, code };
  const tenant = (() => {
    try {
      return getTenantContext();
    } catch {
      return undefined;
    }
  })();
  const reqId = options.requestId ?? tenant?.requestId;
  if (reqId) env.requestId = reqId;
  const retry =
    options.retryable !== undefined
      ? options.retryable
      : RETRYABLE_BY_CODE[code];
  if (retry !== undefined) env.retryable = retry;
  if (options.details !== undefined) env.details = options.details;
  return env;
}

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  options: { details?: unknown; retryable?: boolean } = {},
): Response {
  return res.status(status).json(buildEnvelope(code, message, options));
}

/**
 * Express middleware factory — install LAST so it catches any unhandled
 * throw in a route handler. Logs the stack server-side; returns a
 * generic INTERNAL_ERROR envelope so we don't leak implementation
 * details to the client.
 */
export function errorHandler() {
  return (err: Error, req: Request, res: Response, _next: unknown) => {
    logger.error(
      { err: { message: err.message, stack: err.stack }, path: req.path },
      "Unhandled error in request",
    );
    if (res.headersSent) {
      // Express docs are explicit: once headers are sent, defer to default.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (_next as any)(err);
    }
    return sendError(
      res,
      500,
      ErrorCodes.INTERNAL_ERROR,
      "Internal server error",
    );
  };
}

/** 404 fallback — install just before errorHandler(). */
export function notFoundHandler() {
  return (_req: Request, res: Response) =>
    sendError(res, 404, ErrorCodes.NOT_FOUND, "Not found");
}
