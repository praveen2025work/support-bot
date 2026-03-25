"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { useMultiDashboard } from "@/hooks/useMultiDashboard";
import { DashboardHeader } from "./DashboardHeader";
import { FavoritesPanel } from "./FavoritesPanel";
import { RecentQueriesPanel } from "./RecentQueriesPanel";
import { AddFavoriteModal } from "./AddFavoriteModal";
import { AddCardModal } from "./AddCardModal";
import { DashboardSelector } from "./DashboardSelector";
import { SearchBar } from "./SearchBar";
import {
  DashboardProvider,
  useDashboardContext,
} from "@/contexts/DashboardContext";
import type { QueryInfo } from "@/types/dashboard";
import { X, Monitor, Settings2, CalendarClock } from "lucide-react";
import { useStompNotifications } from "@/hooks/useStompNotifications";
import { ShareModal } from "./ShareModal";
import { ScheduleModal, type ScheduleConfig } from "./ScheduleModal";
import { ActionPanel, type ActionPanelConfig } from "./ActionPanel";
import { FilterPresetsBar } from "./GridDashboard";
import { ParameterBar } from "./ParameterBar";
import { KpiCard } from "./KpiCard";
import { DashboardSettingsModal } from "./DashboardSettingsModal";
import { SlidersHorizontal } from "lucide-react";

const GridDashboard = lazy(() =>
  import("./GridDashboard").then((m) => ({ default: m.GridDashboard })),
);

interface GroupInfo {
  id: string;
  name: string;
  description: string;
}

