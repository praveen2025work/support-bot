"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type MouseEvent as _ReactMouseEvent,
} from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { DrillDownModal } from "@/components/chat/DrillDownModal";
import { useDashboardContext } from "@/contexts/DashboardContext";
import type { Message } from "@/hooks/useChat";
import type { EventLinkConfig, DrillDownConfig } from "@/types/dashboard";
import { exportToCsv } from "@/components/chat/TablePagination";
import {
  FilterInput,
  type FilterInputConfig,
} from "@/components/shared/FilterInput";
import {
  Filter,
  X,
  RefreshCw,
  Trash2,
  FileDown,
  ExternalLink,
  ClipboardCopy,
  Check,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";

// ── Memory management constants ────────────────────────────────
const MAX_CARD_MESSAGES = 20;
const CARD_RICH_CONTENT_RETAIN = 2; // Keep full richContent on last N bot messages

/**
 * Compute a diff between previous and current query result rows.
 * Uses a row "fingerprint" (JSON of sorted key-value pairs) for matching.
 */
function computeRowDiff(
  prevRows: Record<string, unknown>[],
  currRows: Record<string, unknown>[],
  prevTimestamp: Date,
): RowDiffInfo {
  // Build fingerprint maps for matching
  const fingerprint = (row: Record<string, unknown>) =>
    JSON.stringify(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)));

  const prevFingerprints = new Map<
    string,
    { index: number; row: Record<string, unknown> }
  >();
  for (let i = 0; i < prevRows.length; i++) {
    prevFingerprints.set(fingerprint(prevRows[i]), {
      index: i,
      row: prevRows[i],
    });
  }

  const addedIndices = new Set<number>();
  const changedIndices = new Set<number>();
  const changedCells = new Map<number, Map<string, unknown>>();
  const matchedPrevFingerprints = new Set<string>();

  for (let i = 0; i < currRows.length; i++) {
    const fp = fingerprint(currRows[i]);
    if (prevFingerprints.has(fp)) {
      // Exact match — no change
      matchedPrevFingerprints.add(fp);
    } else {
      // Try to find a "similar" row by matching on the first column (key column)
      const cols = Object.keys(currRows[i]);
      const keyCol = cols[0];
      const keyVal = currRows[i][keyCol];
      const matchedPrev = prevRows.find(
        (pr) =>
          pr[keyCol] === keyVal &&
          !matchedPrevFingerprints.has(fingerprint(pr)),
      );
      if (matchedPrev) {
        matchedPrevFingerprints.add(fingerprint(matchedPrev));
        // Row exists but values changed — find which cells differ
        const cellDiffs = new Map<string, unknown>();
        for (const col of cols) {
          if (
            String(currRows[i][col] ?? "") !== String(matchedPrev[col] ?? "")
          ) {
            cellDiffs.set(col, matchedPrev[col]);
          }
        }
        if (cellDiffs.size > 0) {
          changedIndices.add(i);
          changedCells.set(i, cellDiffs);
        }
      } else {
        // Truly new row
        addedIndices.add(i);
      }
    }
  }

  // Rows in previous but not matched = removed
  const removedRows: Record<string, unknown>[] = [];
  prevFingerprints.forEach(({ row }, fp) => {
    if (!matchedPrevFingerprints.has(fp)) {
      removedRows.push(row);
    }
  });

  return {
    addedIndices,
    changedIndices,
    changedCells,
    removedRows,
    totalChanges: addedIndices.size + changedIndices.size + removedRows.length,
    previousTimestamp: prevTimestamp,
  };
}

function appendCardMessage(
  prev: CardMessage[],
  msg: CardMessage,
): CardMessage[] {
  const next = [...prev, msg];
  const trimmed =
    next.length > MAX_CARD_MESSAGES ? next.slice(-MAX_CARD_MESSAGES) : next;

  // Collapse old richContent to free memory
  let richCount = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const m = trimmed[i];
    if (m.role === "bot" && m.richContent && m.richContent.data !== null) {
      richCount++;
      if (richCount > CARD_RICH_CONTENT_RETAIN) {
        trimmed[i] = {
          ...m,
          richContent: { type: m.richContent.type, data: null },
        };
      }
    }
  }
  return trimmed;
}

/** Diff info computed by comparing previous vs current query result rows */
export interface RowDiffInfo {
  /** Row indices that are new (not in previous result) */
  addedIndices: Set<number>;
  /** Row indices that existed before but have changed cell values */
  changedIndices: Set<number>;
  /** Map of changedRowIndex → { column → previousValue } */
  changedCells: Map<number, Map<string, unknown>>;
  /** Rows that were in previous result but not in current */
  removedRows: Record<string, unknown>[];
  /** Total number of changes */
  totalChanges: number;
  /** Timestamp of the previous run */
  previousTimestamp?: Date;
}

interface CardMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  richContent?: Message["richContent"];
  executionMs?: number;
  isError?: boolean;
  timestamp: Date;
  originalQuery?: string;
  suggestions?: string[];
  followUpMode?: "local" | "requery";
  /** Diff from previous run (only on bot messages with query results) */
  diffInfo?: RowDiffInfo;
}

