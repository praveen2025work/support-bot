"use client";

import { useState, useEffect, useCallback } from "react";
import type { EventLinkConfig, DashboardCard } from "@/types/dashboard";
import {
  Settings,
  Radio,
  X,
  Pencil,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface CardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: DashboardCard;
  queryName: string;
  availableValueColumns?: string[];
  onSave: (partial: Partial<DashboardCard>) => void;
}

export function CardSettingsModal({
  isOpen,
  onClose,
  card,
  queryName,
  availableValueColumns,
  onSave,
}: CardSettingsModalProps) {
  // ── Local state (collect-then-save) ────────────────────────────────
  const [label, setLabel] = useState(card.label);
  const [displayMode, setDisplayMode] = useState<"auto" | "table" | "chart">(
    card.displayMode ?? "auto",
  );
  const [compactAuto, setCompactAuto] = useState(card.compactAuto ?? true);
  const [autoRun, setAutoRun] = useState(card.autoRun);
  const [eventLink, setEventLink] = useState<EventLinkConfig>(card.eventLink ?? { mode: "auto" });
  const [stompEnabled, setStompEnabled] = useState(
    card.stompEnabled ?? false,
  );
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(
    card.refreshIntervalSec ?? 0,
  );
  const [valueColumns, setValueColumns] = useState<string[] | undefined>(
    card.valueColumns,
  );
  const [chain, setChain] = useState<string[]>(card.followUpChain ?? []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [newStep, setNewStep] = useState("");

  // Reset local state when card changes
  useEffect(() => {
    setLabel(card.label);
    setDisplayMode(card.displayMode ?? "auto");
    setCompactAuto(card.compactAuto ?? true);
    setAutoRun(card.autoRun);
    setEventLink(card.eventLink);
    setStompEnabled(card.stompEnabled ?? false);
    setRefreshIntervalSec(card.refreshIntervalSec ?? 0);
    setValueColumns(card.valueColumns);
    setChain(card.followUpChain ?? []);
    setEditingIdx(null);
    setNewStep("");
  }, [card]);

  useBodyScrollLock(isOpen);

  const handleSave = useCallback(() => {
    onSave({
      label,
      displayMode,
      compactAuto,
      autoRun,
      eventLink,
      stompEnabled,
      refreshIntervalSec: refreshIntervalSec > 0 ? refreshIntervalSec : 0,
      valueColumns: valueColumns?.length ? valueColumns : undefined,
      followUpChain: chain.length > 0 ? chain : undefined,
    });
    onClose();
  }, [
    label,
    displayMode,
    compactAuto,
    autoRun,
    eventLink,
    stompEnabled,
    refreshIntervalSec,
    valueColumns,
    chain,
    onSave,
    onClose,
  ]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── Chain helpers ──────────────────────────────────────────────────
  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = [...chain];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setChain(next);
  };

  const removeStep = (idx: number) => {
    setChain((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditText(chain[idx]);
  };

  const commitEdit = () => {
    if (editingIdx === null) return;
    const trimmed = editText.trim();
    if (trimmed) {
      setChain((prev) =>
        prev.map((s, i) => (i === editingIdx ? trimmed : s)),
      );
    }
    setEditingIdx(null);
    setEditText("");
  };

  const addStep = () => {
    const trimmed = newStep.trim();
    if (!trimmed) return;
    setChain((prev) => [...prev, trimmed]);
    setNewStep("");
  };

  // ── Filters display ────────────────────────────────────────────────
  const filterEntries = Object.entries(card.defaultFilters).filter(
    ([, v]) => v,
  );

  const inputCls =
    "w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] focus:border-[var(--brand)] outline-none";
  const selectCls =
    "w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]";
  const sectionCls =
    "border border-[var(--border)] rounded-lg p-4 space-y-3";
  const sectionTitle =
    "text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bg-primary)] rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Settings size={18} />
            Card Settings
            <span className="text-[var(--text-muted)] font-normal">— {card.label}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body (scrollable) ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Display & Behavior */}
          <div className={sectionCls}>
            <div className={sectionTitle}>Display & Behavior</div>

            {/* Label */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Label
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Display mode + compact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Display Mode
                </label>
                <select
                  value={displayMode}
                  onChange={(e) =>
                    setDisplayMode(
                      e.target.value as "auto" | "table" | "chart",
                    )
                  }
                  className={selectCls}
                >
                  <option value="auto">Auto (Table | Chart)</option>
                  <option value="table">Table Only</option>
                  <option value="chart">Chart Only</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                {displayMode === "auto" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compactAuto}
                      onChange={(e) => setCompactAuto(e.target.checked)}
                      className="w-4 h-4 text-[var(--brand)] rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      Compact (tab toggle)
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Toggles row */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRun}
                  onChange={(e) => setAutoRun(e.target.checked)}
                  className="w-4 h-4 text-[var(--brand)] rounded"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  Auto-run on load
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stompEnabled}
                  onChange={(e) => setStompEnabled(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded"
                />
                <span className="text-sm text-[var(--text-primary)] inline-flex items-center gap-1">
                  <Radio size={12} className="text-cyan-500" />
                  Live notifications
                </span>
              </label>
            </div>
          </div>

          {/* Linking & Refresh */}
          <div className={sectionCls}>
            <div className={sectionTitle}>Linking & Refresh</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Cross-card linking
                </label>
                <select
                  value={eventLink.mode}
                  onChange={(e) =>
                    setEventLink({
                      ...eventLink,
                      mode: e.target.value as EventLinkConfig["mode"],
                    })
                  }
                  className={selectCls}
                >
                  <option value="auto">Auto (match by column)</option>
                  <option value="manual">Manual (explicit mappings)</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Auto-refresh interval
                </label>
                <select
                  value={refreshIntervalSec}
                  onChange={(e) =>
                    setRefreshIntervalSec(parseInt(e.target.value))
                  }
                  className={selectCls}
                >
                  <option value={0}>Off</option>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Metric Columns */}
          {availableValueColumns && availableValueColumns.length > 0 && (
            <div className={sectionCls}>
              <div className="flex items-center justify-between">
                <div className={sectionTitle + " mb-0"}>Metric Columns</div>
                {valueColumns && valueColumns.length > 0 && (
                  <button
                    onClick={() => setValueColumns(undefined)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Select which columns to include in group-by results. Leave all
                unchecked to show all.
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {availableValueColumns.map((col) => {
                  const isSelected = valueColumns?.includes(col) ?? false;
                  return (
                    <label
                      key={col}
                      className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const current = valueColumns ?? [];
                          const next = e.target.checked
                            ? [...current, col]
                            : current.filter((c) => c !== col);
                          setValueColumns(next.length > 0 ? next : undefined);
                        }}
                        className="w-4 h-4 text-[var(--brand)] rounded"
                      />
                      <span className="truncate" title={col}>
                        {col}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Saved View */}
          <div className={sectionCls}>
            <div className="flex items-center justify-between">
              <div className={sectionTitle + " mb-0"}>
                Saved View
                {chain.length > 0 && (
                  <span className="ml-1 text-[var(--text-muted)] font-normal normal-case">
                    ({chain.length} step{chain.length > 1 ? "s" : ""})
                  </span>
                )}
              </div>
              {chain.length > 0 && (
                <button
                  onClick={() => setChain([])}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Context: query + filters */}
            <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] shrink-0">Query:</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {queryName}
                </span>
              </div>
              {filterEntries.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-[var(--text-muted)] shrink-0">Filters:</span>
                  <div className="flex flex-wrap gap-1">
                    {filterEntries.map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center px-1.5 py-0.5 bg-[var(--brand-subtle)] text-[var(--brand)] rounded text-[11px] font-mono"
                      >
                        {k}={v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {filterEntries.length === 0 && (
                <div className="text-[var(--text-muted)]">No default filters</div>
              )}
            </div>

            {/* Steps */}
            {chain.length === 0 ? (
              <div className="text-center py-4 text-[var(--text-muted)] text-sm">
                No saved follow-up steps
              </div>
            ) : (
              <div className="space-y-1.5">
                {chain.map((step, idx) => (
                  <div
                    key={`step-${idx}-${step}`}
                    className="flex items-center gap-2 group border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-primary)]"
                  >
                    <span className="text-xs text-[var(--text-muted)] w-5 shrink-0 text-center">
                      {idx + 1}.
                    </span>

                    {editingIdx === idx ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingIdx(null);
                          }}
                          className="flex-1 text-sm px-2 py-1 border border-[var(--brand)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                          autoFocus
                        />
                        <button
                          onClick={commitEdit}
                          className="p-1 text-green-500 hover:text-green-700"
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingIdx(null)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-mono text-[var(--text-primary)]">
                          {step}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveStep(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30"
                            title="Move up"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => moveStep(idx, 1)}
                            disabled={idx === chain.length - 1}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30"
                            title="Move down"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => startEdit(idx)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--brand)]"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => removeStep(idx)}
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add step */}
            <div className="flex items-center gap-2">
              <input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStep();
                }}
                placeholder="e.g. group by Region, sort by DurationAvg desc, top 10"
                className={inputCls + " flex-1"}
              />
              <button
                onClick={addStep}
                disabled={!newStep.trim()}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--brand)] hover:text-[var(--brand)] border border-[var(--brand)] rounded-lg hover:bg-[var(--brand-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-secondary)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand)] hover:opacity-90 rounded-lg"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
