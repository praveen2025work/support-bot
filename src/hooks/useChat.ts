"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { generateId } from "@/lib/generate-id";

export interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  richContent?: {
    type:
      | "url_list"
      | "query_result"
      | "multi_query_result"
      | "estimation"
      | "error"
      | "query_filter_form"
      | "file_content"
      | "document_search"
      | "csv_table"
      | "csv_aggregation"
      | "csv_group_by"
      | "csv_summary"
      | "document_summary"
      | "knowledge_search"
      | "query_list"
      | "document_answer"
      | "document_upload_result"
      | "recommendations"
      | "column_profile"
      | "smart_summary"
      | "correlation_heatmap"
      | "distribution_histogram"
      | "anomaly_table"
      | "trend_analysis"
      | "duplicate_rows"
      | "missing_heatmap"
      | "clustering_result"
      | "decision_tree_result"
      | "forecast_result"
      | "pca_result"
      | "insight_report";
    data: unknown;
  };
  suggestions?: string[];
  recommendations?: Array<{ type: string; name: string; reason: string }>;
  executionMs?: number;
  referenceUrl?: string;
  anomalies?: Array<{
    queryName: string;
    columnName: string;
    currentValue: number;
    expectedMean: number;
    zScore: number;
    severity: "info" | "warning" | "critical";
    direction: "spike" | "drop";
    message: string;
  }>;
  isError?: boolean;
  retryText?: string;
  timestamp: Date;
  /** Classification confidence (0–1) from the engine */
  confidence?: number;
  /** Name of the data source that answered (e.g. "sales-data.csv") */
  sourceName?: string;
  /** Type of data source */
  sourceType?: string;
  /** Original query text for this message (for feedback correlation) */
  originalQuery?: string;
  /** Truncation metadata — populated when results are capped for display */
  totalRowsBeforeTruncation?: number;
  displayedRows?: number;
  totalColumns?: number;
  estimatedSizeKB?: number;
  truncated?: boolean;
  /**
   * "Did you mean?" disambiguation payload. Present when the engine's NLP
   * confidence landed in the disambig band [0.4, 0.6); the UI renders
   * `candidates` as chips below the headline. Clicking a chip invokes
   * `sendForceIntent(queryName)`, which bypasses NLP server-side.
   */
  disambiguation?: DisambiguationPayload;
  /** Optional name of the executed query — used by retry + sharing UIs. */
  queryName?: string;
  /** Classified intent label — used by analytics + suggestion routing. */
  intent?: string;
}

/** Per-candidate metadata returned alongside the headline. */
export interface DisambiguationCandidate {
  intent: string;
  /** Underlying query name to forceIntent on click (when applicable). */
  queryName?: string;
  /** Combined ensemble score (0..1). */
  score: number;
  /** Human-friendly label for the chip's primary text. */
  label?: string;
  /** Short description for chip secondary text. */
  description?: string;
}

export interface DisambiguationPayload {
  /** Locked microcopy from the design doc; rendered above the chips. */
  headline: string;
  /** Top-3 candidates from the NLP ensemble. */
  candidates: DisambiguationCandidate[];
}

interface QueryMeta {
  name: string;
  description?: string;
  filters: Array<string | { key: string; binding: string }>;
  type?: "api" | "url" | "document" | "csv";
}

/** Regex that matches "run <queryName>" with optional trailing whitespace */
const RUN_QUERY_PATTERN = /^run\s+(\S+)\s*$/i;

/**
 * Build the visible error text shown in a failed-message bubble.
 * When the engine returns a structured envelope, surface the
 * machine-readable code + requestId so users can copy the reference
 * to a support ticket. The envelope.error message is preferred over
 * generic "something went wrong" since it's often more specific
 * (e.g. "The request exceeded the 30000ms budget").
 */
function buildErrorMessageText(envelope?: {
  error?: string;
  code?: string;
  requestId?: string;
  retryable?: boolean;
}): string {
  if (!envelope) return "Sorry, something went wrong. Please try again.";
  const base = envelope.error || "Sorry, something went wrong.";
  const refSuffix = envelope.requestId
    ? `\n\n_Reference: ${envelope.requestId}_`
    : "";
  const codeHint = envelope.code ? ` (${envelope.code})` : "";
  return `${base}${codeHint}${refSuffix}`;
}

