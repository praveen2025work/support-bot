"use client";

import type { FavoriteItem, QueryInfo } from "@/types/dashboard";
import { X } from "lucide-react";
import { QueryCard } from "./QueryCard";

export function FavoritesPanel({
  favorites,
  groupId,
  userName,
  availableQueries,
  onRemove,
  onSaveFilters,
}: {
  favorites: FavoriteItem[];
  groupId: string;
  userName?: string;
  availableQueries?: QueryInfo[];
  onRemove: (id: string) => Promise<void>;
  onSaveFilters?: (
    favoriteId: string,
    filters: Record<string, string>,
  ) => Promise<void>;
}) {
  const getQueryFilters = (queryName: string) => {
    return availableQueries?.find((q) => q.name === queryName)?.filters;
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Favorites</h2>
        <span className="text-xs text-gray-400">{favorites.length}</span>
      </div>
      <div className="flex flex-wrap gap-4 items-start">
        {favorites.map((fav) => (
          <QueryCard
            key={fav.id}
            queryName={fav.queryName}
            label={fav.label}
            groupId={fav.groupId || groupId}
            userName={userName}
            defaultFilters={fav.defaultFilters}
            queryFilters={getQueryFilters(fav.queryName)}
            favoriteId={fav.id}
            onSaveFilters={onSaveFilters}
            actions={
              <button
                onClick={() => onRemove(fav.id)}
                title="Remove from favorites"
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}
