"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SimpleGrid, type GridItem } from "./SimpleGrid";
import { QueryCard } from "./QueryCard";
import { useDashboardContext } from "@/contexts/DashboardContext";
import type { Dashboard, DashboardCard, CardLayout } from "@/types/dashboard";
import { GripVertical, X, LayoutGrid, Bookmark } from "lucide-react";

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
  }>;
  onLayoutChange: (layouts: CardLayout[]) => void;
  onCardRemove: (cardId: string) => void;
  onCardUpdate: (cardId: string, partial: Partial<DashboardCard>) => void;
}

function CardHeader({
  card,
  executionMs,
  onRemove,
}: {
  card: DashboardCard;
  executionMs: number | null;
  onRemove: () => void;
}) {
  return (
    <div className="card-drag-handle flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-2 min-w-0">
        <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {card.label}
        </span>
        {card.autoRun && (
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
            Auto
          </span>
        )}
        {executionMs !== null && (
          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {executionMs}ms
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 rounded"
          title="Remove card"
        >
          <X size={16} />
        </button>
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

function FilterPresetsBar() {
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
    <div className="flex items-center gap-2 mb-3 px-1">
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
}: GridDashboardProps) {
  const [executionTimes, setExecutionTimes] = useState<
    Record<string, number | null>
  >({});

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

  return (
    <div>
      <FilterPresetsBar />
      <div>
        <SimpleGrid
          layouts={gridLayouts}
          cols={12}
          rowHeight={80}
          gap={16}
          onLayoutChange={handleLayoutChange}
        >
          {dashboard.cards.map((card) => {
            const queryInfo = availableQueries?.find(
              (q) => q.name === card.queryName,
            );
            return (
              <div
                key={card.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full"
              >
                <div className="flex-shrink-0">
                  <CardHeader
                    card={card}
                    executionMs={executionTimes[card.id] ?? null}
                    onRemove={() => onCardRemove(card.id)}
                  />
                </div>
                {/* Card content — scrollable with hidden scrollbar */}
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
                    autoExecute={card.autoRun}
                    cardId={card.id}
                    eventLinkConfig={card.eventLink}
                    hideHeader
                    onExecutionInfo={(ms) => handleExecutionInfo(card.id, ms)}
                    onFilterChange={(filters) =>
                      onCardUpdate(card.id, { defaultFilters: filters })
                    }
                    drillDownConfig={queryInfo?.drillDown}
                  />
                </div>
              </div>
            );
          })}
        </SimpleGrid>
      </div>
    </div>
  );
}