// ── Memory management constants ────────────────────────────────
// Prevent unbounded message accumulation in chat sessions.
const MAX_MESSAGES = 100;
const RICH_CONTENT_RETAIN_COUNT = 10; // Keep full richContent on the last N bot messages

/**
 * Append a message to the list with memory management.
 * - Caps total messages at MAX_MESSAGES (drops oldest)
 * - Collapses richContent.data to null on older bot messages to free memory
 */
function appendMessage(prev: Message[], msg: Message): Message[] {
  const next = [...prev, msg];
  const trimmed = next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;

  // Count bot messages with richContent from the end and collapse old ones
  let richCount = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const m = trimmed[i];
    if (m.role === "bot" && m.richContent && m.richContent.data !== null) {
      richCount++;
      if (richCount > RICH_CONTENT_RETAIN_COUNT) {
        trimmed[i] = {
          ...m,
          richContent: { type: m.richContent.type, data: null },
        };
      }
    }
  }
  return trimmed;
}

/**
 * Constructs a bot Message from the raw API response data.
 * Centralises the field mapping so sendMessage and executeQuery
 * don't duplicate 20 lines of `as` casts.
 */
function buildBotMessage(
  data: Record<string, unknown>,
  originalQuery: string,
): Message {
  return {
    id: generateId(),
    role: "bot",
    text: data.text as string,
    richContent: data.richContent as Message["richContent"],
    suggestions: data.suggestions as string[],
    recommendations: data.recommendations as Message["recommendations"],
    executionMs: data.executionMs as number | undefined,
    referenceUrl: data.referenceUrl as string | undefined,
    anomalies: data.anomalies as Message["anomalies"],
    confidence: data.confidence as number | undefined,
    sourceName: data.sourceName as string | undefined,
    sourceType: data.sourceType as string | undefined,
    originalQuery,
    totalRowsBeforeTruncation: data.totalRowsBeforeTruncation as
      | number
      | undefined,
    displayedRows: data.displayedRows as number | undefined,
    totalColumns: data.totalColumns as number | undefined,
    estimatedSizeKB: data.estimatedSizeKB as number | undefined,
    truncated: data.truncated as boolean | undefined,
    disambiguation: data.disambiguation as DisambiguationPayload | undefined,
    timestamp: new Date(),
  };
}

