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
  EyeOff,
  Eye,
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
  // Initial state matches the SSR render to avoid hydration mismatch;
  // patched from localStorage after mount.
  const [insightsHidden, setInsightsHidden] = useState<boolean>(false);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration sync of a persisted prefs value */
  useEffect(() => {
    try {
      setInsightsHidden(
        localStorage.getItem("insights-hidden:data-explorer") === "true",
      );
    } catch {
      /* ignore */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleInsightsHidden = () => {
    setInsightsHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("insights-hidden:data-explorer", String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };
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
  const dashboard = useDataDashboard(
    explorer.selectedSource ?? "",
    groupId,
    userName || "anonymous",
  );
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
    <div className="h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <ContextualTopBar
        title="Data Explorer"
        subtitle="Synthesize signal from any source"
      >
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

      {/* ── No source selected — Stitch synthesis hero ──────── */}
      {!explorer.selectedSource && (
        <div className="flex-1 overflow-auto px-6 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Hero card */}
            <div className="relative rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden shadow-[var(--shadow-md)] mb-8">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-80 pointer-events-none"
                style={{ background: "var(--hero-glow)" }}
              />
              <div className="relative px-10 py-10 flex flex-col items-start gap-3 max-w-3xl">
                <div className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span className="eyebrow !text-[var(--brand)]">
                    AI Synthesis Report
                  </span>
                </div>
                <h2 className="font-display text-[28px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                  Pick a source. Get a narrative.
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  The synthesis engine reads schema, anomalies, and drift, then
                  composes a performance brief with KPI tiles, regional charts,
                  and recommended smart actions — all in seconds.
                </p>
                {explorer.sources.length > 0 && (
                  <div className="text-[11.5px] text-[var(--text-muted)] mt-1 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                    {explorer.sources.length} source
                    {explorer.sources.length === 1 ? "" : "s"} available
                  </div>
                )}
              </div>
            </div>

            {/* Source picker grid */}
            {explorer.sources.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-tight">
                    Choose a source
                  </h3>
                  <span className="eyebrow">
                    {explorer.sources.length} available
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {explorer.sources.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => {
                        explorer.setSelectedSource(s.name);
                        recordSourceView(s.name);
                      }}
                      className="group text-left p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-lg)] hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-[var(--brand-subtle)] flex items-center justify-center shrink-0 group-hover:bg-[var(--brand)] transition-colors">
                          <Database className="w-4 h-4 text-[var(--brand)] group-hover:text-white transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                              {humanizeName(s.name)}
                            </span>
                            {s.recent && (
                              <span className="chip chip-brand !py-0.5 !px-1.5 !text-[9px] !tracking-[0.1em] uppercase">
                                Recent
                              </span>
                            )}
                          </div>
                          {s.description ? (
                            <p className="text-[11.5px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                              {s.description}
                            </p>
                          ) : (
                            <p className="text-[11.5px] text-[var(--text-muted)] line-clamp-2 leading-relaxed font-mono">
                              {s.name}
                            </p>
                          )}
                          <div className="mt-2 inline-flex items-center gap-1.5">
                            <span className="eyebrow !text-[9px]">
                              {s.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
          {/* ── Compact dashboard header ──────────────────────────
              Single dense row: icon + inline title + metadata chips +
              insight summary pill + actions. Total height ≈ 48px,
              reclaiming ~80px of vertical space versus the previous
              two-row layout. The full insights list expands inline
              only when the user opens it. */}
          {(() => {
            const raw = dashboard.config.name;
            const stripped = raw.replace(/\s*Dashboard\s*$/i, "");
            const display = humanizeName(stripped) || raw;
            const firstInsight = explorer.insights[0];
            const insightTone = firstInsight
              ? firstInsight.severity === "critical"
                ? "var(--danger)"
                : firstInsight.severity === "warning"
                  ? "var(--warning)"
                  : "var(--brand)"
              : "var(--brand)";
            return (
              <div className="bg-[var(--bg-primary)] border-b border-[var(--border)] px-6 py-2.5 flex items-center gap-3 flex-wrap">
                {/* Brand tile */}
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-[8px] shrink-0"
                  style={{
                    background: "var(--brand-gradient)",
                    color: "white",
                    boxShadow: "0 4px 12px -6px rgba(99,102,241,0.55)",
                  }}
                >
                  <Database size={13} />
                </span>

                {/* Title — single line, in-place editable */}
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
                      className="text-[15px] font-bold px-2 py-0.5 border border-[var(--brand)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--brand)] w-64"
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
                      className="p-1 text-emerald-500 hover:text-emerald-600"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!editMode) return;
                      setNameInput(dashboard.config!.name);
                      setEditingName(true);
                    }}
                    className={`font-display text-[15px] font-bold tracking-tight text-[var(--text-primary)] truncate leading-tight inline-flex items-center gap-1 ${editMode ? "hover:text-[var(--brand)] cursor-pointer" : "cursor-default"}`}
                    title={editMode ? "Click to rename" : display}
                  >
                    <span className="truncate">{display}</span>
                    {editMode && (
                      <Pencil
                        size={11}
                        className="text-[var(--text-muted)] shrink-0"
                      />
                    )}
                  </button>
                )}

                {/* Anomaly badge */}
                {explorer.anomalies.length > 0 && (
                  <AnomalyBadge anomalies={explorer.anomalies as never[]} />
                )}

                {/* Metadata chips — dense, scannable */}
                <span className="chip !py-0.5 !px-2 !text-[10.5px] font-mono">
                  {dashboard.config.cards.length} cards
                </span>
                {explorer.schema && (
                  <span className="chip !py-0.5 !px-2 !text-[10.5px] font-mono">
                    {explorer.schema.columnCount}×
                    {explorer.schema.rowCount.toLocaleString()}
                  </span>
                )}
                {dashboard.isDirty ? (
                  <span
                    className="chip chip-warning !py-0.5 !px-2 !text-[10.5px]"
                    title="Unsaved changes"
                  >
                    <CircleDot size={9} />
                    Unsaved
                  </span>
                ) : (
                  <span
                    className="text-[10.5px] text-[var(--text-muted)] font-mono"
                    title={new Date(
                      dashboard.config.updatedAt,
                    ).toLocaleString()}
                  >
                    {formatRelativeTime(dashboard.config.updatedAt)}
                  </span>
                )}

                {/* Insights summary pill — single chip. Collapsed:
                    first insight + count. Expanded: just "Hide N"
                    and the full list renders below in one place. */}
                {firstInsight && (
                  <button
                    onClick={toggleInsightsHidden}
                    className="ml-auto inline-flex items-center gap-1.5 max-w-[420px] rounded-full border px-2.5 py-1 text-[11.5px] transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{
                      borderColor: `color-mix(in srgb, ${insightTone} 30%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${insightTone} 6%, transparent)`,
                      color: "var(--text-primary)",
                    }}
                    title={
                      insightsHidden ? "Show all insights" : "Hide insights"
                    }
                  >
                    <Sparkles
                      className="w-3 h-3 shrink-0"
                      style={{ color: insightTone }}
                    />
                    {insightsHidden ? (
                      <>
                        <span className="truncate font-medium">
                          {renderInsightText(firstInsight.text)}
                        </span>
                        {explorer.insights.length > 1 && (
                          <span
                            className="shrink-0 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${insightTone} 14%, transparent)`,
                              color: insightTone,
                            }}
                          >
                            +{explorer.insights.length - 1}
                          </span>
                        )}
                        <Eye
                          className="w-3 h-3 shrink-0 opacity-70"
                          style={{ color: insightTone }}
                        />
                      </>
                    ) : (
                      <>
                        <span className="font-medium">
                          Hide {explorer.insights.length} insight
                          {explorer.insights.length === 1 ? "" : "s"}
                        </span>
                        <EyeOff
                          className="w-3 h-3 shrink-0 opacity-70"
                          style={{ color: insightTone }}
                        />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Full insights panel — when expanded, every insight
              renders here in one place. */}
          {!insightsHidden && explorer.insights.length > 0 && (
            <div
              className="px-6 pt-2 pb-1"
              role="status"
              aria-label="Auto-insights"
            >
              <ul className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 px-1 py-1">
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
                      className="px-3 py-1.5 text-[12px] leading-snug flex items-start gap-2 rounded hover:bg-[var(--bg-elevated)] transition-colors"
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