function fallbackConfig(filterKey: string): FilterInputConfig {
  return {
    label: filterKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    type: "text",
    placeholder: `Enter ${filterKey}...`,
  };
}

export function QueryCard({
  queryName,
  label,
  groupId,
  userName,
  defaultFilters,
  queryFilters,
  autoExecute,
  favoriteId,
  onSaveFilters,
  actions,
  cardId,
  eventLinkConfig,
  hideHeader,
  onExecutionInfo,
  onFilterChange,
  drillDownConfig,
  readOnly,
  displayMode,
  compactAuto,
  refreshIntervalSec,
  refreshTrigger,
  followUpChain,
  onSaveFollowUpChain,
  onFollowUpChainChange,
}: {
  queryName: string;
  label: string;
  groupId: string;
  userName?: string;
  defaultFilters?: Record<string, string>;
  /** Filter keys from the query config — needed to show editable filter inputs */
  queryFilters?: Array<string | { key: string; binding: string }>;
  autoExecute?: boolean;
  favoriteId?: string;
  onSaveFilters?: (
    favoriteId: string,
    filters: Record<string, string>,
  ) => Promise<void>;
  actions?: React.ReactNode;
  /** Grid dashboard card ID for event linking */
  cardId?: string;
  /** Event link configuration for cross-card filtering */
  eventLinkConfig?: EventLinkConfig;
  /** Hide internal header when rendered inside grid (grid provides its own header) */
  hideHeader?: boolean;
  /** Callback with last execution time in ms */
  onExecutionInfo?: (executionMs: number | null) => void;
  /** Callback when user changes filters — used by grid to persist */
  onFilterChange?: (filters: Record<string, string>) => void;
  /** Drill-down config from query definition */
  drillDownConfig?: DrillDownConfig[];
  /** Read-only mode — hides follow-up, filter editing, drill-down */
  readOnly?: boolean;
  /** Display mode: auto (both), table only, or chart only */
  displayMode?: "auto" | "table" | "chart";
  /** When auto mode, use compact tab toggle instead of stacking both */
  compactAuto?: boolean;
  /** Auto-refresh interval in seconds */
  refreshIntervalSec?: number;
  /** External trigger counter — re-runs when incremented (e.g. STOMP events) */
  refreshTrigger?: number;
  /** Saved follow-up commands to auto-replay after initial query */
  followUpChain?: string[];
  /** Callback to save the current follow-up chain */
  onSaveFollowUpChain?: (chain: string[]) => void;
  /** Callback when follow-up chain changes (for header pin icon) */
  onFollowUpChainChange?: (chain: string[]) => void;
}) {
  const [messages, setMessages] = useState<CardMessage[]>([]);
  const [showDiff, setShowDiff] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [editingFilters, setEditingFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>(
    defaultFilters || {},
  );
  const [filterConfigs, setFilterConfigs] = useState<
    Record<string, FilterInputConfig>
  >({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [followUpMode, setFollowUpMode] = useState<"local" | "requery">(
    "local",
  );
  const [refreshingFilter, setRefreshingFilter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedChipIndex, setCopiedChipIndex] = useState<number | null>(null);
  const [replayingChain, setReplayingChain] = useState(false);
  const chainReplayedRef = useRef(false);
  const sessionIdRef = useRef(
    `dashboard_${userName}_${queryName}_${Date.now()}`,
  );
  const retryCountRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoExecutedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const fallbackCardIdRef = useRef(`${queryName}_${favoriteId || Date.now()}`);
  const resolvedCardId = cardId || fallbackCardIdRef.current;

  // Previous query result for diff computation (ephemeral — session only)
  const previousResultRef = useRef<{
    rows: Record<string, unknown>[];
    timestamp: Date;
  } | null>(null);

  // Dashboard context for shared state
  const {
    businessDate,
    sharedFilters,
    sharedFilterGeneration,
    setSharedFilter,
    linkedSelection,
    setLinkedSelection,
    registerCardLinkConfig,
    unregisterCard,
    getApplicableFilters,
  } = useDashboardContext();

  // Derive filter keys from queryFilters or defaultFilters keys
  const filterKeys: string[] = queryFilters
    ? queryFilters.map((f) =>
        typeof f === "string" ? f : (f as { key: string }).key,
      )
    : Object.keys(defaultFilters || {});

  // Register event link config for cross-card filtering
  useEffect(() => {
    if (eventLinkConfig) {
      registerCardLinkConfig(resolvedCardId, eventLinkConfig);
      return () => unregisterCard(resolvedCardId);
    }
  }, [resolvedCardId, eventLinkConfig, registerCardLinkConfig, unregisterCard]);

  // Compute cross-card event filters
  const eventFilters = useMemo(() => {
    if (!eventLinkConfig) return {};
    return getApplicableFilters(resolvedCardId, filterKeys);
  }, [resolvedCardId, eventLinkConfig, getApplicableFilters, filterKeys]);

  // Merge current filters with shared filters, event filters, and business date
  const mergedFilters = useMemo(() => {
    const merged = { ...sharedFilters, ...eventFilters, ...currentFilters };
    if (businessDate) merged.business_date = businessDate;
    return merged;
  }, [currentFilters, sharedFilters, eventFilters, businessDate]);

  // Fetch filter configs for rendering editable inputs
  const filterKeysLen = filterKeys.length;
  useEffect(() => {
    if (filterKeysLen === 0) return;
    fetch("/api/filters")
      .then((res) => res.json())
      .then((json) => {
        const configs: Record<string, FilterInputConfig> = {};
        for (const [key, entry] of Object.entries(json.filters || {})) {
          const e = entry as Record<string, unknown>;
          const config: FilterInputConfig = {
            label: String(e.label || key),
            type: (e.type as FilterInputConfig["type"]) || "text",
            options:
              ["select", "multi_select"].includes(String(e.type)) &&
              Array.isArray(e.options)
                ? (e.options as { value: string; label: string }[])
                : undefined,
            placeholder: e.placeholder ? String(e.placeholder) : undefined,
            hasDynamicSource: !!e.source,
            dateFormat: e.dateFormat ? String(e.dateFormat) : undefined,
            presets: Array.isArray(e.presets)
              ? (e.presets as { value: string; label: string }[])
              : undefined,
            numberConfig: e.numberConfig
              ? (e.numberConfig as {
                  min?: number;
                  max?: number;
                  step?: number;
                })
              : undefined,
            debounceMs:
              typeof e.debounceMs === "number" ? e.debounceMs : undefined,
            sourceUrl: (e.source as Record<string, unknown>)?.url
              ? String((e.source as Record<string, unknown>).url)
              : undefined,
          };
          // Store under original key AND lowercase for case-insensitive lookup
          configs[key] = config;
          configs[key.toLowerCase()] = config;
        }
        setFilterConfigs(configs);
      })
      .catch(() => {});
  }, [filterKeysLen]);

  const getConfig = (filterKey: string): FilterInputConfig => {
    // Try exact match first, then case-insensitive, then fallback
    return (
      filterConfigs[filterKey] ||
      filterConfigs[filterKey.toLowerCase()] ||
      fallbackConfig(filterKey)
    );
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(
    async (
      text: string,
      filters?: Record<string, string>,
      mode?: "local" | "requery",
      chain?: string[],
    ) => {
      const userMsg: CardMessage = {
        id: `u_${Date.now()}`,
        role: "user",
        text,
        timestamp: new Date(),
      };
      setMessages((prev) => appendCardMessage(prev, userMsg));
      setIsLoading(true);

      try {
        // Cancel any previous in-flight request (prevents stale responses)
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            text,
            platform: "web",
            groupId,
            userName,
            sessionId: sessionIdRef.current,
            explicitFilters:
              filters && Object.keys(filters).length > 0 ? filters : {},
            ...(mode ? { followUpMode: mode } : {}),
            ...(chain?.length ? { followUpChain: chain } : {}),
          }),
        });

        if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
        const data = await res.json();

        // Compute diff if we have previous results and this is a query_result
        let diffInfo: RowDiffInfo | undefined;
        const currentRows =
          data.richContent?.type === "query_result" &&
          Array.isArray(data.richContent.data?.data)
            ? (data.richContent.data.data as Record<string, unknown>[])
            : data.richContent?.type === "multi_query_result" &&
                Array.isArray(data.richContent.data)
              ? ((
                  data.richContent.data as Array<{
                    result: { data: Record<string, unknown>[] };
                  }>
                )[0]?.result?.data ?? [])
              : null;

        if (
          currentRows &&
          previousResultRef.current &&
          previousResultRef.current.rows.length > 0
        ) {
          diffInfo = computeRowDiff(
            previousResultRef.current.rows,
            currentRows,
            previousResultRef.current.timestamp,
          );
        }

        // Store current result as "previous" for next run
        if (currentRows) {
          previousResultRef.current = {
            rows: currentRows,
            timestamp: new Date(),
          };
        }

        const botMsg: CardMessage = {
          id: `b_${Date.now()}`,
          role: "bot",
          text: data.text || data.response || "No response",
          richContent: data.richContent,
          executionMs: data.executionMs,
          timestamp: new Date(),
          originalQuery: text,
          suggestions: data.suggestions as string[] | undefined,
          followUpMode: data.followUpMode as "local" | "requery" | undefined,
          diffInfo,
        };
        setMessages((prev) => appendCardMessage(prev, botMsg));
        onExecutionInfo?.(data.executionMs ?? null);
      } catch (err) {
        // Silently ignore aborted requests (from component unmount or new request)
        if (err instanceof DOMException && err.name === "AbortError") {
          setIsLoading(false);
          return;
        }
        // Auto-retry once after a short delay for transient failures
        if (retryCountRef.current === 0) {
          retryCountRef.current = 1;
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
          return sendMessage(text, filters, mode);
        }
        // eslint-disable-next-line no-console -- Error logging for card query failures
        console.warn(`[QueryCard:${queryName}] ${(err as Error).message}`);
        setMessages((prev) =>
          appendCardMessage(prev, {
            id: `e_${Date.now()}`,
            role: "bot",
            text: "Something went wrong. Try again.",
            isError: true,
            timestamp: new Date(),
          }),
        );
      } finally {
        retryCountRef.current = 0;
        setIsLoading(false);
      }
    },
    [groupId, userName],
  );

  // Auto-execute on mount for subscription cards with refreshOnLoad
  // If a saved followUpChain exists, pass it so the server processes everything at once.
  useEffect(() => {
    if (autoExecute && !autoExecutedRef.current) {
      autoExecutedRef.current = true;
      setHasRun(true);
      sendMessage(`run ${queryName}`, mergedFilters, undefined, followUpChain);
    }
  }, [autoExecute, queryName, mergedFilters, sendMessage, followUpChain]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshIntervalSec || refreshIntervalSec <= 0) return;
    const timer = setInterval(() => {
      sendMessage(`run ${queryName}`, mergedFilters);
    }, refreshIntervalSec * 1000);
    return () => clearInterval(timer);
  }, [refreshIntervalSec, queryName, mergedFilters, sendMessage]);

  // External refresh trigger (e.g. STOMP WebSocket events)
  const prevRefreshTriggerRef = useRef(refreshTrigger);
  useEffect(() => {
    if (
      refreshTrigger !== undefined &&
      prevRefreshTriggerRef.current !== undefined &&
      refreshTrigger !== prevRefreshTriggerRef.current &&
      hasRun
    ) {
      sendMessage(`run ${queryName}`, mergedFilters);
    }
    prevRefreshTriggerRef.current = refreshTrigger;
  }, [refreshTrigger, hasRun, queryName, mergedFilters, sendMessage]);

  // Propagate default/current filters to shared context on mount so other cards can pick them up
  const defaultFiltersSeededRef = useRef(false);
  useEffect(() => {
    if (defaultFiltersSeededRef.current) return;
    if (!defaultFilters || Object.keys(defaultFilters).length === 0) return;
    defaultFiltersSeededRef.current = true;
    for (const [k, v] of Object.entries(defaultFilters)) {
      if (v) setSharedFilter(k, v);
    }
  }, [defaultFilters, setSharedFilter]);

  // Auto-rerun when business date changes (debounced)
  const businessDateRef = useRef(businessDate);
  useEffect(() => {
    if (businessDateRef.current === businessDate) return;
    businessDateRef.current = businessDate;
    if (!hasRun) return;
    const timer = setTimeout(() => {
      sendMessage(`run ${queryName}`, mergedFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [businessDate, hasRun, queryName, mergedFilters, sendMessage]);

  // Auto-rerun when cross-card event filters change (debounced)
  const eventFiltersRef = useRef(eventFilters);
  useEffect(() => {
    const prev = JSON.stringify(eventFiltersRef.current);
    const curr = JSON.stringify(eventFilters);
    if (prev === curr) return;
    eventFiltersRef.current = eventFilters;
    if (!hasRun || Object.keys(eventFilters).length === 0) return;
    const timer = setTimeout(() => {
      sendMessage(`run ${queryName}`, mergedFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [eventFilters, hasRun, queryName, mergedFilters, sendMessage]);

  // Auto-rerun when shared filters change (e.g. user clicks Apply on parameters).
  // Track the last-seen generation in state (not ref) so React Compiler doesn't
  // re-initialize it on every render.
  const [lastSeenGen, setLastSeenGen] = useState(sharedFilterGeneration);
  const selfBroadcastRef = useRef(false);
  if (sharedFilterGeneration !== lastSeenGen) {
    setLastSeenGen(sharedFilterGeneration);
    if (!selfBroadcastRef.current) {
      // Re-run when shared filters change — dashboard parameters should affect all cards.
      const hasAnySharedFilter = Object.keys(sharedFilters).length > 0;
      const filtersWereCleared = !hasAnySharedFilter && hasRun;
      if (hasAnySharedFilter || filtersWereCleared) {
        // Use a microtask so state updates settle before fetch
        Promise.resolve().then(() => {
          setHasRun(true);
          sendMessage(
            `run ${queryName}`,
            mergedFilters,
            undefined,
            followUpChain,
          );
        });
      }
    } else {
      selfBroadcastRef.current = false;
    }
  }

  const handleRun = () => {
    setHasRun(true);
    setEditingFilters(false);
    // Mark this card as the source so the shared-filter effect doesn't double-run it
    selfBroadcastRef.current = true;
    // Re-propagate current filters to shared context so other cards pick them up
    for (const [k, v] of Object.entries(currentFilters)) {
      if (v) setSharedFilter(k, v);
    }
    sendMessage(`run ${queryName}`, mergedFilters, undefined, followUpChain);
  };

  /** Check if user is asking about changes/differences from previous run */
  const isChangeQuery = (text: string): boolean => {
    const lower = text.toLowerCase();
    return /\b(what('?s| is| are)?\s*(changed|different|new|updated|diff))|difference|changes?\s*(from|since|between|vs)|compare|delta\b/.test(
      lower,
    );
  };

  /** Generate a local diff summary message from the last diffInfo */
  const generateDiffSummary = (): string => {
    // Find the latest bot message with diffInfo
    const lastDiff = [...messages]
      .reverse()
      .find((m) => m.role === "bot" && m.diffInfo);
    if (!lastDiff?.diffInfo) {
      if (!previousResultRef.current) {
        return "No previous run to compare against. Run the query at least twice to see differences.";
      }
      return "No changes detected — the data is identical to the previous run.";
    }
    const d = lastDiff.diffInfo;
    if (d.totalChanges === 0) {
      return "No changes detected — the data is identical to the previous run.";
    }
    const parts: string[] = [];
    if (d.addedIndices.size > 0)
      parts.push(
        `**${d.addedIndices.size}** new row${d.addedIndices.size !== 1 ? "s" : ""} added`,
      );
    if (d.changedIndices.size > 0)
      parts.push(
        `**${d.changedIndices.size}** row${d.changedIndices.size !== 1 ? "s" : ""} with updated values`,
      );
    if (d.removedRows.length > 0)
      parts.push(
        `**${d.removedRows.length}** row${d.removedRows.length !== 1 ? "s" : ""} removed`,
      );

    // Detail changed cells
    const cellDetails: string[] = [];
    d.changedCells.forEach((cols) => {
      cols.forEach((prevVal, colName) => {
        cellDetails.push(
          `• **${colName}**: was \`${String(prevVal ?? "null")}\``,
        );
      });
    });

    let summary = `**${d.totalChanges} change${d.totalChanges !== 1 ? "s" : ""}** from previous run`;
    if (d.previousTimestamp) {
      summary += ` (${d.previousTimestamp.toLocaleTimeString()})`;
    }
    summary += ":\n" + parts.join(", ") + ".";
    if (cellDetails.length > 0 && cellDetails.length <= 20) {
      summary += "\n\nChanged values:\n" + cellDetails.join("\n");
    }
    summary +=
      "\n\n_Highlighted rows are visible in the table above — toggle with the ⚡ badge._";
    return summary;
  };

  const handleFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const text = followUpText.trim();
    if (!text || isLoading) return;
    setFollowUpText("");

    // Intercept "what changed?" queries locally
    if (isChangeQuery(text)) {
      // Add user message
      setMessages((prev) =>
        appendCardMessage(prev, {
          id: `u_${Date.now()}`,
          role: "user",
          text,
          timestamp: new Date(),
        }),
      );
      // Generate local diff summary
      const summary = generateDiffSummary();
      setMessages((prev) =>
        appendCardMessage(prev, {
          id: `b_diff_${Date.now()}`,
          role: "bot",
          text: summary,
          timestamp: new Date(),
        }),
      );
      return;
    }

    sendMessage(text, undefined, followUpMode);
  };

  const handleClear = () => {
    setMessages([]);
    setHasRun(false);
    setCurrentFilters(defaultFilters || {});
    sessionIdRef.current = `dashboard_${userName}_${queryName}_${Date.now()}`;
    chainReplayedRef.current = false;
  };

  // Save current follow-up chain from chat history
  const handleSaveView = useCallback(() => {
    if (!onSaveFollowUpChain) return;
    const initialQuery = `run ${queryName}`;
    const chain = messages
      .filter((m) => m.role === "user")
      .map((m) => m.text)
      .filter((t) => t.toLowerCase() !== initialQuery.toLowerCase());
    if (chain.length > 0) {
      onSaveFollowUpChain(chain);
    }
  }, [messages, queryName, onSaveFollowUpChain]);

  const hasSavedView = (followUpChain?.length ?? 0) > 0;
  const currentChain = useMemo(() => {
    const initialQuery = `run ${queryName}`;
    return messages
      .filter((m) => m.role === "user")
      .map((m) => m.text)
      .filter((t) => t.toLowerCase() !== initialQuery.toLowerCase());
  }, [messages, queryName]);
  const hasFollowUps = currentChain.length > 0;

  // Report follow-up chain changes to parent (for header pin icon)
  // Use a ref for the callback to avoid re-render loops from inline arrow functions
  const chainChangeRef = useRef(onFollowUpChainChange);
  chainChangeRef.current = onFollowUpChainChange;
  useEffect(() => {
    chainChangeRef.current?.(currentChain);
  }, [currentChain]);

  const handleCopy = useCallback(() => {
    // Find last bot message with any table-like rich content
    const lastResult = [...messages]
      .reverse()
      .find(
        (m) =>
          m.role === "bot" &&
          m.richContent?.data &&
          (m.richContent.type === "query_result" ||
            m.richContent.type === "csv_table" ||
            m.richContent.type === "csv_aggregation" ||
            m.richContent.type === "csv_group_by"),
      );
    let text = "";
    if (lastResult?.richContent?.data) {
      const d = lastResult.richContent.data as Record<string, unknown>;
      // query_result has data[], csv_table/csv_aggregation have rows[]
      const rows = (d.data ?? d.rows) as Record<string, unknown>[] | undefined;
      const headers =
        (d.headers as string[] | undefined) ??
        (rows && rows.length > 0 ? Object.keys(rows[0]) : undefined);
      if (rows && rows.length > 0 && headers) {
        text = [
          headers.join("\t"),
          ...rows.map((r) => headers.map((h) => String(r[h] ?? "")).join("\t")),
        ].join("\n");
      }
    }
    // Fall back to last bot text
    if (!text) {
      const lastBot = [...messages].reverse().find((m) => m.role === "bot");
      text = lastBot?.text || "";
    }
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [messages]);

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...currentFilters, [key]: value };
    setCurrentFilters(updated);
    // Propagate to shared filters so other cards can pick it up
    setSharedFilter(key, value);
    // Persist filter changes to the dashboard card
    onFilterChange?.(updated);
  };

  const handleFilterRefresh = async (filterKey: string) => {
    setRefreshingFilter(filterKey);
    try {
      await fetch("/api/admin/filters/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: filterKey }),
      });
      // Re-fetch filter configs to get updated options
      const res = await fetch("/api/filters");
      const json = await res.json();
      const configs: Record<string, FilterInputConfig> = {};
      for (const [key, entry] of Object.entries(json.filters || {})) {
        const e = entry as Record<string, unknown>;
        configs[key] = {
          label: String(e.label || key),
          type: (e.type as FilterInputConfig["type"]) || "text",
          options:
            ["select", "multi_select"].includes(String(e.type)) &&
            Array.isArray(e.options)
              ? (e.options as { value: string; label: string }[])
              : undefined,
          placeholder: e.placeholder ? String(e.placeholder) : undefined,
          hasDynamicSource: !!e.source,
          sourceUrl: (e.source as Record<string, unknown>)?.url
            ? String((e.source as Record<string, unknown>).url)
            : undefined,
        };
        configs[key.toLowerCase()] = configs[key];
      }
      setFilterConfigs(configs);
    } catch {
      // silent
    } finally {
      setRefreshingFilter(null);
    }
  };

  const handleResetFilters = () => {
    setCurrentFilters(defaultFilters || {});
  };

  const handleSaveFilters = async () => {
    if (!favoriteId || !onSaveFilters) return;
    setSaving(true);
    try {
      await onSaveFilters(favoriteId, currentFilters);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  // Drill-down modal state
  const [drillDown, setDrillDown] = useState<{
    targetQuery: string;
    targetFilter: string;
    column: string;
    value: string;
  } | null>(null);

  const handleDrillDown = useCallback(
    (
      targetQuery: string,
      targetFilter: string,
      column: string,
      value: string,
    ) => {
      setDrillDown({ targetQuery, targetFilter, column, value });
    },
    [],
  );

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => setIsHovered(false), 200);
  };
  useEffect(
    () => () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    },
    [],
  );

  const activeFilterEntries = Object.entries(currentFilters).filter(
    ([, v]) => v,
  );
  const hasFilters = filterKeys.length > 0;

  const handleRerun = useCallback(
    (originalQuery: string) => {
      sendMessage(originalQuery, mergedFilters);
    },
    [sendMessage, mergedFilters],
  );

  return (
    <div
      className={
        hideHeader
          ? "bg-white overflow-hidden flex flex-col h-full w-full group"
          : "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col resize flex-shrink-0 group"
      }
      style={
        hideHeader
          ? undefined
          : {
              minHeight: 360,
              height: 480,
              minWidth: 320,
              width: 380,
              maxWidth: "100%",
            }
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header — hidden in grid view (grid provides its own) */}
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {label}
            </h3>
            <p className="text-xs text-gray-400 truncate">{queryName}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasFilters && !readOnly && (
              <button
                onClick={() => setEditingFilters((prev) => !prev)}
                className={`p-1.5 rounded-lg transition-colors ${
                  editingFilters
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                title="Edit filters"
              >
                <Filter size={16} />
              </button>
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Filter pills (compact view when not editing) */}
      {activeFilterEntries.length > 0 && !editingFilters && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-1 shrink-0">
          {activeFilterEntries.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] text-blue-700"
            >
              {key}: {value}
            </span>
          ))}
          {hideHeader && hasFilters && !readOnly && (
            <button
              onClick={() => setEditingFilters(true)}
              className="inline-flex items-center rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200"
              title="Edit filters"
            >
              ✎ Edit
            </button>
          )}
        </div>
      )}

      {/* In grid mode with no active filters, still show a filter button if filters exist */}
      {hideHeader &&
        hasFilters &&
        !readOnly &&
        activeFilterEntries.length === 0 &&
        !editingFilters && (
          <div className="px-4 py-1.5 border-b border-gray-100 shrink-0">
            <button
              onClick={() => setEditingFilters(true)}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600"
              title="Edit filters"
            >
              <Filter size={14} />
              Filters
            </button>
          </div>
        )}

      {/* Editable filter panel */}
      {editingFilters && !readOnly && (
        <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 space-y-2 shrink-0 overflow-y-auto max-h-48">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-600">
              Query Filters
            </span>
            <div className="flex items-center gap-2">
              {Object.keys(defaultFilters || {}).length > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  Reset to defaults
                </button>
              )}
              <button
                onClick={() => setEditingFilters(false)}
                className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                title="Close filters"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          {filterKeys.map((filterKey) => {
            const config = getConfig(filterKey);
            return (
              <div key={filterKey}>
                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                  {config.label}
                </label>
                <FilterInput
                  filterKey={filterKey}
                  config={config}
                  value={currentFilters[filterKey] || ""}
                  allValues={currentFilters}
                  onChange={handleFilterChange}
                  compact
                  onRefresh={() => handleFilterRefresh(filterKey)}
                  refreshing={refreshingFilter === filterKey}
                />
              </div>
            );
          })}
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleRun}
              disabled={isLoading}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {hasRun ? "Re-run with Filters" : "Run with Filters"}
            </button>
            {onSaveFilters && favoriteId && (
              <button
                onClick={handleSaveFilters}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {saveSuccess
                  ? "Saved!"
                  : saving
                    ? "Saving..."
                    : "Save Defaults"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!hasRun ? (
          <div className="px-4 py-3">
            <button
              onClick={handleRun}
              className="w-full py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Run Query
            </button>
          </div>
        ) : (
          /* Message thread */
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-scroll overflow-x-hidden px-3 py-2 space-y-1 min-h-0 scrollbar-hide select-text"
          >
            {(readOnly
              ? messages.filter(
                  (m) =>
                    !(m.role === "user" && /^run\s+\S+$/i.test(m.text.trim())),
                )
              : messages
            ).map((msg) => (
              <div key={msg.id}>
                <MessageBubble
                  message={{
                    ...msg,
                    suggestions: undefined,
                    referenceUrl: undefined,
                    retryText: undefined,
                  }}
                  cardId={cardId}
                  linkedSelection={linkedSelection}
                  onCellClick={
                    readOnly
                      ? undefined
                      : (column, value) =>
                          setLinkedSelection(
                            resolvedCardId,
                            column,
                            String(value),
                          )
                  }
                  drillDownConfig={readOnly ? undefined : drillDownConfig}
                  onDrillDown={readOnly ? undefined : handleDrillDown}
                  displayMode={displayMode}
                  compactAuto={compactAuto}
                  hideExecutionTime={hideHeader}
                  diffInfo={showDiff ? msg.diffInfo : undefined}
                />
                {/* Follow-up mode badge */}
                {msg.role === "bot" && msg.followUpMode && (
                  <div className="flex justify-start mb-0.5 ml-1">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        msg.followUpMode === "local"
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "bg-green-50 text-green-600 border border-green-200"
                      }`}
                    >
                      {msg.followUpMode === "local"
                        ? "Filtered locally"
                        : "Re-queried from source"}
                    </span>
                  </div>
                )}
                {/* Diff summary badge */}
                {msg.role === "bot" &&
                  msg.diffInfo &&
                  msg.diffInfo.totalChanges > 0 && (
                    <div className="flex justify-start mb-0.5 ml-1 items-center gap-1.5">
                      <button
                        onClick={() => setShowDiff((v) => !v)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          showDiff
                            ? "bg-amber-50 text-amber-700 border border-amber-300"
                            : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-amber-50 hover:text-amber-600"
                        }`}
                        title={
                          showDiff
                            ? "Hide changes from previous run"
                            : "Show changes from previous run"
                        }
                      >
                        {showDiff ? "⚡" : "○"} {msg.diffInfo.totalChanges}{" "}
                        change{msg.diffInfo.totalChanges !== 1 ? "s" : ""}
                      </button>
                      {msg.diffInfo.previousTimestamp && (
                        <span className="text-[9px] text-gray-400">
                          vs{" "}
                          {msg.diffInfo.previousTimestamp.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                {/* Rerun button — hidden in dashboard grid (Refresh in hover panel serves same purpose) */}
                {!hideHeader && msg.role === "bot" && msg.originalQuery && (
                  <div className="flex justify-start mb-1 -mt-1 ml-1">
                    <button
                      onClick={() => handleRerun(msg.originalQuery!)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      title="Re-run this query for latest data"
                    >
                      <RefreshCw size={12} />
                      Rerun
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div />
          </div>
        )}
      </div>

      {/* Read-only action bar — always visible with just Refresh + Export */}
      {readOnly && hasRun && (
        <div className="shrink-0 bg-white border-t border-gray-200 px-3 py-2 flex items-center gap-1.5">
          <button
            onClick={() => sendMessage(`run ${queryName}`, mergedFilters)}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => {
              const lastResult = [...messages]
                .reverse()
                .find(
                  (m) =>
                    m.role === "bot" &&
                    m.richContent?.type === "query_result" &&
                    m.richContent.data,
                );
              if (lastResult?.richContent?.data) {
                const data = lastResult.richContent.data as {
                  data?: Record<string, unknown>[];
                };
                if (data.data) exportToCsv(data.data, `${queryName}.csv`);
              }
            }}
            disabled={
              !messages.some(
                (m) =>
                  m.role === "bot" &&
                  m.richContent?.type === "query_result" &&
                  m.richContent.data,
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
            title="Export to CSV"
          >
            <FileDown size={14} />
            Export
          </button>
        </div>
      )}

      {/* Always-visible follow-up bar at bottom of card */}
      {!readOnly && hasRun && (
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 space-y-1.5">
          {/* Suggestion chips from last bot response */}
          {(() => {
            const lastBot = [...messages]
              .reverse()
              .find((m) => m.role === "bot");
            // Filter out cross-query suggestions (e.g. "Run X") — irrelevant
            // on dashboard cards where each card is a dedicated query window.
            const chips = (lastBot?.suggestions ?? []).filter(
              (s: string) => !/^run\s+/i.test(s.trim()),
            );
            if (chips.length === 0 || isLoading) return null;
            return (
              <div className="flex flex-wrap gap-1 overflow-x-auto">
                {chips.map((chip: string, i: number) => (
                  <span
                    key={i}
                    className="group/chip inline-flex items-center rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-[10px] text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors whitespace-nowrap"
                  >
                    <button
                      onClick={() => {
                        setFollowUpText("");
                        sendMessage(chip);
                      }}
                      className="pl-2 py-0.5 cursor-pointer"
                    >
                      {chip}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard
                          .writeText(chip)
                          .then(() => {
                            setCopiedChipIndex(i);
                            setTimeout(() => setCopiedChipIndex(null), 1500);
                          })
                          .catch(() => {});
                      }}
                      className="pr-1.5 pl-0.5 py-0.5 text-blue-300 dark:text-blue-500 hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copiedChipIndex === i ? (
                        <Check
                          size={10}
                          className="text-green-600 dark:text-green-400"
                        />
                      ) : (
                        <ClipboardCopy size={10} />
                      )}
                    </button>
                  </span>
                ))}
              </div>
            );
          })()}

          <form onSubmit={handleFollowUp} className="flex gap-1.5">
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder={
                followUpMode === "local"
                  ? "Ask: group by, sort, summary, diff..."
                  : "Re-query with filters..."
              }
              disabled={isLoading}
              className="flex-1 text-[11px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !followUpText.trim()}
              className="px-2.5 py-1 text-[11px] font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Hover action panel — action buttons only */}
      {!readOnly && (
        <div
          className={`shrink-0 overflow-hidden transition-all duration-200 ease-in-out ${
            isHovered ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2 space-y-2">
            {/* Action buttons row */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => sendMessage(`run ${queryName}`, mergedFilters)}
                disabled={isLoading || !hasRun}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                onClick={handleClear}
                disabled={!hasRun}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
                title="Clear & Reset"
              >
                <Trash2 size={14} />
                Clear
              </button>
              <button
                onClick={handleCopy}
                disabled={!hasRun}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => {
                  // Find last bot message with query_result data
                  const lastResult = [...messages]
                    .reverse()
                    .find(
                      (m) =>
                        m.role === "bot" &&
                        m.richContent?.type === "query_result" &&
                        m.richContent.data,
                    );
                  if (lastResult?.richContent?.data) {
                    const data = lastResult.richContent.data as {
                      data?: Record<string, unknown>[];
                    };
                    if (data.data) exportToCsv(data.data, `${queryName}.csv`);
                  }
                }}
                disabled={
                  !hasRun ||
                  !messages.some(
                    (m) =>
                      m.role === "bot" &&
                      m.richContent?.type === "query_result" &&
                      m.richContent.data,
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
                title="Export to CSV"
              >
                <FileDown size={14} />
                Export
              </button>
              {/* Mode toggle — inline with action buttons */}
              {hasRun && (
                <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFollowUpMode("local")}
                    className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                      followUpMode === "local"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                    title="Operate on cached data (sort, group, summarize)"
                  >
                    Local
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpMode("requery")}
                    className={`px-2 py-1 text-[10px] font-medium border-l border-gray-300 transition-colors ${
                      followUpMode === "requery"
                        ? "bg-green-600 text-white"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                    title="Re-execute the query against the data source with new filters"
                  >
                    Re-query
                  </button>
                </div>
              )}
              <a
                href={`/?group=${encodeURIComponent(groupId)}&query=${encodeURIComponent(queryName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors ml-auto"
                title="Open in Chat (new tab)"
              >
                <ExternalLink size={14} />
                Open in Chat
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down modal */}
      {!readOnly && drillDown && (
        <DrillDownModal
          open
          sourceColumn={drillDown.column}
          sourceValue={drillDown.value}
          targetQuery={drillDown.targetQuery}
          targetFilter={drillDown.targetFilter}
          groupId={groupId}
          onClose={() => setDrillDown(null)}
          onOpenInChat={(query, filters) => {
            setDrillDown(null);
            sendMessage(`run ${query}`, filters);
          }}
        />
      )}
    </div>
  );
}
