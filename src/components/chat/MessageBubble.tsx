"use client";

import { useState, useCallback } from "react";
import type { DisambiguationCandidate, Message } from "@/hooks/useChat";
import type { DrillDownConfig } from "@/types/dashboard";
import {
  AlertTriangle,
  Info,
  RefreshCw,
  ClipboardCopy,
  Check,
  HelpCircle,
  Share2,
} from "lucide-react";
import { AnomalyAlert } from "@/components/dashboard/AnomalyBadge";
import { FeedbackBar } from "./FeedbackBar";
import { SourceBadge } from "./SourceBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { RichContentRenderer } from "./RichContentRenderer";
import { DisambiguationChips } from "./SuggestionChips";
import type { LinkedSelection, DiffInfo } from "./richContentTypes";

/**
 * Renders assistant text with three inline affordances:
 *   1. **bold** markers   → <strong> with brand emphasis
 *   2. "quoted text"      → clickable chip that fires onAction
 *   3. [[ref:N]] markers  → small "REF: N" citation pill (Stitch design)
 *
 * Bold-followed-by-citation is the Stitch DocQA pattern, e.g.
 *   "saw a **42% YoY growth** [[ref:1]]" → bold + REF: 01 pill.
 */
function renderMarkdownText(text: string, onAction?: (text: string) => void) {
  const parts = text.split(/(\*\*[^*]+\*\*|"[^"]{3,}"|\[\[ref:\d+\]\])/gi);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={i} className="font-semibold text-[var(--text-primary)]">
          {boldMatch[1]}
        </strong>
      );
    }
    const refMatch = part.match(/^\[\[ref:(\d+)\]\]$/i);
    if (refMatch) {
      const n = String(refMatch[1]).padStart(2, "0");
      return (
        <sup
          key={i}
          className="inline-flex items-center mx-0.5 align-baseline text-[9px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-[var(--brand-subtle)] text-[var(--brand)]"
          title={`Reference ${n}`}
        >
          REF: {n}
        </sup>
      );
    }
    const quoteMatch = part.match(/^"(.{3,})"$/);
    if (quoteMatch && onAction) {
      return (
        <button
          key={i}
          onClick={() => onAction(quoteMatch[1])}
          className="inline-flex items-center mx-0.5 rounded-md border border-[var(--brand)] bg-[var(--brand-subtle)] px-1.5 py-0.5 text-xs text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors cursor-pointer align-baseline"
        >
          {quoteMatch[1]}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MessageBubble({
  message,
  onAction,
  onExecuteQuery,
  onRetry,
  onFeedback,
  cardId,
  linkedSelection,
  onCellClick,
  drillDownConfig,
  onDrillDown,
  displayMode,
  compactAuto,
  compactRichContent,
  savedChartType,
  onChartTypeChange,
  hideExecutionTime,
  dashboardMode,
  onShowInPanel,
  onDisambiguationSelect,
  onShareMessage,
  diffInfo,
}: {
  message: Message;
  onAction?: (text: string) => void;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onRetry?: (text: string) => void;
  onFeedback?: (
    messageId: string,
    type: "positive" | "negative",
    correction?: string,
  ) => void;
  /**
   * Click handler for "Did you mean?" disambiguation chips. Receives the
   * selected candidate; the parent calls `useChat.sendForceIntent` which
   * POSTs the queryName as `forceIntent` (engine bypasses NLP).
   */
  onDisambiguationSelect?: (candidate: DisambiguationCandidate) => void;
  /** Share-this-message handler. Resolves to the share URL (null on failure).
   *  Owner: useChat.shareMessage; called from the per-message Share button. */
  onShareMessage?: (messageId: string) => Promise<string | null>;
  cardId?: string;
  linkedSelection?: LinkedSelection;
  onCellClick?: (column: string, value: unknown) => void;
  /** Config-based drill-down definitions from query config */
  drillDownConfig?: DrillDownConfig[];
  /** When true, render a one-line summary instead of full tables/charts */
  compactRichContent?: boolean;
  /** Callback when user triggers a drill-down (config-based or picker) */
  onDrillDown?: (
    targetQuery: string,
    targetFilter: string,
    column: string,
    value: string,
  ) => void;
  /** Display mode: auto (both), table only, or chart only */
  displayMode?: "auto" | "table" | "chart";
  /** When auto mode, use compact tab toggle instead of stacking both */
  compactAuto?: boolean;
  /** Persisted chart type override from saved view */
  savedChartType?: string;
  /** Callback when user changes chart type (for persistence) */
  onChartTypeChange?: (type: string) => void;
  /** Hide "Completed in Xms" badge (used in dashboard grid where header shows it) */
  hideExecutionTime?: boolean;
  /** Dashboard mode — suppress conversational text, copy button, badges, and feedback bar; show only rich content */
  dashboardMode?: boolean;
  /** Show rich content result in the right-hand DataPanel */
  onShowInPanel?: (
    data: Record<string, unknown>[],
    columns: string[],
    title: string,
  ) => void;
  /** Diff info from previous query run — highlights changes in table */
  diffInfo?: DiffInfo;
}) {
  const isUser = message.role === "user";
  const [msgCopied, setMsgCopied] = useState(false);
  const [shareState, setShareState] = useState<
    "idle" | "sharing" | "copied" | "error"
  >("idle");

  const hasRichContent = !isUser && message.richContent;

  const handleShare = useCallback(async () => {
    if (!onShareMessage) return;
    setShareState("sharing");
    try {
      const url = await onShareMessage(message.id);
      if (!url) {
        setShareState("error");
        setTimeout(() => setShareState("idle"), 2000);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 2000);
    }
  }, [onShareMessage, message.id]);

  const handleMessageCopy = useCallback(() => {
    let text = "";
    // Try to extract table data first
    if (message.richContent?.data) {
      const d = message.richContent.data as Record<string, unknown>;
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
    if (!text) text = message.text || "";
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setMsgCopied(true);
        setTimeout(() => setMsgCopied(false), 2000);
      })
      .catch(() => {});
  }, [message]);

  return (
    <div
      className={`group/msg flex ${isUser ? "justify-end" : "justify-start"} ${dashboardMode ? "mb-0" : "mb-3"}`}
    >
      <div
        className={`relative ${
          dashboardMode
            ? "w-full"
            : `${
                isUser
                  ? "max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-[var(--brand)] text-white text-[13px]"
                  : hasRichContent
                    ? "max-w-[98%] w-full"
                    : "max-w-[88%]"
              } ${
                !isUser && message.isError
                  ? "rounded-[var(--radius-lg)] rounded-tl-sm border border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--text-primary)] px-4 py-3 border-l-[3px]"
                  : !isUser
                    ? "rounded-[var(--radius-lg)] rounded-tl-sm border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] px-4 py-3 border-l-[3px] border-l-[var(--brand)] shadow-[var(--shadow-xs)]"
                    : ""
              }`
        }`}
      >
        {/* Copy + Share buttons — visible on hover (hidden in dashboard mode).
            Share only renders when there's a rich content payload worth
            snapshotting AND the parent supplied the handler. */}
        {!isUser && !dashboardMode && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10">
            {hasRichContent && onShareMessage && (
              <button
                onClick={handleShare}
                disabled={shareState === "sharing"}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] shadow-sm disabled:opacity-50"
                title="Snapshot this result and copy a shareable link"
              >
                {shareState === "copied" ? (
                  <Check size={12} className="text-[var(--success)]" />
                ) : (
                  <Share2 size={12} />
                )}
                {shareState === "copied"
                  ? "Link copied!"
                  : shareState === "sharing"
                    ? "Sharing…"
                    : shareState === "error"
                      ? "Failed"
                      : "Share"}
              </button>
            )}
            <button
              onClick={handleMessageCopy}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] shadow-sm"
              title="Copy to clipboard"
            >
              {msgCopied ? (
                <Check size={12} className="text-[var(--success)]" />
              ) : (
                <ClipboardCopy size={12} />
              )}
              {msgCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
        {/* Conversational text — hidden in dashboard mode (card title already shows context).
            For disambiguation messages, prefix with a question-circle icon
            (per design Surface 1: `[icon: question circle] [headline]`). */}
        {!dashboardMode && (
          <div className="flex items-start gap-2">
            {!isUser && message.disambiguation && (
              <HelpCircle
                className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--brand)]"
                aria-hidden="true"
              />
            )}
            <p className="whitespace-pre-wrap text-sm">
              {renderMarkdownText(message.text, isUser ? undefined : onAction)}
            </p>
          </div>
        )}
        {/* "Did you mean?" disambiguation chips — clicking one POSTs forceIntent
            via useChat.sendForceIntent(). Hidden in dashboard mode. */}
        {!isUser &&
          !dashboardMode &&
          message.disambiguation &&
          message.disambiguation.candidates.length > 0 && (
            <DisambiguationChips
              candidates={message.disambiguation.candidates}
              onSelect={(cand) => onDisambiguationSelect?.(cand)}
            />
          )}
        {message.richContent && message.richContent.data === null ? (
          <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-secondary)] italic">
            Results collapsed to save memory. Re-run the query to view again.
          </div>
        ) : compactRichContent &&
          message.richContent &&
          [
            "query_result",
            "csv_table",
            "csv_group_by",
            "csv_aggregation",
            "multi_query_result",
          ].includes(message.richContent.type) ? (
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Results shown in panel →
          </div>
        ) : message.richContent ? (
          <div className={dashboardMode ? "" : "mt-2"}>
            <RichContentRenderer
              richContent={message.richContent}
              onExecuteQuery={onExecuteQuery}
              onAction={onAction}
              onShowInPanel={onShowInPanel}
              cardId={cardId}
              linkedSelection={linkedSelection}
              onCellClick={onCellClick}
              drillDownConfig={drillDownConfig}
              onDrillDown={onDrillDown}
              displayMode={displayMode}
              compactAuto={compactAuto}
              savedChartType={savedChartType}
              onChartTypeChange={onChartTypeChange}
              diffInfo={diffInfo}
            />
          </div>
        ) : null}
        {/* Truncation banner */}
        {!isUser &&
          message.truncated &&
          message.totalRowsBeforeTruncation &&
          message.displayedRows && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--warning)] bg-[var(--warning-subtle)] px-3 py-1.5 text-xs text-[var(--warning)]">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[var(--warning)]" />
              <span>
                Showing {message.displayedRows.toLocaleString()} of{" "}
                {message.totalRowsBeforeTruncation.toLocaleString()} rows
                {message.estimatedSizeKB
                  ? ` (~${message.estimatedSizeKB} KB)`
                  : ""}
              </span>
            </div>
          )}
        {/* Anomaly alerts (hidden in dashboard/compact mode) */}
        {!isUser &&
          !dashboardMode &&
          !compactRichContent &&
          message.anomalies &&
          message.anomalies.length > 0 && (
            <div className="mt-2">
              <AnomalyAlert anomalies={message.anomalies} />
            </div>
          )}
        {/* Execution time badge + source + confidence + reference link (hidden in dashboard/compact mode) */}
        {!isUser &&
          !dashboardMode &&
          !compactRichContent &&
          (message.executionMs != null ||
            message.referenceUrl ||
            message.sourceName ||
            message.confidence != null) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {message.executionMs != null && !hideExecutionTime && (
                <span className="inline-flex items-center rounded-full bg-[var(--success-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--success)]">
                  Completed in {message.executionMs}ms
                </span>
              )}
              {message.sourceName && (
                <SourceBadge
                  sourceName={message.sourceName}
                  sourceType={message.sourceType}
                />
              )}
              {message.confidence != null && message.confidence < 1 && (
                <ConfidenceBadge confidence={message.confidence} />
              )}
              {message.referenceUrl && (
                <a
                  href={message.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-subtle)] border border-[var(--brand)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors"
                >
                  <Info className="w-3 h-3" />
                  More info
                </a>
              )}
            </div>
          )}
        {/* Feedback bar (thumbs up/down) — hidden in dashboard/compact mode */}
        {!isUser &&
          !dashboardMode &&
          !compactRichContent &&
          !message.isError &&
          onFeedback && (
            <FeedbackBar messageId={message.id} onFeedback={onFeedback} />
          )}
        {/* Retry button for errors */}
        {message.isError && message.retryText && onRetry && (
          <button
            onClick={() => onRetry(message.retryText!)}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--danger)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
