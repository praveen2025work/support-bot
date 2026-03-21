"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SimpleGrid, type GridItem } from "./SimpleGrid";
import { QueryCard } from "./QueryCard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import type { Dashboard, DashboardCard, CardLayout } from "@/types/dashboard";
import {
  GripVertical,
  X,
  LayoutGrid,
  Bookmark,
  Pencil,
  Table2,
  BarChart3,
  Layers,
  Maximize2,
  Minimize2,
  Copy,
  StickyNote,
  Timer,
  TimerOff,
  Grid3X3,
  Bell,
  MessageCircle,
  ExternalLink,
  Radio,
} from "lucide-react";
import { DashboardTabBar } from "./DashboardTabBar";
import { useRouter } from "next/navigation";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { Tooltip } from "@/components/ui/Tooltip";
import { CardSettingsPopover } from "./CardSettingsPopover";

interface GridDashboardProps {
  dashboard: Dashboard;
  userName?: string;
  availableQueries?: Array<{
    name: string;
    description: string;
    filters: Array<string | { key: string; binding: string }>;
    type: string;
    drillDown?: Array<{
      sourceColumn: string;
      targetQuery: string;
      targetFilter: string;
      label?: string;
    }>;
    actionConfig?: {
      url: string;
      label?: string;
      contextFields?: string[];
      metadata?: Record<string, string>;
    };
  }>;
  onLayoutChange: (layouts: CardLayout[]) => void;
  onCardRemove: (cardId: string) => void;
  onCardUpdate: (cardId: string, partial: Partial<DashboardCard>) => void;
  onCardDuplicate?: (cardId: string) => void;
  // Tab management
  onAddTab?: (name: string) => void;
  onRenameTab?: (tabId: string, name: string) => void;
  onRemoveTab?: (tabId: string) => void;
  onSetActiveTab?: (tabId: string) => void;
  // Drill-down inline
  onDrillDownInline?: (
    queryName: string,
    filter: string,
    value: string,
    groupId: string,
  ) => void;
  // Alert count per card
  alertCounts?: Record<string, number>;
  // Comment count per card
  commentCounts?: Record<string, number>;
  onOpenComments?: (cardId: string) => void;
  onOpenAlerts?: (cardId: string) => void;
  /** Per-card refresh trigger counters from STOMP WebSocket events */
  stompRefreshTriggers?: Record<string, number>;
  /** Open the action panel for a given card */
  onOpenAction?: (cardId: string) => void;
}

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
];

