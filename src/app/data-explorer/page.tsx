"use client";

import { Fragment, useEffect, useCallback } from "react";
import {
  Database,
  Plus,
  RotateCcw,
  Pencil,
  Check,
  Lock,
  Unlock,
  Save,
  Undo2,
  ChevronDown,
  Search,
  Sparkles,
  CircleDot,
  TriangleAlert,
  AlertOctagon,
} from "lucide-react";
import { useRef } from "react";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useDataExplorer } from "@/components/data-explorer/useDataExplorer";
import { useDataDashboard } from "@/components/data-explorer/useDataDashboard";
import { AutoFilterPanel } from "@/components/data-explorer/AutoFilterPanel";
import { DataCardRenderer } from "@/components/data-explorer/DataCardRenderer";
import { AddDataCardModal } from "@/components/data-explorer/AddDataCardModal";
import { DataCardSettingsModal } from "@/components/data-explorer/DataCardSettingsModal";
import { SimpleGrid } from "@/components/dashboard/SimpleGrid";
import { AnomalyBadge } from "@/components/dashboard/AnomalyBadge";
import type { DataCard, CardLayout } from "@/components/data-explorer/types";

/**
 * Turn a source name like "employee_compensation" or "pnl-lineage" into
 * a sentence-cased display title: "Employee Compensation" / "Pnl Lineage".
 * Keeps acronyms (length ≤ 3 letters, all caps in the source) as-is.
 */
function humanizeName(raw: string): string {
  if (!raw) return "";
  return raw
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 3 && part === part.toUpperCase()) return part;
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Short relative-time label. We deliberately don't pull date-fns just for
 * this one string; "just now / 3m / 2h / 5d" reads fine for save-state UI.
 */
function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 30_000) return "just now";
  if (diff < 60_000) return "moments ago";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Render a string containing **bold** markers as React nodes. We don't
 * want a full markdown parser — the engine only emits **X** for emphasis
 * and never anything else. Anything between matched `**` pairs becomes
 * a <strong> with brand color.
 */
