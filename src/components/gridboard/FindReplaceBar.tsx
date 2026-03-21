"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronUp, ChevronDown, Replace } from "lucide-react";

interface FindReplaceMatch {
  rowIndex: number;
  column: string;
}

interface FindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  rows: Record<string, unknown>[];
  columns: string[];
  onReplace: (rowIndex: number, column: string, newValue: string) => void;
  onReplaceAll: (matches: FindReplaceMatch[], newValue: string) => void;
  onHighlightMatch: (match: FindReplaceMatch | null) => void;
}

export function FindReplaceBar({
  isOpen,
  onClose,
  rows,
  columns,
  onReplace,
  onReplaceAll,
  onHighlightMatch,
}: FindReplaceBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [showReplace, setShowReplace] = useState(false);

  const matches: FindReplaceMatch[] = [];
  if (searchTerm) {
    const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    rows.forEach((row, rowIndex) => {
      columns.forEach((col) => {
        const val = String(row[col] ?? "");
        const compare = caseSensitive ? val : val.toLowerCase();
        if (compare.includes(term)) {
          matches.push({ rowIndex, column: col });
        }
      });
    });
  }

  useEffect(() => {
    if (matches.length > 0 && currentMatchIdx < matches.length) {
      onHighlightMatch(matches[currentMatchIdx]);
    } else {
      onHighlightMatch(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, currentMatchIdx, caseSensitive]);

  useEffect(() => {
    setCurrentMatchIdx(0);
  }, [searchTerm, caseSensitive]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIdx((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIdx((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const handleReplace = useCallback(() => {
    if (matches.length === 0 || !searchTerm) return;
    const match = matches[currentMatchIdx];
    const oldVal = String(rows[match.rowIndex][match.column] ?? "");
    const regex = new RegExp(
      searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      caseSensitive ? "g" : "gi",
    );
    const newVal = oldVal.replace(regex, replaceTerm);
    onReplace(match.rowIndex, match.column, newVal);
  }, [
    matches,
    currentMatchIdx,
    searchTerm,
    replaceTerm,
    caseSensitive,
    rows,
    onReplace,
  ]);

  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0 || !searchTerm) return;
    onReplaceAll(matches, replaceTerm);
  }, [matches, searchTerm, replaceTerm, onReplaceAll]);

  const handleClose = useCallback(() => {
    onHighlightMatch(null);
    onClose();
  }, [onClose, onHighlightMatch]);

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-xs">
      <div className="flex items-center gap-1.5 flex-1">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find..."
          className="px-2 py-1 border border-gray-300 rounded text-xs w-40 focus:ring-1 focus:ring-blue-300 focus:outline-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") goNext();
            if (e.key === "Escape") handleClose();
          }}
        />

        <button
          onClick={goPrev}
          disabled={matches.length === 0}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
          title="Previous match"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={goNext}
          disabled={matches.length === 0}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
          title="Next match"
        >
          <ChevronDown size={14} />
        </button>

        <span className="text-gray-500 min-w-[60px]">
          {matches.length > 0
            ? `${currentMatchIdx + 1} of ${matches.length}`
            : searchTerm
              ? "No matches"
              : ""}
        </span>

        <label className="flex items-center gap-1 text-gray-500 ml-2">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Aa
        </label>

        <button
          onClick={() => setShowReplace(!showReplace)}
          className={`p-1 rounded ${showReplace ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700"}`}
          title="Toggle replace"
        >
          <Replace size={14} />
        </button>

        {showReplace && (
          <>
            <input
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace with..."
              className="px-2 py-1 border border-gray-300 rounded text-xs w-40 focus:ring-1 focus:ring-blue-300 focus:outline-none"
            />
            <button
              onClick={handleReplace}
              disabled={matches.length === 0}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={matches.length === 0}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              All
            </button>
          </>
        )}
      </div>

      <button
        onClick={handleClose}
        className="p-1 text-gray-400 hover:text-gray-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}
