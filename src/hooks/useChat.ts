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
}

interface QueryMeta {
  name: string;
  description?: string;
  filters: Array<string | { key: string; binding: string }>;
  type?: "api" | "url" | "document" | "csv";
}

/** Regex that matches "run <queryName>" with optional trailing whitespace */
const RUN_QUERY_PATTERN = /^run\s+(\S+)\s*$/i;

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
    ): Promise<{ data?: Record<string, unknown>; error?: boolean }> => {
      const payload: Record<string, unknown> = {
        text,
        sessionId: sessionIdRef.current,
        platform,
        groupId,
        userName,
      };
      if (explicitFilters && Object.keys(explicitFilters).length > 0) {
        payload.explicitFilters = explicitFilters;
      }
      if (feedbackType) {
        payload.feedbackType = feedbackType;
        if (feedbackType === "rephrase" && lastUserTextRef.current) {
          payload.previousMessageText = lastUserTextRef.current;
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) return { error: true };
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
            text: "Sorry, something went wrong. Please try again.",
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
          text: "Sorry, something went wrong. Please try again.",
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
        let result = await callChatApi(
          text.trim(),
          Object.keys(filters).length > 0 ? filters : undefined,
        );

        // Auto-retry once on failure
        if (result.error) {
          setLoadingStatus("Retrying...");
          await new Promise((r) => setTimeout(r, 1000));
          result = await callChatApi(
            text.trim(),
            Object.keys(filters).length > 0 ? filters : undefined,
          );
        }

        if (result.error || !result.data) {
          const errorMessage: Message = {
            id: generateId(),
            role: "bot",
            text: "Sorry, something went wrong. Please try again.",
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
          text: "Sorry, something went wrong. Please try again.",
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

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = `${platform}-${generateId()}`;
  }, [platform]);

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
    executeQuery,
    retryMessage,
    clearMessages,
    submitFeedback,
    uploadFile,
  };
}