export function useChat(
  platform: "web" | "widget" = "web",
  groupId?: string,
  userName?: string,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const sessionIdRef = useRef<string>("");
  const statusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const queriesCacheRef = useRef<{
    groupId: string;
    queries: QueryMeta[];
  } | null>(null);
  const bypassFilterFormRef = useRef(false);
  const lastBotConfidenceRef = useRef<number>(1);
  const lastUserTextRef = useRef<string>("");

  useEffect(() => {
    sessionIdRef.current = `${platform}-${generateId()}`;
  }, [platform]);

  // Clean up session on browser close / tab close
  useEffect(() => {
    const handleUnload = () => {
      if (!sessionIdRef.current) return;
      const payload = JSON.stringify({
        sessionId: sessionIdRef.current,
        userId: userName,
        groupId: groupId || "default",
      });
      navigator.sendBeacon(
        "/api/session/close",
        new Blob([payload], { type: "application/json" }),
      );
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [userName, groupId]);

  const clearStatusTimers = useCallback(() => {
    statusTimersRef.current.forEach(clearTimeout);
    statusTimersRef.current = [];
  }, []);

  const fetchQueries = useCallback(async (): Promise<QueryMeta[]> => {
    const gid = groupId || "default";
    if (queriesCacheRef.current?.groupId === gid) {
      return queriesCacheRef.current.queries;
    }
    try {
      const res = await fetch(
        `/api/queries?groupId=${encodeURIComponent(gid)}`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      const queries = data.queries as QueryMeta[];
      queriesCacheRef.current = { groupId: gid, queries };
      return queries;
    } catch {
      return [];
    }
  }, [groupId]);

  const callChatApi = useCallback(
    async (
      text: string,
      explicitFilters?: Record<string, string>,
      feedbackType?: string,
      forceIntent?: string,
    ): Promise<{
      data?: Record<string, unknown>;
      error?: boolean;
      errorEnvelope?: {
        error?: string;
        code?: string;
        requestId?: string;
        retryable?: boolean;
      };
    }> => {
      const payload: Record<string, unknown> = {
        text,
        sessionId: sessionIdRef.current,
        platform,
        groupId,
        userName,
      };
      if (explicitFilters) {
        payload.explicitFilters = explicitFilters;
      }
      if (feedbackType) {
        payload.feedbackType = feedbackType;
        if (feedbackType === "rephrase" && lastUserTextRef.current) {
          payload.previousMessageText = lastUserTextRef.current;
        }
        // disambig_click: the previous user utterance was the ambiguous
        // text the bot showed chips for. Forward it so the learning
        // service records (originalText → chosenIntent) as a positive
        // corpus signal — that's the whole point of the feedback loop.
        if (feedbackType === "disambig_click" && lastUserTextRef.current) {
          payload.previousMessageText = lastUserTextRef.current;
        }
      }
      // forceIntent: chip click from a "Did you mean?" disambiguation. The
      // engine validates this against the user's group catalog and bypasses
      // NLP if accepted; foreign intents return 400.
      if (forceIntent) {
        payload.forceIntent = forceIntent;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Engine returns a structured envelope on 4xx/5xx —
        // { error, code, requestId, retryable }. Surface the
        // requestId + code to the caller so the error toast can
        // show "Reference: abc12345" for support escalation.
        let envelope:
          | {
              error?: string;
              code?: string;
              requestId?: string;
              retryable?: boolean;
            }
          | undefined;
        try {
          envelope = await res.json();
        } catch {
          /* non-JSON body */
        }
        return {
          error: true,
          errorEnvelope: envelope,
        };
      }
      const data = await res.json();
      return { data };
    },
    [platform, groupId, userName],
  );

  const sendMessage = useCallback(
    async (text: string, source?: "suggestion_click" | "typed") => {
      if (!text.trim() || isLoading) return;

      // Determine feedback type
      let feedbackType: string =
        source === "suggestion_click" ? "suggestion_click" : "normal";
      if (
        source !== "suggestion_click" &&
        lastBotConfidenceRef.current < 0.8 &&
        lastUserTextRef.current
      ) {
        feedbackType = "rephrase";
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        text: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => appendMessage(prev, userMessage));

      // Check for filter form interception
      if (!bypassFilterFormRef.current) {
        const match = text.trim().match(RUN_QUERY_PATTERN);
        if (match) {
          const queryName = match[1];
          try {
            const queries = await fetchQueries();
            const query = queries.find(
              (q) => q.name.toLowerCase() === queryName.toLowerCase(),
            );
            if (query && query.filters.length > 0) {
              const formMessage: Message = {
                id: generateId(),
                role: "bot",
                text: `Configure filters for "${query.name}"${query.description ? " — " + query.description : ""}`,
                richContent: {
                  type: "query_filter_form",
                  data: {
                    queryName: query.name,
                    description: query.description,
                    filters: query.filters,
                  },
                },
                timestamp: new Date(),
              };
              setMessages((prev) => appendMessage(prev, formMessage));
              return;
            }
          } catch {
            // Fall through to normal flow
          }
        }
      }
      bypassFilterFormRef.current = false;

      setIsLoading(true);
      setLoadingStatus("Analyzing your request...");

      clearStatusTimers();
      statusTimersRef.current.push(
        setTimeout(() => setLoadingStatus("Processing..."), 1000),
        setTimeout(() => setLoadingStatus("Running query..."), 2500),
        setTimeout(() => setLoadingStatus("Fetching results..."), 5000),
        setTimeout(() => setLoadingStatus("Almost there..."), 10000),
      );

      try {
        let result = await callChatApi(text.trim(), undefined, feedbackType);

        // Auto-retry once on failure
        if (result.error) {
          setLoadingStatus("Retrying...");
          await new Promise((r) => setTimeout(r, 1000));
          result = await callChatApi(text.trim(), undefined, "retry");
        }

        if (result.error || !result.data) {
          const errorMessage: Message = {
            id: generateId(),
            role: "bot",
            text: buildErrorMessageText(result.errorEnvelope),
            isError: true,
            retryText: text.trim(),
            timestamp: new Date(),
          };
          setMessages((prev) => appendMessage(prev, errorMessage));
        } else {
          const data = result.data;
          const botMessage = buildBotMessage(data, text.trim());
          setMessages((prev) => appendMessage(prev, botMessage));
          // Track for feedback signal detection
          lastBotConfidenceRef.current = (data.confidence as number) ?? 1;
          lastUserTextRef.current = text.trim();
        }
      } catch {
        const errorMessage: Message = {
          id: generateId(),
          role: "bot",
          text: buildErrorMessageText(),
          isError: true,
          retryText: text.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => appendMessage(prev, errorMessage));
      } finally {
        clearStatusTimers();
        setIsLoading(false);
        setLoadingStatus("");
      }
    },
    [
      isLoading,
      platform,
      groupId,
      clearStatusTimers,
      fetchQueries,
      callChatApi,
    ],
  );

  const executeQuery = useCallback(
    async (queryName: string, filters: Record<string, string>) => {
      const parts: string[] = [];
      if (filters.date_range) parts.push(`for ${filters.date_range}`);
      if (filters.region) parts.push(`in ${filters.region}`);
      if (filters.environment) parts.push(`in ${filters.environment}`);
      if (filters.team) parts.push(`team ${filters.team}`);
      if (filters.severity) parts.push(`severity ${filters.severity}`);
      for (const [k, v] of Object.entries(filters)) {
        if (
          !["date_range", "region", "environment", "team", "severity"].includes(
            k,
          ) &&
          v
        ) {
          parts.push(`${k} ${v}`);
        }
      }

      const text =
        parts.length > 0
          ? `run ${queryName} ${parts.join(" ")}`
          : `run ${queryName}`;

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        text: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => appendMessage(prev, userMessage));

      setIsLoading(true);
      setLoadingStatus("Running query...");
      clearStatusTimers();

      try {
        let result = await callChatApi(text.trim(), filters);

        // Auto-retry once on failure
        if (result.error) {
          setLoadingStatus("Retrying...");
          await new Promise((r) => setTimeout(r, 1000));
          result = await callChatApi(text.trim(), filters);
        }

        if (result.error || !result.data) {
          const errorMessage: Message = {
            id: generateId(),
            role: "bot",
            text: buildErrorMessageText(result.errorEnvelope),
            isError: true,
            retryText: text.trim(),
            timestamp: new Date(),
          };
          setMessages((prev) => appendMessage(prev, errorMessage));
        } else {
          const botMessage = buildBotMessage(result.data, text.trim());
          setMessages((prev) => appendMessage(prev, botMessage));
        }
      } catch {
        const errorMessage: Message = {
          id: generateId(),
          role: "bot",
          text: buildErrorMessageText(),
          isError: true,
          retryText: text.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => appendMessage(prev, errorMessage));
      } finally {
        clearStatusTimers();
        setIsLoading(false);
        setLoadingStatus("");
      }
    },
    [isLoading, platform, groupId, clearStatusTimers, callChatApi],
  );

  const retryMessage = useCallback(
    async (retryText: string) => {
      bypassFilterFormRef.current = true;
      await sendMessage(retryText);
    },
    [sendMessage],
  );

  /**
   * Click handler for "Did you mean?" chips. The chip carries the candidate's
   * underlying queryName; we POST it to /api/chat as `forceIntent` so the
   * engine bypasses NLP and runs the chosen query directly.
   *
   * The visible user message uses the candidate's display label so the chat
   * transcript reads as if the user typed the chosen query — matching the
   * design's "forceIntent is invisible to the user" requirement.
   */
  const sendForceIntent = useCallback(
    async (candidate: DisambiguationCandidate) => {
      if (isLoading) return;
      const queryName = candidate.queryName;
      if (!queryName) {
        // Non-query intents (no queryName) — fall back to clicking the label
        // as a normal suggestion. This keeps the click affordance even for
        // intent chips that don't have a forceIntent target.
        const label = candidate.label ?? candidate.intent;
        await sendMessage(label, "suggestion_click");
        return;
      }

      const displayLabel = candidate.label ?? queryName;
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        text: displayLabel,
        timestamp: new Date(),
      };
      setMessages((prev) => appendMessage(prev, userMessage));

      setIsLoading(true);
      setLoadingStatus("Running query...");
      clearStatusTimers();

      try {
        // disambig_click: this chip came from a "Did you mean?" surface,
        // so the learning loop should record (lastUserText → queryName)
        // as a positive corpus signal (handled by callChatApi based on
        // feedbackType + previousMessageText).
        let result = await callChatApi(
          displayLabel,
          undefined,
          "disambig_click",
          queryName,
        );

        // Auto-retry once on failure (transient network).
        if (result.error) {
          setLoadingStatus("Retrying...");
          await new Promise((r) => setTimeout(r, 1000));
          result = await callChatApi(
            displayLabel,
            undefined,
            "retry",
            queryName,
          );
        }

        if (result.error || !result.data) {
          const errorMessage: Message = {
            id: generateId(),
            role: "bot",
            text: "Couldn't run that — try again.",
            isError: true,
            retryText: displayLabel,
            timestamp: new Date(),
          };
          setMessages((prev) => appendMessage(prev, errorMessage));
        } else {
          const botMessage = buildBotMessage(result.data, displayLabel);
          setMessages((prev) => appendMessage(prev, botMessage));
          lastBotConfidenceRef.current =
            (result.data.confidence as number) ?? 1;
          lastUserTextRef.current = displayLabel;
        }
      } catch {
        const errorMessage: Message = {
          id: generateId(),
          role: "bot",
          text: "Couldn't run that — try again.",
          isError: true,
          retryText: displayLabel,
          timestamp: new Date(),
        };
        setMessages((prev) => appendMessage(prev, errorMessage));
      } finally {
        clearStatusTimers();
        setIsLoading(false);
        setLoadingStatus("");
      }
    },
    [isLoading, callChatApi, clearStatusTimers, sendMessage],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = `${platform}-${generateId()}`;
  }, [platform]);

  /**
   * Snapshot a bot message to a shareable URL.
   *
   * POSTs the message text + rich content to /api/views/snapshot, which
   * persists the snapshot on the engine and returns a short id. Caller
   * gets back the absolute share URL ready to copy/paste. Resolves to
   * null on failure (caller renders an error toast).
   */
  const shareMessage = useCallback(
    async (messageId: string): Promise<string | null> => {
      const message = messages.find(
        (m) => m.id === messageId && m.role === "bot",
      );
      if (!message) return null;

      try {
        const res = await fetch("/api/views/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            groupId: groupId || "default",
            userId: userName,
            queryName: message.queryName,
            // For v1 we don't ship the full followUpChain (it lives in
            // engine session context, not in the message). The
            // snapshot still carries enough — text + rich content —
            // to reproduce the on-screen rendering exactly.
            message: {
              text: message.text,
              richContent: message.richContent,
              intent: message.intent,
              confidence: message.confidence,
            },
          }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { id?: string; url?: string };
        if (!data.id) return null;
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        return `${origin}/share/${data.id}`;
      } catch {
        return null;
      }
    },
    [messages, groupId, userName],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      // Show user message indicating upload
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        text: `📎 Uploading: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        timestamp: new Date(),
      };
      setMessages((prev) => appendMessage(prev, userMessage));
      setIsLoading(true);
      setLoadingStatus("Uploading file...");

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (groupId) formData.append("groupId", groupId);
        formData.append("sessionId", sessionIdRef.current);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Upload failed: ${res.status}`);
        }

        const data = await res.json();
        const botMessage: Message = {
          id: generateId(),
          role: "bot",
          text: data.text || `File "${file.name}" processed successfully.`,
          richContent: data.richContent,
          suggestions: data.suggestions || [
            "Summarize",
            "Show columns",
            "List queries",
          ],
          sourceName: file.name,
          sourceType: file.name.endsWith(".pdf")
            ? "document"
            : file.name.endsWith(".docx") || file.name.endsWith(".doc")
              ? "document"
              : "csv",
          timestamp: new Date(),
        };
        setMessages((prev) => appendMessage(prev, botMessage));
      } catch {
        const errorMessage: Message = {
          id: generateId(),
          role: "bot",
          text: `Sorry, I couldn't process "${file.name}". Please check the file format and try again.`,
          isError: true,
          timestamp: new Date(),
        };
        setMessages((prev) => appendMessage(prev, errorMessage));
      } finally {
        setIsLoading(false);
        setLoadingStatus("");
      }
    },
    [groupId],
  );

  const submitFeedback = useCallback(
    async (
      messageId: string,
      type: "positive" | "negative",
      correction?: string,
    ) => {
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            messageId,
            feedbackType: type,
            correctionText: correction,
            groupId,
          }),
        });
      } catch {
        // Silent fail — feedback is non-critical
      }
    },
    [groupId],
  );

  return {
    messages,
    isLoading,
    loadingStatus,
    sendMessage,
    sendForceIntent,
    executeQuery,
    retryMessage,
    clearMessages,
    submitFeedback,
    uploadFile,
    shareMessage,
  };
}
