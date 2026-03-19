"use client";

import type { RecentQuery } from "@/types/dashboard";
import { Star, MessageCircle } from "lucide-react";

export function RecentQueriesPanel({
  recents,
  onClear,
  onAddFavorite,
}: {
  recents: RecentQuery[];
  onClear: () => Promise<void>;
  onAddFavorite: (item: {
    queryName: string;
    groupId: string;
    label: string;
    defaultFilters: Record<string, string>;
  }) => Promise<void>;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Recent Queries</h2>
        <span className="text-xs text-gray-400">{recents.length}</span>
        <button
          onClick={onClear}
          className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {recents.slice(0, 20).map((recent, i) => (
          <div
            key={`${recent.timestamp}_${i}`}
            className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">
                {recent.userMessage}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400">
                  {recent.queryName}
                </span>
                <span className="text-[10px] text-gray-300">|</span>
                <span className="text-[10px] text-gray-400">
                  {recent.groupId}
                </span>
                {recent.executionMs != null && (
                  <>
                    <span className="text-[10px] text-gray-300">|</span>
                    <span className="text-[10px] text-green-600">
                      {recent.executionMs}ms
                    </span>
                  </>
                )}
                <span className="text-[10px] text-gray-300">|</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(recent.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                // Extract actual query name from userMessage (e.g. "run active_users" → "active_users")
                const match = recent.userMessage.match(/^run\s+(\S+)/i);
                const actualName = match ? match[1] : recent.queryName;
                onAddFavorite({
                  queryName: actualName,
                  groupId: recent.groupId,
                  label: actualName,
                  defaultFilters: {},
                });
              }}
              title="Add to favorites"
              className="p-1.5 text-gray-300 hover:text-yellow-500 transition-colors"
            >
              <Star size={16} />
            </button>
            <a
              href={`/?group=${encodeURIComponent(recent.groupId)}`}
              title="Open in chat"
              className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
            >
              <MessageCircle size={16} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