function renderInsightText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong
          key={i}
          className="font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export default function DataExplorerPage() {
  const groupId = "default";
  const { userInfo } = useUser();
  const userName = userInfo?.samAccountName ?? "";
  const [showAddCard, setShowAddCard] = useState(false);
  const [settingsCardId, setSettingsCardId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  // Close source dropdown on outside click
  useEffect(() => {
    if (!sourceDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        sourceDropdownRef.current &&
        !sourceDropdownRef.current.contains(e.target as Node)
      )
        setSourceDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sourceDropdownOpen]);

  const explorer = useDataExplorer(groupId, userName);

  // Fire-and-forget source-view ping so the engine's interaction tracker
  // learns user preferences without us blocking the UI. Anonymous
  // callers (no samAccountName yet) get a no-op on the engine side.
  const recordSourceView = (name: string) => {
    if (!userName) return;
    fetch("/api/data/sources/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, userName, queryName: name }),
    }).catch(() => {});
  };
  const dashboard = useDataDashboard(explorer.selectedSource ?? "", groupId);
  const { config: dashboardConfig, initDashboard } = dashboard;

  // Initialize dashboard when schema loads
  useEffect(() => {
    if (explorer.schema && explorer.selectedSource && !dashboardConfig) {
      initDashboard(explorer.schema);
    }
  }, [
    explorer.schema,
    explorer.selectedSource,
    dashboardConfig,
    initDashboard,
  ]);

  // Sync global filters
  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      explorer.setFilter(key, value);
      if (dashboard.config) {
        const prev = { ...dashboard.config.globalFilters };
        if (value) {
          prev[key] = value;
        } else {
          delete prev[key];
        }
        dashboard.updateGlobalFilters(prev);
      }
    },
    [explorer, dashboard],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      explorer.setSearch(value);
    },
    [explorer],
  );

  const handleClearAll = useCallback(() => {
    // Reset explorer state atomically
    explorer.setFilters({});
    explorer.setSearch("");
    explorer.setGroupByCol(null);
    // Reset dashboard global filters in one call
    if (dashboard.config) {
      dashboard.updateGlobalFilters({});
    }
  }, [explorer, dashboard]);

  const handleAddCard = useCallback(
    (card: DataCard, layout: CardLayout) => {
      dashboard.addCard(card, layout);
    },
    [dashboard],
  );

  const handleLayoutChange = useCallback(
    (
      layouts: Array<{
        i: string;
        x: number;
        y: number;
        w: number;
        h: number;
        minW?: number;
        minH?: number;
      }>,
    ) => {
      if (!dashboard.config) return;
      const mapped: CardLayout[] = layouts.map((l) => ({
        i: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        minW: l.minW,
        minH: l.minH,
      }));
      dashboard.updateLayouts(mapped);
    },
    [dashboard],
  );

  const handleResetDashboard = useCallback(() => {
    dashboard.resetDashboard();
    // Re-init from schema
    if (explorer.schema) {
      dashboard.initDashboard(explorer.schema);
    }
  }, [dashboard, explorer.schema]);

  const globalFilters = dashboard.config?.globalFilters ?? explorer.filters;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <ContextualTopBar title="Data Explorer">
        <div className="flex items-center gap-2">
          {/* Source picker */}
          <div ref={sourceDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setSourceDropdownOpen((o) => !o);
                setSourceSearch("");
              }}
              className="flex items-center gap-2 text-[12px] border rounded-[var(--radius-md)] px-3 py-1.5 text-left transition-colors min-w-[180px] max-w-[280px]"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: sourceDropdownOpen
                  ? "var(--brand)"
                  : "var(--border)",
                color: explorer.selectedSource
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
                boxShadow: sourceDropdownOpen
                  ? "0 0 0 2px var(--brand-subtle)"
                  : "none",
              }}
            >
              {explorer.selectedSource ? (
                <span className="flex items-center gap-1.5 flex-1 truncate">
                  <Database
                    size={12}
                    style={{ color: "var(--brand)" }}
                    className="shrink-0"
                  />
                  <span className="truncate">{explorer.selectedSource}</span>
                </span>
              ) : (
                <span className="flex-1 truncate">Select data source...</span>
              )}
              <ChevronDown
                size={14}
                className="shrink-0 transition-transform"
                style={{
                  color: "var(--text-muted)",
                  transform: sourceDropdownOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
              />
            </button>

            {sourceDropdownOpen && (
              <div
                className="absolute z-50 top-full right-0 mt-1 w-72 rounded-[var(--radius-md)] border overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Search size={12} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder="Search sources..."
                    className="flex-1 text-[12px] bg-transparent outline-none"
                    style={{ color: "var(--text-primary)" }}
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {explorer.sources
                    .filter((s) =>
                      s.name.toLowerCase().includes(sourceSearch.toLowerCase()),
                    )
                    .map((s) => {
                      const isSelected = s.name === explorer.selectedSource;
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => {
                            explorer.setSelectedSource(s.name);
                            dashboard.resetDashboard();
                            setSourceDropdownOpen(false);
                            recordSourceView(s.name);
                          }}
                          className="w-full text-left px-3 py-2 text-[12px] transition-colors"
                          style={{
                            backgroundColor: isSelected
                              ? "var(--brand-subtle)"
                              : "transparent",
                            color: isSelected
                              ? "var(--brand)"
                              : "var(--text-primary)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.backgroundColor =
                                "var(--bg-secondary)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Database
                              size={11}
                              style={{
                                color: isSelected
                                  ? "var(--brand)"
                                  : "var(--text-muted)",
                              }}
                            />
                            <span className="font-medium truncate">
                              {s.name}
                            </span>
                            {s.recent && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                                style={{
                                  backgroundColor: "var(--brand-subtle)",
                                  color: "var(--brand)",
                                }}
                                title="You have used this source recently"
                              >
                                Recent
                              </span>
                            )}
                            <span
                              className="ml-auto text-[10px] uppercase"
                              style={{
                                color: "var(--text-muted)",
                              }}
                            >
                              {s.type}
                            </span>
                          </div>
                          {s.description && (
                            <div
                              className="text-[10px] mt-0.5 truncate pl-[19px]"
                              style={{
                                color: "var(--text-muted)",
                              }}
                            >
                              {s.description}
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Edit/View toggle + actions */}
          {explorer.selectedSource && dashboard.config && (
            <>
              <button
                onClick={() => setEditMode((m) => !m)}
                className={`inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border transition-colors ${
                  editMode
                    ? "bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning)]"
                    : "bg-[var(--bg-primary)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                {editMode ? <Unlock size={12} /> : <Lock size={12} />}
                {editMode ? "Editing" : "View"}
              </button>
              {editMode && (
                <>
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[var(--brand-text)] bg-[var(--brand)] hover:opacity-90 rounded-[var(--radius-md)]"
                  >
                    <Plus size={14} />
                    Add Card
                  </button>
                  <button
                    onClick={handleResetDashboard}
                    className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                    title="Reset to default layout"
                  >
                    <RotateCcw size={14} />
                  </button>
                </>
              )}
              {/* Save / Revert */}
              {dashboard.isDirty && (
                <>
                  <button
                    onClick={() => dashboard.persistDashboard()}
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[var(--brand-text)] bg-[var(--success)] hover:opacity-90 rounded-[var(--radius-md)]"
                    title="Save changes"
                  >
                    <Save size={12} />
                    Save
                  </button>
                  <button
                    onClick={() => dashboard.revertDashboard()}
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[var(--warning)] bg-[var(--warning-subtle)] hover:opacity-90 border border-[var(--warning)] rounded-[var(--radius-md)]"
                    title="Revert unsaved changes"
                  >
                    <Undo2 size={12} />
                    Revert
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </ContextualTopBar>

      {/* ── No source selected ───────────────────────────────── */}
      {!explorer.selectedSource && (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
          <Database size={48} className="mb-4 opacity-30" />
          <div className="text-lg font-semibold mb-1">Select a data source</div>
          <div className="text-sm mb-6">
            Choose a CSV or XLSX file to build a dashboard
          </div>
          {explorer.sources.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl">
              {explorer.sources.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    explorer.setSelectedSource(s.name);
                    recordSourceView(s.name);
                  }}
                  className="text-left p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl hover:border-[var(--brand)] hover:shadow-md transition-all"
                >
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {s.name}
                  </div>
                  {s.description && (
                    <div className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                      {s.description}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">
                    {s.type}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dashboard grid ───────────────────────────────────── */}
      {explorer.selectedSource && dashboard.config && (
        <>
          {/* ── Dashboard header ────────────────────────────────────
              Single-line layout: humanised title left, slim metadata
              row right. The cards + grid + saved indicators collapse
              into one tasteful "·" separated string instead of three
              competing labels. */}
          <div className="bg-[var(--bg-primary)] border-b border-[var(--border)] px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Source-type icon left of the title */}
              <span
                className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
                style={{
                  backgroundColor: "var(--brand-subtle)",
                  color: "var(--brand)",
                }}
              >
                <Database size={14} />
              </span>
              {editingName ? (
                <div className="flex items-center gap-1">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        dashboard.setConfig({
                          ...dashboard.config!,
                          name: nameInput.trim() || dashboard.config!.name,
                        });
                        setEditingName(false);
                      }
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="text-base font-semibold px-2 py-1 border border-[var(--brand)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--brand)] w-72"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      dashboard.setConfig({
                        ...dashboard.config!,
                        name: nameInput.trim() || dashboard.config!.name,
                      });
                      dashboard.persistDashboard();
                      setEditingName(false);
                    }}
                    className="p-1 text-green-500 hover:text-green-700"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                // The default dashboard name is "<source> Dashboard"; we
                // strip the suffix and humanise the source for display.
                // The persisted name still matches what the user saved.
                (() => {
                  const raw = dashboard.config.name;
                  const stripped = raw.replace(/\s*Dashboard\s*$/i, "");
                  const display = humanizeName(stripped) || raw;
                  return editMode ? (
                    <button
                      onClick={() => {
                        setNameInput(dashboard.config!.name);
                        setEditingName(true);
                      }}
                      className="flex items-center gap-1.5 text-base font-semibold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors truncate"
                      title="Click to rename dashboard"
                    >
                      <span className="truncate">{display}</span>
                      <Pencil size={12} className="text-[var(--text-muted)]" />
                    </button>
                  ) : (
                    <span className="text-base font-semibold text-[var(--text-primary)] truncate">
                      {display}
                    </span>
                  );
                })()
              )}
              {explorer.anomalies.length > 0 && (
                <AnomalyBadge anomalies={explorer.anomalies as never[]} />
              )}
            </div>

            {/* Metadata row — pill-like dot-separated string */}
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] shrink-0">
              <span>{dashboard.config.cards.length} cards</span>
              {explorer.schema && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {explorer.schema.columnCount}×
                    {explorer.schema.rowCount.toLocaleString()} grid
                  </span>
                </>
              )}
              <span aria-hidden>·</span>
              {dashboard.isDirty ? (
                <span
                  className="flex items-center gap-1 font-medium"
                  style={{ color: "var(--warning)" }}
                >
                  <CircleDot size={9} />
                  Unsaved
                </span>
              ) : (
                <span
                  title={new Date(dashboard.config.updatedAt).toLocaleString()}
                >
                  Saved {formatRelativeTime(dashboard.config.updatedAt)}
                </span>
              )}
            </div>
          </div>

          {/* ── Auto-insights card ───────────────────────────────────
              Replaces the old single-line strip with a contained card.
              Renders **markdown bold** properly. Each insight is its
              own row with a severity icon — no leading 💡 emoji on
              every line since the card header already conveys it. */}
          {explorer.insights.length > 0 && (
            <div
              className="px-6 pt-3 pb-1"
              role="status"
              aria-label="Auto-insights"
            >
              <div
                className="rounded-[var(--radius-md)] border bg-[var(--bg-primary)] overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 border-b text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--brand)",
                    backgroundColor:
                      "color-mix(in srgb, var(--brand) 4%, transparent)",
                  }}
                >
                  <Sparkles size={11} />
                  <span>Insights</span>
                  <span
                    className="ml-auto"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {explorer.insights.length}
                  </span>
                </div>
                <ul>
                  {explorer.insights.map((ins, i) => {
                    const isWarn = ins.severity === "warning";
                    const isCrit = ins.severity === "critical";
                    const tone = isCrit
                      ? "var(--danger)"
                      : isWarn
                        ? "var(--warning)"
                        : "var(--brand)";
                    const Icon = isCrit
                      ? AlertOctagon
                      : isWarn
                        ? TriangleAlert
                        : CircleDot;
                    return (
                      <li
                        key={i}
                        className="px-3 py-2 text-[12px] leading-snug flex items-start gap-2 border-t first:border-t-0"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <Icon
                          size={12}
                          className="mt-0.5 shrink-0"
                          style={{ color: tone }}
                        />
                        <span
                          className="min-w-0"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {renderInsightText(ins.text)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="bg-[var(--bg-primary)] border-b border-[var(--border)] px-6 py-2.5">
            <AutoFilterPanel
              source={explorer.selectedSource}
              groupId={groupId}
              filterableColumns={explorer.filterableColumns}
              filters={globalFilters}
              onFilterChange={handleFilterChange}
              search={explorer.search}
              onSearchChange={handleSearchChange}
              schema={
                explorer.schema?.schema as
                  | import("@/components/data-explorer/types").ColumnSchema[]
                  | undefined
              }
              groupByCol={explorer.groupByCol}
              onGroupByChange={(col) => explorer.setGroupByCol(col)}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Grid */}
          <div className="px-4 py-3 pb-12">
            <SimpleGrid
              layouts={dashboard.config.layouts}
              cols={12}
              rowHeight={40}
              gap={8}
              readOnly={!editMode}
              explicitPlacement
              onLayoutChange={handleLayoutChange}
            >
              {dashboard.config.cards.map((card, idx) => (
                <div key={card.id} className="h-full">
                  <DataCardRenderer
                    card={card}
                    source={explorer.selectedSource!}
                    groupId={groupId}
                    globalFilters={globalFilters}
                    readOnly={!editMode}
                    cachedAllRows={explorer.allRows}
                    totalDatasetRows={explorer.queryResult?.totalRows}
                    globalGroupBy={explorer.groupByCol}
                    onOpenSettings={
                      editMode ? () => setSettingsCardId(card.id) : undefined
                    }
                    onRemove={
                      editMode ? () => dashboard.removeCard(card.id) : undefined
                    }
                    onMoveUp={
                      editMode
                        ? () => dashboard.moveCardPosition(card.id, 0, -1)
                        : undefined
                    }
                    onMoveDown={
                      editMode
                        ? () => dashboard.moveCardPosition(card.id, 0, 1)
                        : undefined
                    }
                    onMoveLeft={
                      editMode
                        ? () => dashboard.moveCardPosition(card.id, -1, 0)
                        : undefined
                    }
                    onMoveRight={
                      editMode
                        ? () => dashboard.moveCardPosition(card.id, 1, 0)
                        : undefined
                    }
                    onGrow={
                      editMode
                        ? () => dashboard.resizeCardWidth(card.id, 1)
                        : undefined
                    }
                    onShrink={
                      editMode
                        ? () => dashboard.resizeCardWidth(card.id, -1)
                        : undefined
                    }
                    isFirst={idx === 0}
                    isLast={idx === dashboard.config!.cards.length - 1}
                  />
                </div>
              ))}
            </SimpleGrid>
          </div>
        </>
      )}

      {/* ── Loading state ────────────────────────────────────── */}
      {explorer.selectedSource &&
        !dashboard.config &&
        explorer.schemaLoading && (
          <div className="flex items-center justify-center py-32 text-[var(--text-muted)] animate-pulse">
            Loading schema…
          </div>
        )}

      {/* ── Add Card Modal ───────────────────────────────────── */}
      <AddDataCardModal
        isOpen={showAddCard}
        onClose={() => setShowAddCard(false)}
        onAdd={handleAddCard}
        schema={explorer.schema}
      />

      {/* ── Card Settings Modal ──────────────────────────────── */}
      {settingsCardId &&
        dashboard.config &&
        (() => {
          const settingsCard = dashboard.config.cards.find(
            (c) => c.id === settingsCardId,
          );
          if (!settingsCard) return null;
          return (
            <DataCardSettingsModal
              isOpen
              onClose={() => setSettingsCardId(null)}
              card={settingsCard}
              schema={explorer.schema}
              onSave={(cardId, partial) => {
                dashboard.updateCard(cardId, partial);
                setSettingsCardId(null);
              }}
            />
          );
        })()}
    </div>
  );
}
