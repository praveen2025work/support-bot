'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useMultiDashboard } from '@/hooks/useMultiDashboard';
import { DashboardHeader } from './DashboardHeader';
import { FavoritesPanel } from './FavoritesPanel';
import { RecentQueriesPanel } from './RecentQueriesPanel';
import { AddFavoriteModal } from './AddFavoriteModal';
import { AddCardModal } from './AddCardModal';
import { DashboardSelector } from './DashboardSelector';
import { SearchBar } from './SearchBar';
import { DashboardProvider, useDashboardContext } from '@/contexts/DashboardContext';
import { SubscribeModal } from './SubscribeModal';
import type { QueryInfo, DashboardCard } from '@/types/dashboard';

const GridDashboard = lazy(() => import('./GridDashboard').then((m) => ({ default: m.GridDashboard })));

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
    fetch('/api/groups')
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
  const { businessDate, setBusinessDate, activeEvents, clearAllEvents, linkedSelection, clearLinkedSelection, sharedFilters, clearSharedFilters } = useDashboardContext();
  const [showSubscribe, setShowSubscribe] = useState(false);

  const handleDashboardSelect = (id: string) => {
    multiDashboard.setActiveDashboard(id);
    // Update URL without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('id', id);
    window.history.pushState({}, '', url.toString());
  };

  const handleCreateDashboard = async (name: string) => {
    const d = await multiDashboard.createDashboard(name);
    if (d) {
      const url = new URL(window.location.href);
      url.searchParams.set('id', d.id);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleDeleteDashboard = async (id: string) => {
    await multiDashboard.deleteDashboard(id);
    if (multiDashboard.activeDashboard?.id === id) {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.toString());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userName={userName}
        groupId={groupId}
        groups={groups}
        onGroupChange={setGroupId}
        onAddFavorite={() => isGridView ? setShowAddCard(true) : setShowAddFavorite(true)}
        addLabel={isGridView ? '+ Add Card' : '+ Add Favorite'}
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
        />

        <div className="flex-1 min-w-[200px]">
          <SearchBar
            groupId={groupId}
            onSelect={(queryName) => {
              window.location.href = `/?q=run+${encodeURIComponent(queryName)}`;
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Business Date:</label>
          <input
            type="date"
            value={businessDate || ''}
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
        {activeEvents.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeEvents.map((evt) => (
              <span key={`${evt.column}-${evt.value}`} className="inline-flex items-center gap-1 rounded-full bg-yellow-50 border border-yellow-300 px-2.5 py-1 text-[11px] text-yellow-700">
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
        {Object.keys(sharedFilters).length > 0 && (
          <button
            onClick={clearSharedFilters}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] text-blue-600 hover:bg-blue-100 transition-colors"
          >
            Clear shared filters ({Object.keys(sharedFilters).length})
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-6 py-6 space-y-6">
        {isGridView && multiDashboard.activeDashboard ? (
          /* Grid Dashboard View */
          <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">Loading grid...</div>}>
            <GridDashboard
              dashboard={multiDashboard.activeDashboard}
              userName={userId}
              availableQueries={availableQueries}
              onLayoutChange={(layouts) => multiDashboard.updateLayouts(multiDashboard.activeDashboard!.id, layouts)}
              onCardRemove={(cardId) => multiDashboard.removeCard(multiDashboard.activeDashboard!.id, cardId)}
              onCardUpdate={(cardId, partial) => multiDashboard.updateCard(multiDashboard.activeDashboard!.id, cardId, partial)}
              onSubscribe={() => setShowSubscribe(true)}
            />
            {multiDashboard.activeDashboard.cards.length === 0 && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowAddCard(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Add a Card
                </button>
                <button
                  onClick={() => multiDashboard.migrateFavorites(multiDashboard.activeDashboard!.id)}
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
              <div className="text-center py-12 text-gray-400 text-sm">Loading your dashboard...</div>
            ) : isEmpty ? (
              <EmptyState onAddFavorite={() => setShowAddFavorite(true)} onCreateDashboard={() => handleCreateDashboard('My Dashboard')} />
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
            await multiDashboard.addCard(multiDashboard.activeDashboard!.id, config);
          }}
        />
      )}

      {showSubscribe && multiDashboard.activeDashboard && userId && (
        <SubscribeModal
          open={showSubscribe}
          dashboardId={multiDashboard.activeDashboard.id}
          dashboardName={multiDashboard.activeDashboard.name}
          userId={userId}
          onClose={() => setShowSubscribe(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ onAddFavorite, onCreateDashboard }: { onAddFavorite: () => void; onCreateDashboard?: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-4">&#128202;</div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Your Dashboard is Empty</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        Add favorite queries for quick access, create a grid dashboard, or start chatting to build your recent history.
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
