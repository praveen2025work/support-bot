"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Paperclip,
  Plus,
  Trash2,
  LogOut,
  BarChart3,
  Table2,
  LayoutGrid,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";

interface QuerySuggestion {
  queryName: string;
  description?: string;
  score?: number;
}

/**
 * Phrases that look like follow-up commands on an existing result —
 * we don't want to swap the input for a catalog query while the user
 * is mid-conversation. Cheap prefix check; intentionally not the full
 * NLP pattern.
 */
const FOLLOWUP_PREFIXES = [
  "group by",
  "break it down",
  "break down",
  "split by",
  "for each",
  "per ",
  "sort",
  "rank",
  "summarize",
  "summary",
  "top ",
  "bottom ",
  "filter ",
  "where ",
  "show only",
];

function looksLikeFollowUp(t: string): boolean {
  const s = t.toLowerCase().trim();
  return FOLLOWUP_PREFIXES.some((p) => s.startsWith(p));
}

type DisplayMode = "auto" | "table" | "chart";

const DISPLAY_OPTIONS: {
  value: DisplayMode;
  label: string;
  icon: typeof BarChart3;
}[] = [
  { value: "auto", label: "Auto", icon: LayoutGrid },
  { value: "table", label: "Table", icon: Table2 },
  { value: "chart", label: "Chart", icon: BarChart3 },
];

