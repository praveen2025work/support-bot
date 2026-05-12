import { Router, Request, Response } from "express";
import { getEngine } from "@/lib/singleton";
import { createAdapter } from "@/adapters/adapter-factory";
import { getTenantContext, getTenantLogger } from "@/middleware/tenant-context";
import { encryptLogEntry } from "@/lib/log-encryption";
import { AsyncLogWriter } from "@/lib/async-log-writer";
import { preferencesStore } from "@/data/user-preferences";
import { getInteractionTracker } from "@/core/recommendations/interaction-tracker";
import { paths } from "@/lib/env-config";
import { logAudit } from "@/lib/audit-logger";
import { sendError, ErrorCodes } from "@/lib/error-envelope";
import { ApiConnectionError, CircuitOpenError } from "@/lib/errors";

/**
 * Wall-clock budget for a single /api/chat request. Default 30s; can
 * be overridden per-deployment via env. Hitting this throws a
 * ChatRequestTimeoutError which the outer catch maps to a
 * DATA_SOURCE_UNAVAILABLE envelope (retryable=true).
 *
 * Note: this is the OUTER timeout — the engine and ApiClient have
 * their own inner timeouts (NLP cold-start, upstream HTTP, etc.).
 * The outer budget covers compound stalls those inner timeouts
 * don't catch on their own (e.g. very slow follow-up chains).
 */
const CHAT_REQUEST_TIMEOUT_MS = parseInt(
  process.env.CHAT_REQUEST_TIMEOUT_MS || "30000",
  10,
);

class ChatRequestTimeoutError extends Error {
  constructor(public elapsedMs: number) {
    super(`Chat request exceeded ${elapsedMs}ms budget`);
    this.name = "ChatRequestTimeoutError";
  }
}

function withChatTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ChatRequestTimeoutError(CHAT_REQUEST_TIMEOUT_MS)),
      CHAT_REQUEST_TIMEOUT_MS,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
    // Suppress unused-label warning in JS engine introspection
    void label;
  });
}
import { broadcastEvent } from "./events";

export const chatRouter = Router();

// Async buffered log writer — batches writes every 500ms or 50 entries.
// Replaces appendFileSync which blocked the event loop on every request.
const conversationLogger = new AsyncLogWriter(paths.data.conversationsLog, {
  flushIntervalMs: 500,
  maxBatchSize: 50,
  maxBufferSize: 10_000,
});

function logConversation(entry: Record<string, unknown>) {
  try {
    conversationLogger.append(encryptLogEntry(JSON.stringify(entry)));
  } catch {
    // Non-blocking — never fail the chat request due to logging
  }
}

