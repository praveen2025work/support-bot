'use client';

import type { FavoriteItem } from '@/types/dashboard';
import { QueryCard } from './QueryCard';

export function FavoritesPanel({
  favorites,
  groupId,
  userName,
  onRemove,
}: {
  favorites: FavoriteItem[];
  groupId: string;
  userName?: string;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Favorites</h2>
        <span className="text-xs text-gray-400">{favorites.length}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {favorites.map((fav) => (
          <QueryCard
            key={fav.id}
            queryName={fav.queryName}
            label={fav.label}
            groupId={fav.groupId || groupId}
            userName={userName}
            defaultFilters={fav.defaultFilters}
            actions={
              <button
                onClick={() => onRemove(fav.id)}
                title="Remove from favorites"
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}
