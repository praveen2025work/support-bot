'use client';

import type { RecentQuery } from '@/types/dashboard';

export function RecentQueriesPanel({
  recents,
  onClear,
  onAddFavorite,
}: {
  recents: RecentQuery[];
  onClear: () => Promise<void>;
  onAddFavorite: (item: { queryName: string; groupId: string; label: string; defaultFilters: Record<string, string> }) => Promise<void>;
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
          <div key={`${recent.timestamp}_${i}`} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{recent.userMessage}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400">{recent.queryName}</span>
                <span className="text-[10px] text-gray-300">|</span>
                <span className="text-[10px] text-gray-400">{recent.groupId}</span>
                {recent.executionMs != null && (
                  <>
                    <span className="text-[10px] text-gray-300">|</span>
                    <span className="text-[10px] text-green-600">{recent.executionMs}ms</span>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            <a
              href={`/?group=${encodeURIComponent(recent.groupId)}`}
              title="Open in chat"
              className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
