"use client";

import { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";

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
      .catch(() => {});
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