function CardHeader({
  card,
  executionMs,
  onRemove,
  onCardUpdate,
  onDuplicate,
  onMaximize,
  isMaximized,
  simpleMode,
  alertCount,
  commentCount,
  onOpenComments,
  onOpenAlerts,
  onOpenGridBoard,
  onOpenAction,
}: {
  card: DashboardCard;
  executionMs: number | null;
  onRemove: () => void;
  onCardUpdate?: (cardId: string, partial: Partial<DashboardCard>) => void;
  onDuplicate?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  simpleMode?: boolean;
  alertCount?: number;
  commentCount?: number;
  onOpenComments?: () => void;
  onOpenAlerts?: () => void;
  onOpenGridBoard?: () => void;
  onOpenAction?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(card.label);
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState(card.notes || "");
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const notesRef = useRef<HTMLDivElement>(null);
  const refreshRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    if (!showNotes && !showRefreshMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        showNotes &&
        notesRef.current &&
        !notesRef.current.contains(e.target as Node)
      ) {
        // Save on close
        if (notesText !== (card.notes || "")) {
          onCardUpdate?.(card.id, { notes: notesText || undefined });
        }
        setShowNotes(false);
      }
      if (
        showRefreshMenu &&
        refreshRef.current &&
        !refreshRef.current.contains(e.target as Node)
      ) {
        setShowRefreshMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [
    showNotes,
    showRefreshMenu,
    notesText,
    card.notes,
    card.id,
    onCardUpdate,
  ]);

  const saveLabel = () => {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== card.label) {
      onCardUpdate?.(card.id, { label: trimmed });
    }
    setEditing(false);
  };

  const displayMode = card.displayMode || "auto";
  const cycleDisplayMode = () => {
    const modes: Array<"auto" | "table" | "chart"> = ["auto", "table", "chart"];
    const next = modes[(modes.indexOf(displayMode) + 1) % modes.length];
    onCardUpdate?.(card.id, { displayMode: next });
  };

  const DisplayIcon =
    displayMode === "table"
      ? Table2
      : displayMode === "chart"
        ? BarChart3
        : Layers;
  const displayTitle =
    displayMode === "table"
      ? "Table only (click to cycle)"
      : displayMode === "chart"
        ? "Chart only (click to cycle)"
        : "Auto: table + chart (click to cycle)";

  const refreshSec = card.refreshIntervalSec || 0;

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 ${simpleMode || isMaximized ? "" : "card-drag-handle cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!simpleMode && !isMaximized && (
          <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
        )}
        {editing ? (
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveLabel();
              if (e.key === "Escape") {
                setEditLabel(card.label);
                setEditing(false);
              }
            }}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-blue-300 rounded px-1.5 py-0.5 min-w-0 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {card.label}
            </span>
            {!simpleMode && (
              <Tooltip label="Rename card">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditLabel(card.label);
                    setEditing(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-0.5 text-gray-300 hover:text-blue-500 rounded flex-shrink-0"
                >
                  <Pencil size={12} />
                </button>
              </Tooltip>
            )}
          </>
        )}
        {!simpleMode && card.autoRun ? (
          <span
            key="auto"
            className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0"
          >
            Auto
          </span>
        ) : null}
        {!simpleMode && card.stompEnabled ? (
          <span
            key="live"
            className="text-[10px] bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 px-1.5 py-0.5 rounded-full flex-shrink-0 inline-flex items-center gap-0.5"
          >
            <Radio size={8} />
            Live
          </span>
        ) : null}
        {refreshSec > 0 ? (
          <span
            key="refresh"
            className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full flex-shrink-0"
          >
            {refreshSec >= 60 ? `${refreshSec / 60}m` : `${refreshSec}s`}
          </span>
        ) : null}
        {executionMs !== null ? (
          <span
            key="exec"
            className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0"
          >
            {executionMs}ms
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-0.5">
        {/* Notes */}
        {!simpleMode && (
          <div className="relative" ref={notesRef}>
            <Tooltip label={card.notes ? "Edit note" : "Add note"}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNotesText(card.notes || "");
                  setShowNotes(!showNotes);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`p-1 rounded flex-shrink-0 relative ${card.notes ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"}`}
              >
                <StickyNote size={14} />
                {card.notes && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full" />
                )}
              </button>
            </Tooltip>
            {showNotes && (
              <div
                className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-3"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={() => {
                      onCardUpdate?.(card.id, {
                        notes: notesText || undefined,
                      });
                      setShowNotes(false);
                    }}
                    className="px-2 py-1 text-[10px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Auto-refresh */}
        {!simpleMode && (
          <div className="relative" ref={refreshRef}>
            <Tooltip
              label={
                refreshSec > 0
                  ? `Auto-refresh: ${refreshSec >= 60 ? `${refreshSec / 60}m` : `${refreshSec}s`}`
                  : "Set auto-refresh"
              }
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRefreshMenu(!showRefreshMenu);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`p-1 rounded flex-shrink-0 ${refreshSec > 0 ? "text-orange-500 bg-orange-50 dark:bg-orange-900/20" : "text-gray-400 hover:text-gray-600"}`}
              >
                {refreshSec > 0 ? <Timer size={14} /> : <TimerOff size={14} />}
              </button>
            </Tooltip>
            {showRefreshMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {REFRESH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onCardUpdate?.(card.id, {
                        refreshIntervalSec: opt.value,
                      });
                      setShowRefreshMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-750 ${refreshSec === opt.value ? "text-blue-600 font-medium" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Display mode */}
        {!simpleMode && (
          <Tooltip label={displayTitle}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cycleDisplayMode();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`p-1 rounded flex-shrink-0 ${displayMode !== "auto" ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20" : "text-gray-400 hover:text-gray-600"}`}
            >
              <DisplayIcon size={14} />
            </button>
          </Tooltip>
        )}
        {/* STOMP live toggle */}
        {!simpleMode && onCardUpdate && (
          <Tooltip
            label={
              card.stompEnabled
                ? "Disable live notifications"
                : "Enable live notifications"
            }
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCardUpdate(card.id, { stompEnabled: !card.stompEnabled });
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`p-1 rounded flex-shrink-0 ${card.stompEnabled ? "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Radio size={14} />
            </button>
          </Tooltip>
        )}
        {/* Duplicate */}
        {!simpleMode && onDuplicate && (
          <Tooltip label="Duplicate card">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0"
            >
              <Copy size={14} />
            </button>
          </Tooltip>
        )}
        {/* Maximize/Minimize */}
        {onMaximize && (
          <Tooltip label={isMaximized ? "Minimize card" : "Maximize card"}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0"
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </Tooltip>
        )}
        {/* Alert badge */}
        {!simpleMode && (alertCount ?? 0) > 0 && (
          <Tooltip
            label={`${alertCount} alert${alertCount !== 1 ? "s" : ""} triggered`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAlerts?.();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 text-red-500 rounded flex-shrink-0 relative"
            >
              <Bell size={14} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center">
                {alertCount}
              </span>
            </button>
          </Tooltip>
        )}
        {/* Comments */}
        {!simpleMode && onOpenComments && (
          <Tooltip label="Comments">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenComments();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`p-1 rounded flex-shrink-0 relative ${(commentCount ?? 0) > 0 ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}
            >
              <MessageCircle size={14} />
              {(commentCount ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 text-white text-[8px] rounded-full flex items-center justify-center">
                  {commentCount}
                </span>
              )}
            </button>
          </Tooltip>
        )}
        {/* Open in Grid Board */}
        {!simpleMode && onOpenGridBoard && (
          <Tooltip label="Open in Grid Board">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenGridBoard();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-purple-500 rounded flex-shrink-0"
            >
              <Grid3X3 size={14} />
            </button>
          </Tooltip>
        )}
        {/* Action Panel */}
        {!simpleMode && onOpenAction && (
          <Tooltip label="Open action panel">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAction();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-orange-500 rounded flex-shrink-0"
            >
              <ExternalLink size={14} />
            </button>
          </Tooltip>
        )}
        {/* Card Settings Popover */}
        {!simpleMode && onCardUpdate && (
          <CardSettingsPopover
            label={card.label}
            autoRun={card.autoRun}
            eventLink={card.eventLink}
            displayMode={displayMode}
            compactAuto={card.compactAuto ?? true}
            stompEnabled={card.stompEnabled}
            refreshIntervalSec={card.refreshIntervalSec}
            onUpdate={(partial) => onCardUpdate(card.id, partial)}
          />
        )}
        {/* Remove */}
        {!simpleMode && !isMaximized && (
          <Tooltip label="Remove card">
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
            >
              <X size={16} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/**
 * Wrapper that defers autoExecute until the card scrolls into the viewport.
 * Uses IntersectionObserver (native API, no extra packages).
 */
function LazyQueryCard(props: React.ComponentProps<typeof QueryCard>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only need to trigger once
        }
      },
      { rootMargin: "100px" }, // Pre-load slightly before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full">
      <QueryCard {...props} autoExecute={isVisible && props.autoExecute} />
    </div>
  );
}

export function FilterPresetsBar() {
  const {
    filterPresets,
    saveFilterPreset,
    loadFilterPreset,
    deleteFilterPreset,
    sharedFilters,
  } = useDashboardContext();
  const [showSave, setShowSave] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeFilterCount = Object.values(sharedFilters).filter(Boolean).length;

  const handleSave = () => {
    if (!presetName.trim()) return;
    saveFilterPreset(presetName.trim());
    setPresetName("");
    setShowSave(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Bookmark size={14} />
          Presets
          {filterPresets.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full">
              {filterPresets.length}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute z-50 mt-1 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {filterPresets.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No saved presets yet
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {filterPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <button
                      onClick={() => {
                        loadFilterPreset(preset.id);
                        setOpen(false);
                      }}
                      className="flex-1 text-left text-xs text-gray-700 hover:text-blue-600"
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-[10px] text-gray-400">
                        {Object.keys(preset.filters).length} filters
                      </div>
                    </button>
                    <button
                      onClick={() => deleteFilterPreset(preset.id)}
                      className="p-1 text-gray-300 hover:text-red-500 rounded"
                      title="Delete preset"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-gray-100 px-3 py-2">
              {showSave ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    placeholder="Preset name..."
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    disabled={!presetName.trim()}
                    className="px-2 py-1 text-[10px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowSave(false);
                      setPresetName("");
                    }}
                    className="px-1.5 py-1 text-[10px] text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSave(true)}
                  disabled={activeFilterCount === 0}
                  className="w-full text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline text-center py-0.5"
                >
                  + Save current filters as preset
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {activeFilterCount > 0 && (
        <span className="text-[10px] text-gray-400">
          {activeFilterCount} active filter{activeFilterCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

export function GridDashboard({
  dashboard,
  userName,
  availableQueries,
  onLayoutChange,
  onCardRemove,
  onCardUpdate,
  onCardDuplicate,
  onAddTab,
  onRenameTab,
  onRemoveTab,
  onSetActiveTab,
  onDrillDownInline: _onDrillDownInline,
  alertCounts,
  commentCounts,
  onOpenComments,
  onOpenAlerts,
  stompRefreshTriggers,
  onOpenAction,
}: GridDashboardProps) {
  const router = useRouter();
  const [executionTimes, setExecutionTimes] = useState<
    Record<string, number | null>
  >({});
  const [maximizedCardId, setMaximizedCardId] = useState<string | null>(null);
  useBodyScrollLock(!!maximizedCardId);

  const handleExecutionInfo = useCallback(
    (cardId: string, ms: number | null) => {
      setExecutionTimes((prev) => ({ ...prev, [cardId]: ms }));
    },
    [],
  );

  const gridLayouts: GridItem[] = dashboard.layouts.map((l) => ({
    ...l,
    minW: l.minW ?? 3,
    minH: l.minH ?? 4,
  }));

  const handleLayoutChange = useCallback(
    (layout: GridItem[]) => {
      const mapped: CardLayout[] = layout.map((l) => ({
        i: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        minW: l.minW,
        minH: l.minH,
      }));
      onLayoutChange(mapped);
    },
    [onLayoutChange],
  );

  if (dashboard.cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <LayoutGrid
          size={64}
          className="mb-4 text-gray-300"
          strokeWidth={1.5}
        />
        <p className="text-lg font-medium">No cards yet</p>
        <p className="text-sm mt-1">Add query cards to build your dashboard</p>
      </div>
    );
  }

  const simpleMode = dashboard.simpleMode;
  const globalRefresh = dashboard.globalRefreshSec || 0;

  // Tab filtering
  const hasTabs = (dashboard.tabs?.length ?? 0) > 0;
  const activeTab = hasTabs
    ? dashboard.tabs!.find((t) => t.id === dashboard.activeTabId) ||
      dashboard.tabs![0]
    : null;
  const activeTabCardIds = activeTab ? new Set(activeTab.cardIds) : null;
  const visibleCards = activeTabCardIds
    ? dashboard.cards.filter((c) => activeTabCardIds.has(c.id))
    : dashboard.cards;
  const visibleCardIds = new Set(visibleCards.map((c) => c.id));
  const visibleLayouts = gridLayouts.filter((l) => visibleCardIds.has(l.i));

  // Render a single card (shared between grid and maximized overlay)
  const renderCardContent = (card: DashboardCard, isMaximized: boolean) => {
    const queryInfo = availableQueries?.find((q) => q.name === card.queryName);
    // card.refreshIntervalSec === 0 means explicitly OFF (don't fall through to globalRefresh)
    const effectiveRefresh =
      card.refreshIntervalSec !== undefined && card.refreshIntervalSec !== null
        ? card.refreshIntervalSec > 0
          ? card.refreshIntervalSec
          : undefined
        : globalRefresh || undefined;
    return (
      <>
        <div className="flex-shrink-0">
          <CardHeader
            card={card}
            executionMs={executionTimes[card.id] ?? null}
            onRemove={() => onCardRemove(card.id)}
            onCardUpdate={onCardUpdate}
            onDuplicate={
              onCardDuplicate ? () => onCardDuplicate(card.id) : undefined
            }
            onMaximize={() => setMaximizedCardId(isMaximized ? null : card.id)}
            isMaximized={isMaximized}
            simpleMode={simpleMode}
            alertCount={alertCounts?.[card.id]}
            commentCount={commentCounts?.[card.id]}
            onOpenComments={
              onOpenComments ? () => onOpenComments(card.id) : undefined
            }
            onOpenAlerts={
              onOpenAlerts ? () => onOpenAlerts(card.id) : undefined
            }
            onOpenGridBoard={() => {
              const filters = Object.entries(card.defaultFilters)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join("&");
              router.push(
                `/gridboard?query=${card.queryName}${filters ? `&${filters}` : ""}`,
              );
            }}
            onOpenAction={
              onOpenAction &&
              (queryInfo?.actionConfig?.url ||
                process.env.NEXT_PUBLIC_ACTION_PANEL_URL)
                ? () => onOpenAction(card.id)
                : undefined
            }
          />
        </div>
        <div
          className="flex-1 overflow-y-auto grid-item-scroll"
          style={{ scrollbarWidth: "none" as const }}
        >
          <LazyQueryCard
            queryName={card.queryName}
            label={card.label}
            groupId={card.groupId}
            userName={userName}
            defaultFilters={card.defaultFilters}
            queryFilters={queryInfo?.filters}
            autoExecute={simpleMode ? true : card.autoRun}
            cardId={card.id}
            eventLinkConfig={simpleMode ? undefined : card.eventLink}
            hideHeader
            readOnly={simpleMode}
            displayMode={card.displayMode}
            compactAuto={card.compactAuto}
            refreshIntervalSec={effectiveRefresh}
            refreshTrigger={stompRefreshTriggers?.[card.id]}
            onExecutionInfo={(ms) => handleExecutionInfo(card.id, ms)}
            onFilterChange={
              simpleMode
                ? undefined
                : (filters) =>
                    onCardUpdate(card.id, { defaultFilters: filters })
            }
            drillDownConfig={simpleMode ? undefined : queryInfo?.drillDown}
          />
        </div>
      </>
    );
  };

  // Maximized card overlay
  const maximizedCard = maximizedCardId
    ? dashboard.cards.find((c) => c.id === maximizedCardId)
    : null;

  return (
    <div>
      {/* Tab bar */}
      {hasTabs && (
        <DashboardTabBar
          tabs={dashboard.tabs!}
          activeTabId={activeTab?.id}
          onSelectTab={(tabId) => onSetActiveTab?.(tabId)}
          onAddTab={(name) => onAddTab?.(name)}
          onRenameTab={(tabId, name) => onRenameTab?.(tabId, name)}
          onRemoveTab={(tabId) => onRemoveTab?.(tabId)}
          readOnly={simpleMode}
        />
      )}

      {/* Maximized overlay */}
      {maximizedCard && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col w-full overflow-hidden">
            {renderCardContent(maximizedCard, true)}
          </div>
        </div>
      )}

      <div>
        <SimpleGrid
          layouts={visibleLayouts}
          cols={12}
          rowHeight={80}
          gap={16}
          readOnly={simpleMode}
          onLayoutChange={handleLayoutChange}
        >
          {visibleCards.map((card) => (
            <div
              key={card.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full"
            >
              {renderCardContent(card, false)}
            </div>
          ))}
        </SimpleGrid>
      </div>
    </div>
  );
}