export function ChatInput({
  onSend,
  disabled,
  onNewSession,
  onClearChat,
  onDisconnect,
  onFileSelect,
  platform = "web",
  displayMode = "auto",
  onDisplayModeChange,
  compactAuto = true,
  onCompactAutoChange,
  hasResults = false,
  groupId = "default",
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  onNewSession: () => void;
  onClearChat: () => void;
  onDisconnect: () => void;
  onFileSelect?: (file: File) => void;
  platform?: "web" | "widget";
  displayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  compactAuto?: boolean;
  onCompactAutoChange?: (compact: boolean) => void;
  hasResults?: boolean;
  groupId?: string;
}) {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Autocomplete state ──────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Tracks the latest in-flight search so a stale response doesn't
  // overwrite a fresher one. AbortController would also work but is
  // overkill for a 200ms-debounced 8-row JSON payload.
  const requestIdRef = useRef(0);

  // Debounced search effect. Hits the semantic search endpoint when
  // the user has typed 2+ chars of a non-follow-up phrase. Both the
  // clear-on-invalid path and the fetch path run inside setTimeout so
  // we never call setState synchronously inside the effect body — the
  // React lint rule against cascading renders.
  useEffect(() => {
    const trimmed = text.trim();
    const myId = ++requestIdRef.current;
    const invalid = trimmed.length < 2 || looksLikeFollowUp(trimmed);
    const timer = setTimeout(async () => {
      if (myId !== requestIdRef.current) return;
      if (invalid) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      try {
        const url = `/api/queries/search?q=${encodeURIComponent(trimmed)}&groupId=${encodeURIComponent(groupId)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data: { results?: QuerySuggestion[] } = await res.json();
        if (myId !== requestIdRef.current) return;
        const top = (data.results || []).slice(0, 6);
        setSuggestions(top);
        setShowSuggestions(top.length > 0);
        setHighlightedIndex(0);
      } catch {
        /* offline / network blip — keep prior state */
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [text, groupId]);

  const acceptSuggestion = useCallback((s: QuerySuggestion) => {
    // Fill the input rather than auto-submit so the user can tweak
    // (add filters, switch ordering) before sending.
    setText(`run ${s.queryName}`);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    setShowSuggestions(false);
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedIndex((i) => (i + 1) % suggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedIndex(
            (i) => (i - 1 + suggestions.length) % suggestions.length,
          );
          return;
        }
        if (e.key === "Tab") {
          // Tab accepts the highlighted suggestion. Enter is reserved
          // for sending — otherwise users who type a query name verbatim
          // would accidentally accept a suggestion instead of sending.
          e.preventDefault();
          acceptSuggestion(suggestions[highlightedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSuggestions(false);
          return;
        }
      }
      if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [
      showSuggestions,
      suggestions,
      highlightedIndex,
      acceptSuggestion,
      handleSubmit,
    ],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileSelect) {
        onFileSelect(file);
      }
      // Reset so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onFileSelect],
  );

  const displayControls = hasResults && onDisplayModeChange && (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5 bg-[var(--bg-secondary)] rounded-md p-0.5">
        {DISPLAY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = displayMode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onDisplayModeChange(opt.value)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                active
                  ? "bg-[var(--bg-primary)] text-[var(--brand)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
              title={`${opt.label} view`}
            >
              <Icon size={12} />
            </button>
          );
        })}
      </div>
      {displayMode === "auto" && onCompactAutoChange && (
        <button
          onClick={() => onCompactAutoChange(!compactAuto)}
          className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          title={
            compactAuto
              ? "Compact: tab toggle (click to stack)"
              : "Stacked: table + chart (click for tabs)"
          }
        >
          {compactAuto ? (
            <ToggleRight size={12} className="text-[var(--brand)]" />
          ) : (
            <ToggleLeft size={12} />
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="sticky bottom-0 z-10 bg-[var(--bg-primary)] border-t border-[var(--border)] flex-shrink-0">
      <div className="flex gap-2 p-3 pb-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,.docx,.doc"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
        {/* Paperclip / attach button */}
        {onFileSelect && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="rounded-full p-2 text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach a file (CSV, Excel, PDF, DOCX)"
            aria-label="Attach file"
          >
            <Paperclip size={18} />
          </button>
        )}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => {
              // Delay so a click on a suggestion lands before the
              // dropdown unmounts.
              setTimeout(() => setShowSuggestions(false), 120);
            }}
            placeholder="Type a message..."
            disabled={disabled}
            role="combobox"
            aria-autocomplete="list"
            aria-controls="chat-autocomplete-list"
            aria-expanded={showSuggestions}
            className="w-full rounded-full border border-[var(--border)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent disabled:opacity-50"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              id="chat-autocomplete-list"
              role="listbox"
              className="absolute bottom-full left-0 right-0 mb-2 max-h-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg z-20"
            >
              <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] flex items-center gap-1.5">
                <Search size={11} />
                Available queries · Tab to insert · Esc to dismiss
              </li>
              {suggestions.map((s, idx) => {
                const active = idx === highlightedIndex;
                return (
                  <li
                    key={s.queryName}
                    role="option"
                    aria-selected={active}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      acceptSuggestion(s);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className="px-3 py-2 cursor-pointer border-b last:border-b-0 border-[var(--border)] transition-colors"
                    style={{
                      backgroundColor: active
                        ? "color-mix(in srgb, var(--brand) 10%, transparent)"
                        : "transparent",
                    }}
                  >
                    <div
                      className="text-sm font-medium truncate"
                      style={{
                        color: active ? "var(--brand)" : "var(--text-primary)",
                      }}
                    >
                      {s.queryName}
                    </div>
                    {s.description && (
                      <div
                        className="text-xs truncate"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {s.description}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm text-[var(--brand-text)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
      {/* Session actions + display controls */}
      <div className="flex items-center justify-center gap-2 px-3 pb-2 pt-0">
        {platform === "widget" ? (
          <>
            {/* Widget: icon-only session buttons to save space */}
            <button
              onClick={onNewSession}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="New Session"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={onClearChat}
              disabled={disabled}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--warning)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
              title="Clear Chat"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onDisconnect}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="Disconnect"
            >
              <LogOut size={14} />
            </button>
            {displayControls && (
              <>
                <span className="text-[var(--border)]">|</span>
                {displayControls}
              </>
            )}
          </>
        ) : (
          <>
            {/* Web: icon-only session buttons (compact for split view) */}
            <button
              onClick={onNewSession}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="New Session"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={onClearChat}
              disabled={disabled}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--warning)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
              title="Clear Chat"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onDisconnect}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="Disconnect"
            >
              <LogOut size={14} />
            </button>
            {displayControls && (
              <>
                <span className="text-[var(--border)]">|</span>
                {displayControls}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