export function DashboardShell({
  userId,
  userName,
  initialGroupId,
  dashboardId,
}: {
  userId?: string;
  userName?: string;
  initialGroupId: string;
  dashboardId?: string;
}) {
  const [groupId, setGroupId] = useState(initialGroupId);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [showAddFavorite, setShowAddFavorite] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [availableQueries, setAvailableQueries] = useState<QueryInfo[]>([]);
  const dashboard = useDashboard(userId);
  const multiDashboard = useMultiDashboard(userId);

  // Set active dashboard from URL param
  useEffect(() => {
    if (dashboardId && multiDashboard.dashboards.length > 0) {
      multiDashboard.setActiveDashboard(dashboardId);
    }
  }, [dashboardId, multiDashboard.dashboards.length]);

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => setGroups(data.groups || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/queries?groupId=${encodeURIComponent(groupId)}`)
      .then((res) => res.json())
      .then((data) => setAvailableQueries(data.queries || []))
      .catch(() => {});
  }, [groupId]);

  const hasFavorites = (dashboard.preferences?.favorites.length ?? 0) > 0;
  const hasRecents = (dashboard.preferences?.recentQueries.length ?? 0) > 0;
  const isEmpty = !hasFavorites && !hasRecents;

  const isGridView = !!multiDashboard.activeDashboard;

  return (
    <DashboardProvider>
      <DashboardShellInner
        userName={userName}
        userId={userId}
        groupId={groupId}
        groups={groups}
        availableQueries={availableQueries}
        dashboard={dashboard}
        multiDashboard={multiDashboard}
        isEmpty={isEmpty}
        hasFavorites={hasFavorites}
        hasRecents={hasRecents}
        showAddFavorite={showAddFavorite}
        setShowAddFavorite={setShowAddFavorite}
        showAddCard={showAddCard}
        setShowAddCard={setShowAddCard}
        setGroupId={setGroupId}
        isGridView={isGridView}
      />
    </DashboardProvider>
  );
}

function DashboardShellInner({
  userName,
  userId,
  groupId,
  groups,
  availableQueries,
  dashboard,
  multiDashboard,
  isEmpty,
  hasFavorites,
  hasRecents,
  showAddFavorite,
  setShowAddFavorite,
  showAddCard,
  setShowAddCard,
  setGroupId,
  isGridView,
}: {
  userName?: string;
  userId?: string;
  groupId: string;
  groups: GroupInfo[];
  availableQueries: QueryInfo[];
  dashboard: ReturnType<typeof useDashboard>;
  multiDashboard: ReturnType<typeof useMultiDashboard>;
  isEmpty: boolean;
  hasFavorites: boolean;
  hasRecents: boolean;
  showAddFavorite: boolean;
  setShowAddFavorite: (v: boolean) => void;
  showAddCard: boolean;
  setShowAddCard: (v: boolean) => void;
  setGroupId: (v: string) => void;
  isGridView: boolean;
}) {
  const {
    businessDate,
    setBusinessDate,
    activeEvents,
    clearAllEvents,
    linkedSelection,
    clearLinkedSelection,
    sharedFilters,
    setSharedFilter,
    clearSharedFilters,
  } = useDashboardContext();
  const [shareTargetId, setShareTargetId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showDashSettings, setShowDashSettings] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);

  // STOMP WebSocket for real-time dashboard card refresh
  const stompBrokerUrl =
    typeof window !== "undefined"
      ? ((window as unknown as Record<string, unknown>).__STOMP_BROKER_URL__ as
          | string
          | undefined)
      : undefined;
  const dashboardStompEnabled =
    multiDashboard.activeDashboard?.stompEnabled ?? false;
  const stompEnabledCards = (
    multiDashboard.activeDashboard?.cards || []
  ).filter((c) => c.stompEnabled);
  const { refreshTriggers: stompRefreshTriggers } = useStompNotifications({
    brokerUrl: stompBrokerUrl || process.env.NEXT_PUBLIC_STOMP_BROKER_URL,
    destination:
      process.env.NEXT_PUBLIC_STOMP_DESTINATION || "/topic/notifications",
    cards: stompEnabledCards,
    enabled: !!multiDashboard.activeDashboard && dashboardStompEnabled,
  });

  // Action Panel state
  const [actionPanelConfig, setActionPanelConfig] =
    useState<ActionPanelConfig | null>(null);

  // Feature states
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [kpiValues, setKpiValues] = useState<
    Record<
      string,
      { value: number; previousValue?: number; sparkline?: number[] }
    >
  >({});

  // State for auto-populated parameter options (from query data)
  const [paramOptions, setParamOptions] = useState<Record<string, string[]>>(
    {},
  );

  // Helper: extract rows from a chat API response
  const extractRows = (
    data: Record<string, unknown>,
  ): Record<string, unknown>[] => {
    const rc = data?.richContent as Record<string, unknown> | undefined;
    if (!rc?.data) return [];
    const rcData = rc.data as Record<string, unknown>;
    if (rc.type === "csv_table")
      return (rcData.rows as Record<string, unknown>[]) ?? [];
    if (rc.type === "query_result")
      return (rcData.data as Record<string, unknown>[]) ?? [];
    return [];
  };

  // Fetch parameter dropdown options ONCE with unfiltered data (stable options)
  useEffect(() => {
    const params = multiDashboard.activeDashboard?.parameters;
    if (!params || params.length === 0) return;
    const paramQueryNames = Array.from(
      new Set(
        params
          .filter((p) => p.queryName && p.type === "select")
          .map((p) => p.queryName!),
      ),
    );
    if (paramQueryNames.length === 0) return;

    for (const queryName of paramQueryNames) {
      const sessionId = `param-opts-${multiDashboard.activeDashboard?.id ?? "d"}-${queryName}-${Date.now()}`;
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `run ${queryName}`,
          sessionId,
          groupId,
          explicitFilters: {},
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const rows = extractRows(data);
          if (rows.length === 0) return;
          const paramsForQuery = params.filter(
            (p) => p.queryName === queryName && p.type === "select",
          );
          for (const p of paramsForQuery) {
            const colKey = p.key || p.name;
            const distinct = Array.from(
              new Set(
                rows
                  .map((r) => String(r[colKey] ?? ""))
                  .filter((v) => v !== ""),
              ),
            ).sort();
            setParamOptions((prev) => ({ ...prev, [colKey]: distinct }));
          }
        })
        .catch(() => {});
    }
    // Only re-run when dashboard changes, NOT when filters change
  }, [
    multiDashboard.activeDashboard?.parameters,
    multiDashboard.activeDashboard?.id,
    groupId,
  ]);

  // Fetch KPI card data — re-runs when sharedFilters change (Apply/Reset)
  useEffect(() => {
    const kpiCards = multiDashboard.activeDashboard?.kpiCards;
    if (!kpiCards || kpiCards.length === 0) return;
    const kpiQueryNames = Array.from(new Set(kpiCards.map((k) => k.queryName)));

    for (const queryName of kpiQueryNames) {
      const sessionId = `kpi-${multiDashboard.activeDashboard?.id ?? "d"}-${queryName}-${Date.now()}`;
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `run ${queryName}`,
          sessionId,
          groupId,
          explicitFilters:
            Object.keys(sharedFilters).length > 0 ? sharedFilters : {},
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const rows = extractRows(data);
          if (rows.length === 0) return;
          const kpisForQuery = kpiCards.filter(
            (k) => k.queryName === queryName,
          );
          for (const kpi of kpisForQuery) {
            let value: number;
            if (kpi.groupByColumn) {
              if (kpi.filterValue) {
                value = rows.filter(
                  (r) =>
                    String(r[kpi.groupByColumn!]).toLowerCase() ===
                    kpi.filterValue!.toLowerCase(),
                ).length;
              } else {
                value = rows.length;
              }
            } else {
              value = Number(rows[0][kpi.valueField]) || 0;
            }
            const previousValue = kpi.previousValueField
              ? Number(rows[0][kpi.previousValueField]) || undefined
              : undefined;
            setKpiValues((prev) => ({
              ...prev,
              [kpi.title]: { value, previousValue },
            }));
          }
        })
        .catch(() => {});
    }
  }, [
    multiDashboard.activeDashboard?.kpiCards,
    multiDashboard.activeDashboard?.id,
    groupId,
    sharedFilters,
  ]);

  // Sync param values when dashboard parameters change (dashboard switch).
  // Use a key to detect when the parameter set actually changes.
  const paramNamesKey = useMemo(
    () =>
      (multiDashboard.activeDashboard?.parameters ?? [])
        .map((p) => p.name)
        .join(","),
    [multiDashboard.activeDashboard?.parameters],
  );
  const [lastSyncedParamKey, setLastSyncedParamKey] = useState("");
  if (paramNamesKey !== lastSyncedParamKey) {
    setLastSyncedParamKey(paramNamesKey);
    const params = multiDashboard.activeDashboard?.parameters;
    if (params && params.length > 0) {
      const defaults: Record<string, string> = {};
      for (const p of params) {
        defaults[p.name] = paramValues[p.name] ?? p.defaultValue;
      }
      setParamValues(defaults);
    }
  }

  const handleOpenAction = (cardId: string) => {
    const card = multiDashboard.activeDashboard?.cards.find(
      (c) => c.id === cardId,
    );
    if (!card) return;
    // Look up query-level action config first, then fall back to env var
    const queryInfo = availableQueries.find((q) => q.name === card.queryName);
    const qActionConfig = queryInfo?.actionConfig;
    const actionBaseUrl =
      qActionConfig?.url ||
      ((card as unknown as Record<string, unknown>).actionUrl as
        | string
        | undefined) ||
      process.env.NEXT_PUBLIC_ACTION_PANEL_URL;
    if (!actionBaseUrl) return;

    // Build context with contextFields from query config
    const contextFields: Record<string, string> = {};
    if (qActionConfig?.contextFields) {
      for (const field of qActionConfig.contextFields) {
        if (card.defaultFilters[field]) {
          contextFields[field] = card.defaultFilters[field];
        }
      }
    }

    setActionPanelConfig({
      url: actionBaseUrl,
      title: qActionConfig?.label || `Action: ${card.label}`,
      context: {
        cardId: card.id,
        queryName: card.queryName,
        filters: card.defaultFilters || {},
        label: card.label,
        dashboardId: multiDashboard.activeDashboard?.id,
        userId,
        extra: {
          ...(qActionConfig?.metadata || {}),
          ...(Object.keys(contextFields).length > 0 ? { contextFields } : {}),
        },
      },
    });
  };

  const handleActionComplete = (cardIds: string[]) => {
    // Trigger refresh on specified cards by re-fetching the dashboard
    if (cardIds.length > 0) {
      multiDashboard.fetchDashboards();
    }
    setActionPanelConfig(null);
  };

  // Parameter change handler
  const handleParamChange = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleDashboardSelect = (id: string) => {
    multiDashboard.setActiveDashboard(id);
    // Update URL without full reload
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.pushState({}, "", url.toString());
  };

  const handleCreateDashboard = async (name: string) => {
    const d = await multiDashboard.createDashboard(name);
    if (d) {
      const url = new URL(window.location.href);
      url.searchParams.set("id", d.id);
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleDeleteDashboard = async (id: string) => {
    await multiDashboard.deleteDashboard(id);
    if (multiDashboard.activeDashboard?.id === id) {
      const url = new URL(window.location.href);
      url.searchParams.delete("id");
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleExport = async (id: string) => {
    const data = await multiDashboard.exportDashboard(id);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-${data.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Read-only when simple mode is on OR user only has view permission on a shared dashboard
  const isViewOnly = multiDashboard.activePermission === "view";
  const isReadOnly = !!multiDashboard.activeDashboard?.simpleMode || isViewOnly;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userName={userName}
        groupId={groupId}
        groups={groups}
        onGroupChange={setGroupId}
        onAddFavorite={
          isGridView && isReadOnly
            ? undefined
            : () =>
                isGridView ? setShowAddCard(true) : setShowAddFavorite(true)
        }
        addLabel={
          isGridView && isReadOnly
            ? undefined
            : isGridView
              ? "+ Add Card"
              : "+ Add Favorite"
        }
      />

      <div className="px-6 pt-4 pb-2 flex flex-wrap items-center gap-3">
        {/* Dashboard selector */}
        <DashboardSelector
          dashboards={multiDashboard.dashboards}
          activeDashboardId={multiDashboard.activeDashboard?.id}
          onSelect={handleDashboardSelect}
          onCreate={handleCreateDashboard}
          onDelete={handleDeleteDashboard}
          onRename={(id, name) => multiDashboard.renameDashboard(id, name)}
          onExport={handleExport}
          onImport={(data) => multiDashboard.importDashboard(data)}
          onShare={(id) => setShareTargetId(id)}
          sharedDashboards={multiDashboard.sharedDashboards}
        />

        {/* Simple mode toggle — owner only */}
        {isGridView && multiDashboard.activeDashboard && !isViewOnly && (
          <button
            onClick={() =>
              multiDashboard.toggleSimpleMode(
                multiDashboard.activeDashboard!.id,
              )
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              multiDashboard.activeDashboard.simpleMode
                ? "bg-green-50 text-green-700 border-green-300"
                : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"
            }`}
            title={
              multiDashboard.activeDashboard.simpleMode
                ? "Switch to interactive mode"
                : "Switch to simple/read-only mode"
            }
          >
            {multiDashboard.activeDashboard.simpleMode ? (
              <>
                <Monitor size={14} />
                Simple
              </>
            ) : (
              <>
                <Settings2 size={14} />
                Interactive
              </>
            )}
          </button>
        )}

        {/* View-only indicator for shared dashboards */}
        {isGridView && isViewOnly && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
            View Only
          </span>
        )}

        {/* Schedule Reports */}
        {isGridView && multiDashboard.activeDashboard && !isReadOnly && (
          <button
            onClick={() => setShowSchedule(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Scheduled Reports"
          >
            <CalendarClock size={14} />
            Schedule
          </button>
        )}

        {/* Dashboard Settings — KPI tiles & parameters */}
        {isGridView && multiDashboard.activeDashboard && !isReadOnly && (
          <button
            onClick={() => setShowDashSettings(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Configure KPI tiles and parameters"
          >
            <SlidersHorizontal size={14} />
            Settings
          </button>
        )}

        <div className="flex-1 min-w-[200px]">
          <SearchBar
            groupId={groupId}
            onSelect={(queryName) => {
              window.location.href = `/?q=run+${encodeURIComponent(queryName)}`;
            }}
          />
        </div>

        {/* Filter Presets — inline next to search */}
        {isGridView && multiDashboard.activeDashboard && !isReadOnly && (
          <FilterPresetsBar />
        )}

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">
            Business Date:
          </label>
          <input
            type="date"
            value={businessDate || ""}
            onChange={(e) => setBusinessDate(e.target.value || null)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {businessDate && (
            <button
              onClick={() => setBusinessDate(null)}
              className="text-[10px] text-gray-400 hover:text-gray-600"
              title="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>
        {activeEvents.length > 0 && !isReadOnly && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeEvents.map((evt) => (
              <span
                key={`${evt.column}-${evt.value}`}
                className="inline-flex items-center gap-1 rounded-full bg-yellow-50 border border-yellow-300 px-2.5 py-1 text-[11px] text-yellow-700"
              >
                {evt.column}={evt.value}
              </span>
            ))}
            <button
              onClick={clearAllEvents}
              className="text-[11px] text-yellow-600 hover:text-yellow-800 underline"
            >
              Clear all
            </button>
          </div>
        )}
        {Object.keys(sharedFilters).length > 0 && !isReadOnly && (
          <button
            onClick={clearSharedFilters}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] text-blue-600 hover:bg-blue-100 transition-colors"
          >
            Clear shared filters ({Object.keys(sharedFilters).length})
            <X size={12} />
          </button>
        )}
      </div>

      {/* Parameter Bar — global dashboard filters */}
      {isGridView &&
        multiDashboard.activeDashboard?.parameters &&
        multiDashboard.activeDashboard.parameters.length > 0 && (
          <div className="px-6 pt-2">
            <ParameterBar
              parameters={multiDashboard.activeDashboard.parameters.map((p) => {
                const colKey = p.key || p.name;
                const dynamicOpts = paramOptions[colKey];
                if (dynamicOpts && p.type === "select" && !p.options?.length) {
                  return { ...p, options: dynamicOpts };
                }
                return p;
              })}
              values={paramValues}
              onChange={handleParamChange}
              onApply={() => {
                // Inject param values as shared filters so all cards pick them up
                clearSharedFilters();
                for (const [key, val] of Object.entries(paramValues)) {
                  if (val) {
                    setSharedFilter(key, val);
                  }
                }
              }}
              onReset={() => {
                const defaults: Record<string, string> = {};
                for (const p of multiDashboard.activeDashboard?.parameters ??
                  []) {
                  defaults[p.name] = p.defaultValue;
                }
                setParamValues(defaults);
                // Clear shared filters so all cards and KPIs reset to unfiltered
                clearSharedFilters();
              }}
            />
          </div>
        )}

      {/* KPI Scorecard Cards row */}
      {isGridView &&
        multiDashboard.activeDashboard?.kpiCards &&
        multiDashboard.activeDashboard.kpiCards.length > 0 && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {multiDashboard.activeDashboard.kpiCards.map((kpi, i) => {
                const kpiData = kpiValues[kpi.title];
                return (
                  <KpiCard
                    key={kpi.title + i}
                    title={kpi.title}
                    value={kpiData?.value ?? 0}
                    previousValue={kpiData?.previousValue}
                    sparklineData={kpiData?.sparkline}
                    prefix={kpi.prefix}
                    unit={kpi.unit}
                    format={kpi.format}
                    thresholds={kpi.thresholds}
                    trendLabel={kpi.trendLabel}
                    color={kpi.color}
                  />
                );
              })}
            </div>
          </div>
        )}

      <div className="px-6 py-6 space-y-6">
        {isGridView && multiDashboard.activeDashboard ? (
          /* Grid Dashboard View */
          <Suspense
            fallback={
              <div className="text-center py-12 text-gray-400 text-sm">
                Loading grid...
              </div>
            }
          >
            <GridDashboard
              dashboard={
                isViewOnly
                  ? { ...multiDashboard.activeDashboard, simpleMode: true }
                  : multiDashboard.activeDashboard
              }
              userName={userId}
              availableQueries={availableQueries}
              onLayoutChange={(layouts) =>
                multiDashboard.updateLayouts(
                  multiDashboard.activeDashboard!.id,
                  layouts,
                )
              }
              onCardRemove={(cardId) =>
                multiDashboard.removeCard(
                  multiDashboard.activeDashboard!.id,
                  cardId,
                )
              }
              onCardUpdate={(cardId, partial) =>
                multiDashboard.updateCard(
                  multiDashboard.activeDashboard!.id,
                  cardId,
                  partial,
                )
              }
              onCardDuplicate={(cardId) =>
                multiDashboard.duplicateCard(
                  multiDashboard.activeDashboard!.id,
                  cardId,
                )
              }
              onAddTab={(name) =>
                multiDashboard.addTab(multiDashboard.activeDashboard!.id, name)
              }
              onRenameTab={(tabId, name) =>
                multiDashboard.updateTab(
                  multiDashboard.activeDashboard!.id,
                  tabId,
                  name,
                )
              }
              onRemoveTab={(tabId) =>
                multiDashboard.removeTab(
                  multiDashboard.activeDashboard!.id,
                  tabId,
                )
              }
              onSetActiveTab={(tabId) =>
                multiDashboard.setActiveTab(
                  multiDashboard.activeDashboard!.id,
                  tabId,
                )
              }
              onDrillDownInline={(queryName, filter, value, gId) =>
                multiDashboard.addCard(multiDashboard.activeDashboard!.id, {
                  queryName,
                  groupId: gId,
                  label: `${queryName} (${filter}=${value})`,
                  defaultFilters: { [filter]: value },
                  autoRun: true,
                  eventLink: { mode: "auto" },
                })
              }
              stompRefreshTriggers={stompRefreshTriggers}
              onOpenAction={handleOpenAction}
            />
            {multiDashboard.activeDashboard.cards.length === 0 &&
              !isReadOnly && (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Add a Card
                  </button>
                  <button
                    onClick={() =>
                      multiDashboard.migrateFavorites(
                        multiDashboard.activeDashboard!.id,
                      )
                    }
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-100"
                  >
                    Import from Favorites
                  </button>
                </div>
              )}
          </Suspense>
        ) : (
          /* Legacy Favorites/Recents View */
          <>
            {dashboard.loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Loading your dashboard...
              </div>
            ) : isEmpty ? (
              <EmptyState
                onAddFavorite={() => setShowAddFavorite(true)}
                onCreateDashboard={() => handleCreateDashboard("My Dashboard")}
              />
            ) : (
              <>
                {hasFavorites && (
                  <FavoritesPanel
                    favorites={dashboard.preferences!.favorites}
                    groupId={groupId}
                    userName={userId}
                    availableQueries={availableQueries}
                    onRemove={dashboard.removeFavorite}
                    onSaveFilters={dashboard.updateFavoriteFilters}
                  />
                )}
                {hasRecents && (
                  <RecentQueriesPanel
                    recents={dashboard.preferences!.recentQueries}
                    onClear={dashboard.clearRecents}
                    onAddFavorite={dashboard.addFavorite}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      {showAddFavorite && (
        <AddFavoriteModal
          queries={availableQueries}
          groupId={groupId}
          onAdd={async (item) => {
            await dashboard.addFavorite(item);
            setShowAddFavorite(false);
          }}
          onClose={() => setShowAddFavorite(false)}
        />
      )}

      {showAddCard && multiDashboard.activeDashboard && (
        <AddCardModal
          isOpen={showAddCard}
          onClose={() => setShowAddCard(false)}
          availableQueries={availableQueries}
          groupId={groupId}
          onAdd={async (config) => {
            await multiDashboard.addCard(
              multiDashboard.activeDashboard!.id,
              config,
            );
          }}
        />
      )}

      {/* Share Modal */}
      {shareTargetId && multiDashboard.activeDashboard && (
        <ShareModal
          isOpen={!!shareTargetId}
          onClose={() => setShareTargetId(null)}
          sharing={
            multiDashboard.dashboards.find((d) => d.id === shareTargetId)
              ?.sharing
          }
          ownerId={userId || "unknown"}
          onSave={(sharing) => {
            multiDashboard.updateSharing(shareTargetId, sharing);
          }}
        />
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        schedules={schedules}
        dashboardId={multiDashboard.activeDashboard?.id || ""}
        onSave={setSchedules}
      />

      {/* Action Panel — right-side slide-over with external app iframe */}
      <ActionPanel
        config={actionPanelConfig}
        onClose={() => setActionPanelConfig(null)}
        onActionComplete={handleActionComplete}
      />

      {/* Dashboard Settings — KPI tiles & parameters */}
      <DashboardSettingsModal
        isOpen={showDashSettings}
        onClose={() => setShowDashSettings(false)}
        kpiCards={multiDashboard.activeDashboard?.kpiCards ?? []}
        parameters={multiDashboard.activeDashboard?.parameters ?? []}
        availableQueries={availableQueries}
        onSave={(data) => {
          if (multiDashboard.activeDashboard) {
            multiDashboard.updateDashboardMeta(
              multiDashboard.activeDashboard.id,
              data,
            );
          }
        }}
      />
    </div>
  );
}

function EmptyState({
  onAddFavorite,
  onCreateDashboard,
}: {
  onAddFavorite: () => void;
  onCreateDashboard?: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-4">&#128202;</div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        Your Dashboard is Empty
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        Add favorite queries for quick access, create a grid dashboard, or start
        chatting to build your recent history.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onAddFavorite}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add a Favorite
        </button>
        {onCreateDashboard && (
          <button
            onClick={onCreateDashboard}
            className="px-4 py-2 border border-blue-300 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors"
          >
            Create Dashboard
          </button>
        )}
        <Link
          href="/"
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition-colors"
        >
          Open Chat
        </Link>
      </div>
    </div>
  );
}
