"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCopy, Check, ArrowUpRight, Plus } from "lucide-react";
import type { DisambiguationCandidate } from "@/hooks/useChat";

/**
 * Suggestion follow-up chips rendered under the latest assistant turn.
 * Stitch-styled pill with arrow-up-right glyph + hover-revealed copy button.
 */
export function SuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (text: string, source?: "suggestion_click" | "typed") => void;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (suggestions.length === 0) return null;

  const handleCopy = (text: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1500);
      })
      .catch((err) => {
        console.warn("Clipboard copy failed", err);
      });
  };

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2.5">
      {suggestions.map((suggestion, i) => (
        <span
          key={i}
          className="group inline-flex items-center gap-1 rounded-full border border-[var(--brand)]/40 bg-[var(--brand-subtle)] text-[12px] font-medium text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white hover:border-[var(--brand)] transition-all hover:shadow-[var(--shadow-sm)]"
        >
          <button
            onClick={() => onSelect(suggestion, "suggestion_click")}
            data-testid="suggestion-chip"
            className="pl-3 pr-1.5 py-1.5 cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>{suggestion}</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleCopy(suggestion, i, e)}
            className="pr-2.5 py-1.5 opacity-60 hover:opacity-100 cursor-pointer transition-opacity border-l border-current/20"
            title="Copy to clipboard"
          >
            {copiedIndex === i ? (
              <Check size={11} className="text-emerald-500" />
            ) : (
              <ClipboardCopy size={11} />
            )}
          </button>
        </span>
      ))}
    </div>
  );
}

/**
 * "Did you mean?" chip variant. Rendered inside the bot bubble for
 * disambiguation messages. Mirrors `SuggestionChips`' visual treatment but
 * displays a name + description stack and routes clicks through the
 * candidate's `forceIntent` (queryName) instead of the chip text.
 */
export function DisambiguationChips({
  candidates,
  onSelect,
  disabled,
  newQueryUtterance,
}: {
  candidates: DisambiguationCandidate[];
  onSelect: (candidate: DisambiguationCandidate) => void;
  /** When true, all chips are disabled (e.g. a click is in flight). */
  disabled?: boolean;
  /**
   * The user's original utterance. When provided, a "Create a new query"
   * affordance is shown that deep-links to the intents editor pre-filled with
   * this text — turning a failed match into a registered intent.
   */
  newQueryUtterance?: string;
}) {
  if (!candidates || candidates.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start gap-2 mt-2">
      {candidates.map((cand, i) => {
        const name = cand.label ?? cand.queryName ?? cand.intent;
        const pct = Number.isFinite(cand.score)
          ? Math.round(cand.score * 100)
          : null;
        return (
          <button
            key={`${cand.intent}-${cand.queryName ?? i}`}
            type="button"
            onClick={() => onSelect(cand)}
            disabled={disabled}
            data-testid="disambiguation-chip"
            aria-label={
              cand.description
                ? `Run query ${name}: ${cand.description}`
                : `Run ${name}`
            }
            className={`group inline-flex flex-col items-start text-left rounded-2xl border border-[var(--brand)] bg-[var(--brand-subtle)] px-3 py-1.5 text-xs text-[var(--brand)] transition-colors ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-80 cursor-pointer"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="font-medium leading-tight">{name}</span>
              {pct != null && (
                <span
                  data-testid="disambiguation-confidence"
                  className="shrink-0 rounded-full bg-[var(--brand)]/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                >
                  {pct}% match
                </span>
              )}
            </span>
            {cand.description && (
              <span className="text-[11px] text-[var(--text-secondary)] leading-tight max-w-[260px] truncate">
                {cand.description}
              </span>
            )}
          </button>
        );
      })}
      {newQueryUtterance && (
        <Link
          href={`/admin/intents?prefill=${encodeURIComponent(newQueryUtterance)}`}
          data-testid="disambiguation-new-query"
          className="inline-flex items-center gap-1 self-center rounded-2xl border border-dashed border-[var(--brand)] px-3 py-1.5 text-xs text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors"
        >
          <Plus className="w-3 h-3" />
          Create a new query
        </Link>
      )}
    </div>
  );
}
