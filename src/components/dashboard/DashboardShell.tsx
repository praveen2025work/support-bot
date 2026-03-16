'use client';

import { useState, useEffect } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardHeader } from './DashboardHeader';
import { FavoritesPanel } from './FavoritesPanel';
import { RecentQueriesPanel } from './RecentQueriesPanel';
import { AddFavoriteModal } from './AddFavoriteModal';
import { SearchBar } from './SearchBar';
import type { QueryInfo } from '@/types/dashboard';

interface GroupInfo {
  id: string;
  name: string;
  description: string;
}

export function DashboardShell({
  userId,
  userName,
  initialGroupId,
}: {
  userId?: string;
  userName?: string;
  initialGroupId: string;
}) {
  const [groupId, setGroupId] = useState(initialGroupId);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [showAddFavorite, setShowAddFavorite] = useState(false);
  const [availableQueries, setAvailableQueries] = useState<QueryInfo[]>([]);
  const dashboard = useDashboard(userId);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        userName={userName}
        groupId={groupId}
        groups={groups}
        onGroupChange={setGroupId}
        onAddFavorite={() => setShowAddFavorite(true)}
      />

      <div className="px-6 pt-4 pb-2">
        <SearchBar
          groupId={groupId}
          onSelect={(queryName) => {
            window.location.href = `/?q=run+${encodeURIComponent(queryName)}`;
          }}
        />
      </div>

      <div className="px-6 py-6 space-y-6">
        {dashboard.loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading your dashboard...</div>
        ) : isEmpty ? (
          <EmptyState onAddFavorite={() => setShowAddFavorite(true)} />
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
    </div>
  );
}

function EmptyState({ onAddFavorite }: { onAddFavorite: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-4">&#128202;</div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Your Dashboard is Empty</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        Add favorite queries for quick access or start chatting to build your recent history.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onAddFavorite}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add a Favorite
        </button>
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
