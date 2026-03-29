"use client";

import { useEffect, useCallback } from "react";
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
} from "lucide-react";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { useState } from "react";
import { useDataExplorer } from "@/components/data-explorer/useDataExplorer";
import { useDataDashboard } from "@/components/data-explorer/useDataDashboard";
import { AutoFilterPanel } from "@/components/data-explorer/AutoFilterPanel";
import { DataCardRenderer } from "@/components/data-explorer/DataCardRenderer";
import { AddDataCardModal } from "@/components/data-explorer/AddDataCardModal";
import { DataCardSettingsModal } from "@/components/data-explorer/DataCardSettingsModal";
import { SimpleGrid } from "@/components/dashboard/SimpleGrid";
import { AnomalyBadge } from "@/components/dashboard/AnomalyBadge";
import type { DataCard, CardLayout } from "@/components/data-explorer/types";

export default function DataExplorerPage() {
  const groupId = "default";
  const [showAddCard, setShowAddCard] = useState(false);
  const [settingsCardId, setSettingsCardId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editMode, setEditMode] = useState(false);

  const explorer = useDataExplorer(groupId);
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
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <ContextualTopBar title="Data Explorer">
        <div className="flex items-center gap-2">
          {/* Source picker */}
          <select
            value={explorer.selectedSource ?? ""}
            onChange={(e) => {
              explorer.setSelectedSource(e.target.value || null);
              dashboard.resetDashboard();
            }}
            className="px-2 py-1.5 text-xs border rounded-lg outline-none font-medium"
            style={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--foreground))",
            }}
          >
            <option value="">— Select data source —</option>
            {explorer.sources.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Edit/View toggle + actions */}
          {explorer.selectedSource && dashboard.config && (
            <>
              <button
                onClick={() => setEditMode((m) => !m)}
                className={`inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  editMode
                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700"
                    : "hover:bg-[var(--bg-secondary)]"
                }`}
                style={
                  editMode
                    ? undefined
                    : {
                        color: "hsl(var(--muted-foreground))",
                        borderColor: "hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                      }
                }
              >
                {editMode ? <Unlock size={12} /> : <Lock size={12} />}
                {editMode ? "Editing" : "View"}
              </button>
              {editMode && (
                <>
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-white bg-[var(--brand)] hover:opacity-90 rounded-lg"
                  >
                    <Plus size={14} />
                    Add Card
                  </button>
                  <button
                    onClick={handleResetDashboard}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)]"
                    style={{ color: "hsl(var(--muted-foreground))" }}
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
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                    title="Save changes"
                  >
                    <Save size={12} />
                    Save
                  </button>
                  <button
                    onClick={() => dashboard.revertDashboard()}
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700"
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
        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-muted)]">
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
                  onClick={() => explorer.setSelectedSource(s.name)}
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
          {/* Dashboard name bar */}
          <div className="bg-[var(--bg-primary)] border-b border-[var(--border)] px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                    className="text-sm font-semibold px-2 py-1 border border-[var(--brand)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--brand)] w-64"
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
              ) : editMode ? (
                <button
                  onClick={() => {
                    setNameInput(dashboard.config!.name);
                    setEditingName(true);
                  }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors"
                  title="Click to rename dashboard"
                >
                  {dashboard.config.name}
                  <Pencil size={12} className="text-[var(--text-muted)]" />
                </button>
              ) : (
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {dashboard.config.name}
                </span>
              )}
              <span className="text-[10px] text-[var(--text-muted)] ml-2">
                {dashboard.config.cards.length} cards
              </span>
              {explorer.anomalies.length > 0 && (
                <AnomalyBadge anomalies={explorer.anomalies as never[]} />
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              {explorer.schema && (
                <span>
                  {explorer.schema.columnCount} cols ·{" "}
                  {explorer.schema.rowCount.toLocaleString()} rows
                </span>
              )}
              {dashboard.isDirty ? (
                <span className="text-amber-500 font-medium">
                  Unsaved changes
                </span>
              ) : (
                <span>
                  Saved{" "}
                  {new Date(dashboard.config.updatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

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
