"use client";

import { useState } from "react";
import type { QueryInfo, EventLinkConfig } from "@/types/dashboard";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: {
    queryName: string;
    groupId: string;
    label: string;
    defaultFilters: Record<string, string>;
    autoRun: boolean;
    eventLink: EventLinkConfig;
    displayMode?: "auto" | "table" | "chart";
    compactAuto?: boolean;
    stompEnabled?: boolean;
  }) => void | Promise<void>;
  availableQueries: QueryInfo[];
  groupId: string;
}

export function AddCardModal({
  isOpen,
  onClose,
  onAdd,
  availableQueries,
  groupId,
}: AddCardModalProps) {
  const [selectedQuery, setSelectedQuery] = useState("");
  const [label, setLabel] = useState("");
  const [autoRun, setAutoRun] = useState(true);
  const [linkMode, setLinkMode] = useState<"auto" | "manual" | "disabled">(
    "auto",
  );
  const [displayMode, setDisplayMode] = useState<"auto" | "table" | "chart">(
    "auto",
  );
  const [compactAuto, setCompactAuto] = useState(true);
  const [stompEnabled, setStompEnabled] = useState(false);
  const [search, setSearch] = useState("");
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const filtered = availableQueries.filter(
    (q) =>
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = async () => {
    if (!selectedQuery) return;
    await onAdd({
      queryName: selectedQuery,
      groupId,
      label: label || selectedQuery,
      defaultFilters: {},
      autoRun,
      eventLink: { mode: linkMode },
      displayMode,
      compactAuto: displayMode === "auto" ? compactAuto : undefined,
      stompEnabled,
    });
    // Reset
    setSelectedQuery("");
    setLabel("");
    setAutoRun(true);
    setLinkMode("auto");
    setDisplayMode("auto");
    setCompactAuto(true);
    setStompEnabled(false);
    setSearch("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Add Query Card
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Query search */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Query
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search queries..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm"
            />
            <div className="mt-2 max-h-40 overflow-y-auto border border-[var(--border)] rounded-lg">
              {filtered.map((q) => (
                <button
                  key={q.name}
                  onClick={() => {
                    setSelectedQuery(q.name);
                    if (!label) setLabel(q.name);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-secondary)] border-b border-[var(--border)] last:border-0 ${selectedQuery === q.name ? "bg-[var(--brand-subtle)] text-[var(--brand)]" : "text-[var(--text-primary)]"}`}
                >
                  <div className="font-medium">{q.name}</div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    {q.description}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-sm text-[var(--text-secondary)] text-center">
                  No queries found
                </p>
              )}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Card Label
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Display name for this card"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm"
            />
          </div>

          {/* Auto-run toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="w-4 h-4 text-[var(--brand)] rounded"
            />
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Auto-run on load
              </span>
              <p className="text-xs text-[var(--text-secondary)]">
                Execute this query automatically when the dashboard opens
              </p>
            </div>
          </label>

          {/* Live notifications toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={stompEnabled}
              onChange={(e) => setStompEnabled(e.target.checked)}
              className="w-4 h-4 text-cyan-600 rounded"
            />
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Enable Live Notifications
              </span>
              <p className="text-xs text-[var(--text-secondary)]">
                Receive real-time STOMP WebSocket updates for this card
              </p>
            </div>
          </label>

          {/* Display mode */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Default Display
            </label>
            <div className="flex gap-2">
              {(
                [
                  ["auto", "Auto (Table | Chart)"],
                  ["table", "Table Only"],
                  ["chart", "Chart Only"],
                ] as const
              ).map(([mode, modeLabel]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDisplayMode(mode)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${displayMode === mode ? "bg-[var(--brand-subtle)] text-[var(--brand)] border-[var(--brand)]" : "text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]"}`}
                >
                  {modeLabel}
                </button>
              ))}
            </div>
            {/* Compact toggle — only visible when Auto is selected */}
            {displayMode === "auto" && (
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={compactAuto}
                  onChange={(e) => setCompactAuto(e.target.checked)}
                  className="w-4 h-4 text-[var(--brand)] rounded"
                />
                <div>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    Compact
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] ml-1">
                    — Tab toggle between Table and Chart instead of stacking
                    both
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Event link mode */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Cross-card Linking
            </label>
            <div className="space-y-2">
              {(["auto", "manual", "disabled"] as const).map((mode) => (
                <label
                  key={mode}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="linkMode"
                    value={mode}
                    checked={linkMode === mode}
                    onChange={() => setLinkMode(mode)}
                    className="w-4 h-4 text-[var(--brand)]"
                  />
                  <div>
                    <span className="text-sm text-[var(--text-primary)] capitalize">
                      {mode}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] ml-2">
                      {mode === "auto" &&
                        "— Filter when matching columns are clicked in other cards"}
                      {mode === "manual" &&
                        "— Configure explicit column mappings"}
                      {mode === "disabled" &&
                        "— Ignore events from other cards"}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedQuery}
            className="px-4 py-2 text-sm bg-[var(--brand)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
}
