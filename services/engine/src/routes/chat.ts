import { Router, Request, Response } from "express";
import { getEngine } from "@/lib/singleton";
import { createAdapter } from "@/adapters/adapter-factory";
import { getTenantContext, getTenantLogger } from "@/middleware/tenant-context";
import { encryptLogEntry } from "@/lib/log-encryption";
import { AsyncLogWriter } from "@/lib/async-log-writer";
import { preferencesStore } from "@/data/user-preferences";
import { getInteractionTracker } from "@/core/recommendations/interaction-tracker";
import { paths } from "@/lib/env-config";
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
      return res.status(400).json({ error: "Invalid message format" });
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

    // Forward auth-related headers for Windows Auth / BAM pass-through
    const incomingHeaders: Record<string, string> = {};
    if (req.headers["authorization"]) {
      incomingHeaders["authorization"] = req.headers["authorization"] as string;
    }
    if (req.headers["cookie"]) {
      incomingHeaders["cookie"] = req.headers["cookie"] as string;
    }

    // Follow-up chain: process initial query + all follow-ups server-side,
    // returning only the final result (avoids sequential round-trips)
    const followUpChain = body.followUpChain as string[] | undefined;
    const hdrs =
      Object.keys(incomingHeaders).length > 0 ? incomingHeaders : undefined;

    let response;
    if (followUpChain?.length) {
      log.info(
        { chain: followUpChain, initialText: message.text },
        "Processing followUpChain",
      );
      // Process initial message (query execution) — no followUpMode restriction
      response = await engine.processMessage(
        message,
        explicitFilters,
        hdrs,
        undefined,
      );
      log.info(
        {
          initialIntent: response.intent,
          initialText: response.text?.substring(0, 80),
          sessionId: message.sessionId,
        },
        "Chain: initial query result",
      );
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
          response = await engine.processMessage(
            followUpMsg,
            undefined,
            hdrs,
            "local",
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
      response = await engine.processMessage(
        message,
        explicitFilters,
        hdrs,
        followUpMode,
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
    return res.status(500).json({ error: "Internal server error" });
  }
});