chatRouter.post("/", async (req: Request, res: Response) => {
  const log = getTenantLogger();
  const ctx = getTenantContext();

  try {
    const body = req.body;
    const groupId = ctx?.groupId || body.groupId || "default";
    const platform = ctx?.platform || body.platform || "web";

    const adapter = createAdapter(platform);
    const message = await adapter.parseIncoming(body);

    if (!message) {
      return sendError(
        res,
        400,
        ErrorCodes.INVALID_MESSAGE,
        "Invalid message format",
      );
    }

    // Pass feedback signals and userId through to the learning/recommendation services
    if (body.feedbackType) message.feedbackType = body.feedbackType;
    if (body.previousMessageText)
      message.previousMessageText = body.previousMessageText;
    if (body.userName) message.userId = body.userName;

    // Cross-surface tracking: record which UI surface the message came from
    const surface = body.surface as string | undefined;
    if (surface) {
      (message as unknown as Record<string, unknown>).surface = surface;
    }

    const engine = await getEngine(groupId);
    const explicitFilters = body.explicitFilters as
      | Record<string, string>
      | undefined;
    const followUpMode = body.followUpMode as "local" | "requery" | undefined;

    // forceIntent: chip click from a "Did you mean?" disambiguation message.
    // The UI sends the chosen candidate's queryName here; we validate it
    // against the user's group catalog before passing it to the engine
    // (which uses it to bypass NLP). Foreign intents → 400 so a malicious
    // / outdated client can't run queries it shouldn't.
    const rawForceIntent = body.forceIntent;
    let forceIntent: string | undefined;
    if (rawForceIntent !== undefined && rawForceIntent !== null) {
      if (typeof rawForceIntent !== "string" || rawForceIntent.length === 0) {
        log.warn(
          { rawForceIntent, sessionId: body.sessionId },
          "Rejected forceIntent: not a non-empty string",
        );
        return sendError(
          res,
          400,
          ErrorCodes.INVALID_FORCE_INTENT,
          "Invalid forceIntent",
        );
      }
      try {
        const queryRecord = await engine.findQueryByName(rawForceIntent);
        if (!queryRecord) {
          // Structured warn log here (not audit) — the audit-logger action
          // enum does not currently include "reject"; extending it is out of
          // scope for this PR. The warn-level log gives admins/SOC the same
          // signal they need to spot probing or stale clients.
          log.warn(
            {
              forceIntent: rawForceIntent,
              groupId,
              userId: body.userName,
              sessionId: body.sessionId,
              platform,
              ip:
                (req.headers["x-forwarded-for"] as string | undefined)
                  ?.split(",")[0]
                  ?.trim() ?? req.ip,
            },
            "Rejected forceIntent: query not in user's group",
          );
          return sendError(
            res,
            400,
            ErrorCodes.INVALID_FORCE_INTENT,
            "forceIntent not permitted for this group",
          );
        }
        // Re-bind to the canonical name to prevent case mismatch downstream.
        forceIntent = queryRecord.name;
      } catch (validationErr) {
        log.error(
          { err: validationErr, forceIntent: rawForceIntent },
          "forceIntent validation threw — failing request",
        );
        return sendError(
          res,
          500,
          ErrorCodes.INTERNAL_ERROR,
          "Could not validate forceIntent",
        );
      }
    }

    // Forward auth-related headers for Windows Auth / BAM pass-through
    const incomingHeaders: Record<string, string> = {};
    if (req.headers["authorization"]) {
      incomingHeaders["authorization"] = req.headers["authorization"] as string;
    }
    if (req.headers["cookie"]) {
      incomingHeaders["cookie"] = req.headers["cookie"] as string;
    }
    // Role header — drives PII clear-text view permission downstream.
    // Default to "viewer" when missing so masking is the safe default;
    // privileged callers (admin) explicitly opt in via the header.
    if (req.headers["x-user-role"]) {
      incomingHeaders["x-user-role"] = req.headers["x-user-role"] as string;
    }

    // Follow-up chain: process initial query + all follow-ups server-side,
    // returning only the final result (avoids sequential round-trips)
    const followUpChain = body.followUpChain as string[] | undefined;
    const cardValueColumns = body.valueColumns as string[] | undefined;
    const hdrs =
      Object.keys(incomingHeaders).length > 0 ? incomingHeaders : undefined;

    let response;
    if (followUpChain?.length) {
      log.info(
        { chain: followUpChain, initialText: message.text },
        "Processing followUpChain",
      );
      // Process initial message (query execution) — no followUpMode restriction.
      // forceIntent applies to the initial message only; follow-ups are local.
      response = await withChatTimeout(
        engine.processMessage(
          message,
          explicitFilters,
          hdrs,
          undefined,
          forceIntent,
        ),
        "initial-message",
      );
      log.info(
        {
          initialIntent: response.intent,
          initialText: response.text?.substring(0, 80),
          sessionId: message.sessionId,
        },
        "Chain: initial query result",
      );

      // Apply per-card valueColumns override to context before follow-ups
      if (cardValueColumns?.length) {
        const ctx = await engine.getContext(
          message.sessionId,
          message.userId,
          message.groupId,
        );
        const existing = (ctx.lastColumnConfig || {}) as Record<
          string,
          unknown
        >;
        ctx.lastColumnConfig = { ...existing, valueColumns: cardValueColumns };
      }

      // Then process each follow-up in sequence
      for (const followUpText of followUpChain) {
        const followUpMsg = await adapter.parseIncoming({
          text: followUpText,
          platform: body.platform,
          sessionId: body.sessionId,
          groupId: body.groupId,
          userName: body.userName,
        });
        if (followUpMsg) {
          response = await withChatTimeout(
            engine.processMessage(followUpMsg, undefined, hdrs, "local"),
            `followup:${followUpText}`,
          );
          log.info(
            {
              followUp: followUpText,
              intent: response.intent,
              text: response.text?.substring(0, 80),
              sessionId: followUpMsg.sessionId,
            },
            "Chain: follow-up result",
          );
        }
      }
    } else {
      response = await withChatTimeout(
        engine.processMessage(
          message,
          explicitFilters,
          hdrs,
          followUpMode,
          forceIntent,
        ),
        "single-message",
      );
    }
    const formatted = await adapter.formatResponse(response);

    logConversation({
      timestamp: new Date().toISOString(),
      sessionId: message.sessionId,
      groupId,
      platform,
      requestId: ctx?.requestId,
      userMessage: followUpChain?.length
        ? `${message.text} → [${followUpChain.join(" → ")}]`
        : message.text,
      botResponse: response.text,
      intent: response.intent,
      confidence: response.confidence,
      executionMs: response.executionMs,
      hasRichContent: !!response.richContent,
    });

    // Audit log: capture query executions for admin review.
    // Skip non-auditable intents (greeting, help, conversational) — they're
    // already in the conversation log and would flood the audit stream.
    if (response.intent === "query.execute" && response.queryName) {
      logAudit({
        action: "execute",
        resource: "query",
        resourceId: response.queryName,
        groupId,
        userId: body.userName as string | undefined,
        ip:
          (req.headers["x-forwarded-for"] as string | undefined)
            ?.split(",")[0]
            ?.trim() ?? req.ip,
        details: {
          sessionId: message.sessionId,
          platform,
          confidence: response.confidence,
          executionMs: response.executionMs,
          followUpChain: followUpChain ?? undefined,
          // forceIntent path (chip click): surfaces the validated query name
          // so audit shows "user picked X via disambig chip" vs free-text.
          forceIntent,
        },
      }).catch(() => {
        // logAudit already logs its own errors; never fail the chat request.
      });
    }

    // Track user-query interactions for ML recommendations
    const userName = body.userName as string | undefined;
    if (userName && response.queryName && response.intent === "query.execute") {
      getInteractionTracker(groupId)
        .record(userName, response.queryName)
        .catch(() => {});
    }

    // Auto-track recent queries for dashboard
    if (userName && response.intent?.startsWith("query.")) {
      preferencesStore
        .appendRecent(userName, {
          queryName: response.queryName || response.intent,
          groupId,
          userMessage: message.text,
          intent: response.intent,
          timestamp: new Date().toISOString(),
          executionMs: response.executionMs,
        })
        .catch(() => {});
    }

    const elapsed = ctx ? Date.now() - ctx.startTime : undefined;
    log.info(
      {
        sessionId: message.sessionId,
        intent: response.intent,
        executionMs: elapsed,
      },
      "Chat request completed",
    );

    broadcastEvent("chat_message", {
      timestamp: new Date().toISOString(),
      intent: response.intent,
      confidence: response.confidence,
      queryName: response.queryName,
      executionMs: response.executionMs,
      groupId: body.groupId || "default",
    });

    return res.json(formatted);
  } catch (error) {
    const err =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
    log.error({ error: err }, "Chat API error");
    // Map upstream-data-source failures to DATA_SOURCE_UNAVAILABLE
    // (retryable=true) so clients can distinguish "the bot is broken"
    // from "your data source is down — try again in a minute".
    //   ApiConnectionError = network/timeout failure after retries.
    //   CircuitOpenError   = circuit breaker tripped (too many recent fails).
    //   ChatRequestTimeoutError = wall-clock budget exceeded — almost
    //     always means a slow upstream; same operator action (try again,
    //     check sources/health) so we collapse to the same code.
    if (
      error instanceof ApiConnectionError ||
      error instanceof CircuitOpenError ||
      error instanceof ChatRequestTimeoutError
    ) {
      const reason =
        error instanceof ChatRequestTimeoutError
          ? `The request exceeded the ${CHAT_REQUEST_TIMEOUT_MS}ms budget. The data source may be slow.`
          : "The data source is currently unreachable.";
      return sendError(
        res,
        503,
        ErrorCodes.DATA_SOURCE_UNAVAILABLE,
        `${reason} Try again in a moment, or check /api/admin/sources/health to see the current state.`,
        { retryable: true },
      );
    }
    return sendError(
      res,
      500,
      ErrorCodes.INTERNAL_ERROR,
      "Internal server error",
    );
  }
});
