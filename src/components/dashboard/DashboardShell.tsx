"use client";

import { useState, useEffect, lazy, Suspense } from "react";
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
import type {
  QueryInfo,
  DashboardTheme,
  CalculatedField,
} from "@/types/dashboard";
import {
  X,
  Monitor,
  Settings2,
  CalendarClock,
  Palette,
  Calculator,
} from "lucide-react";
import { useStompNotifications } from "@/hooks/useStompNotifications";
import { ShareModal } from "./ShareModal";
import { ScheduleModal, type ScheduleConfig } from "./ScheduleModal";
import { ActionPanel, type ActionPanelConfig } from "./ActionPanel";
import { FilterPresetsBar } from "./GridDashboard";
import { NlqBar } from "./NlqBar";
import { ParameterBar } from "./ParameterBar";
import { ThemeEditor } from "./ThemeEditor";
import { CalculatedFieldEditor } from "./CalculatedFieldEditor";
import { KpiCard } from "./KpiCard";

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
    clearSharedFilters,
  } = useDashboardContext();
  const [shareTargetId, setShareTargetId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
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

  // New feature states
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showCalcFields, setShowCalcFields] = useState(false);
  const [nlqLoading, setNlqLoading] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

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

  // NLQ handler: send natural language query to engine, add result as a card
  const handleNlqSubmit = async (query: string) => {
    if (!multiDashboard.activeDashboard) return;
    setNlqLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, groupId }),
      });
      const data = await res.json();
      // If the engine identified a query to run, add it as a card
      if (data.queryName) {
        await multiDashboard.addCard(multiDashboard.activeDashboard.id, {
          queryName: data.queryName,
          groupId,
          label: query,
          defaultFilters: data.filters || {},
          autoRun: true,
          eventLink: { mode: "auto" },
        });
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setNlqLoading(false);
    }
  };

  // Parameter change handler
  const handleParamChange = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  // Theme change handler
  const handleThemeChange = (_theme: DashboardTheme) => {
    if (!multiDashboard.activeDashboard) return;
    // Persist via updateDashboard if available, otherwise just local
    // For now, update locally — theme will be persisted with dashboard
  };

  // Calculated fields change handler
  const handleCalcFieldsSave = (_fields: CalculatedField[]) => {
    // Persist calculated fields on the dashboard
    setShowCalcFields(false);
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

        {/* Theme Editor toggle */}
        {isGridView && multiDashboard.activeDashboard && !isReadOnly && (
          <button
            onClick={() => setShowThemeEditor((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showThemeEditor
                ? "bg-purple-50 text-purple-700 border-purple-300"
                : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"
            }`}
            title="Theme Editor"
          >
            <Palette size={14} />
            Theme
          </button>
        )}

        {/* Calculated Fields */}
        {isGridView && multiDashboard.activeDashboard && !isReadOnly && (
          <button
            onClick={() => setShowCalcFields(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Calculated Fields"
          >
            <Calculator size={14} />
            Calc Fields
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

      {/* NLQ Bar — natural language query bar above dashboard */}
      {isGridView && multiDashboard.activeDashboard && !isReadOnly && (
        <div className="px-6 pt-4">
          <NlqBar
            onSubmit={handleNlqSubmit}
            isLoading={nlqLoading}
            placeholder="Ask a question to add a card to your dashboard..."
            suggestions={[
              "Show monthly revenue",
              "Top 10 customers by sales",
              "Revenue vs expenses trend",
            ]}
          />
        </div>
      )}

      {/* Parameter Bar — global dashboard filters */}
      {isGridView &&
        multiDashboard.activeDashboard?.parameters &&
        multiDashboard.activeDashboard.parameters.length > 0 && (
          <div className="px-6 pt-2">
            <ParameterBar
              parameters={multiDashboard.activeDashboard.parameters}
              values={paramValues}
              onChange={handleParamChange}
              onApply={() => {
                // Trigger re-fetch on all cards with new param values
                multiDashboard.fetchDashboards();
              }}
              onReset={() => {
                const defaults: Record<string, string> = {};
                for (const p of multiDashboard.activeDashboard?.parameters ??
                  []) {
                  defaults[p.name] = p.defaultValue;
                }
                setParamValues(defaults);
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
              {multiDashboard.activeDashboard.kpiCards.map((kpi, i) => (
                <KpiCard
                  key={kpi.title + i}
                  title={kpi.title}
                  value={0}
                  prefix={kpi.prefix}
                  unit={kpi.unit}
                  format={kpi.format}
                  thresholds={kpi.thresholds}
                  trendLabel={kpi.trendLabel}
                />
              ))}
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

      {/* Theme Editor — slide-in panel */}
      {showThemeEditor && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl border-l border-gray-200 overflow-y-auto">
          <ThemeEditor
            theme={
              multiDashboard.activeDashboard?.theme ?? {
                id: "default",
                name: "Default",
                colors: {
                  primary: "#3b82f6",
                  secondary: "#6366f1",
                  accent: "#8b5cf6",
                  background: "#ffffff",
                  surface: "#f9fafb",
                  text: "#111827",
                  border: "#e5e7eb",
                },
                chartPalette: [
                  "#3b82f6",
                  "#6366f1",
                  "#8b5cf6",
                  "#06b6d4",
                  "#10b981",
                  "#f59e0b",
                  "#ef4444",
                  "#ec4899",
                ],
                borderRadius: "lg",
                fontFamily: "system",
                cardStyle: "shadow",
              }
            }
            onChange={handleThemeChange}
            onClose={() => setShowThemeEditor(false)}
          />
        </div>
      )}

      {/* Calculated Fields Editor modal */}
      {showCalcFields && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CalculatedFieldEditor
              fields={multiDashboard.activeDashboard?.calculatedFields ?? []}
              availableColumns={[]}
              onSave={handleCalcFieldsSave}
              onClose={() => setShowCalcFields(false)}
            />
          </div>
        </div>
      )}
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
        <a
          href="/"
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition-colors"
        >
          Open Chat
        </a>
      </div>
    </div>
  );
}
