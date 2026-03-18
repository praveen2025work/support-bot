"use client";

import { useCallback, useState } from "react";
import { SimpleGrid, type GridItem } from "./SimpleGrid";
import { QueryCard } from "./QueryCard";
import type { Dashboard, DashboardCard, CardLayout } from "@/types/dashboard";

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
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
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
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
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
        <svg
          className="w-16 h-16 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
          />
        </svg>
        <p className="text-lg font-medium">No cards yet</p>
        <p className="text-sm mt-1">Add query cards to build your dashboard</p>
      </div>
    );
  }

  return (
    <div>
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
                  <QueryCard
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
