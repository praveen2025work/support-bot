"use client";

import { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";
import type { DisambiguationCandidate } from "@/hooks/useChat";

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
        // Clipboard can legitimately fail in restricted contexts (Teams iframe,
        // permission-denied). Log so we can spot persistent failures, but never
        // block the rest of the chip UI.
        console.warn("Clipboard copy failed", err);
      });
  };

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {suggestions.map((suggestion, i) => (
        <span
          key={i}
          className="group inline-flex items-center gap-1 rounded-full border border-[var(--brand)] bg-[var(--brand-subtle)] text-xs text-[var(--brand)] hover:opacity-80 transition-colors"
        >
          <button
            onClick={() => onSelect(suggestion, "suggestion_click")}
            data-testid="suggestion-chip"
            className="pl-3 py-1 cursor-pointer"
          >
            {suggestion}
          </button>
          <button
            onClick={(e) => handleCopy(suggestion, i, e)}
            className="pr-2 py-1 text-[var(--brand)] hover:opacity-70 transition-colors cursor-pointer"
            title="Copy to clipboard"
          >
            {copiedIndex === i ? (
              <Check size={12} className="text-green-600" />
            ) : (
              <ClipboardCopy size={12} />
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
}: {
  candidates: DisambiguationCandidate[];
  onSelect: (candidate: DisambiguationCandidate) => void;
  /** When true, all chips are disabled (e.g. a click is in flight). */
  disabled?: boolean;
}) {
  if (!candidates || candidates.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {candidates.map((cand, i) => {
        const name = cand.label ?? cand.queryName ?? cand.intent;
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
            className={`group inline-flex flex-col items-start text-left rounded-full border border-[var(--brand)] bg-[var(--brand-subtle)] px-3 py-1.5 text-xs text-[var(--brand)] transition-colors ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-80 cursor-pointer"
            }`}
          >
            <span className="font-medium leading-tight">{name}</span>
            {cand.description && (
              <span className="text-[11px] text-[var(--text-secondary)] leading-tight max-w-[260px] truncate">
                {cand.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
