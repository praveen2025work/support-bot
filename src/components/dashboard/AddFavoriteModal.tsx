'use client';

import { useState } from 'react';
import type { QueryInfo } from '@/types/dashboard';

export function AddFavoriteModal({
  queries,
  groupId,
  onAdd,
  onClose,
}: {
  queries: QueryInfo[];
  groupId: string;
  onAdd: (item: { queryName: string; groupId: string; label: string; defaultFilters: Record<string, string> }) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  const filtered = queries.filter(
    (q) => q.name.toLowerCase().includes(search.toLowerCase()) ||
           q.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (query: QueryInfo) => {
    setAdding(query.name);
    try {
      await onAdd({ queryName: query.name, groupId, label: query.name, defaultFilters: {} });
    } finally {
      setAdding(null);
    }
  };

  const typeColors: Record<string, string> = {
    api: 'bg-green-100 text-green-700',
    url: 'bg-purple-100 text-purple-700',
    document: 'bg-orange-100 text-orange-700',
    csv: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Add Favorite Query</h2>
          <div className="ml-auto">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search queries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {queries.length === 0 ? 'No queries available' : 'No matching queries'}
            </div>
          ) : (
            filtered.map((query) => (
              <div
                key={query.name}
                className="px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{query.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColors[query.type] || 'bg-gray-100 text-gray-600'}`}>
                      {query.type}
                    </span>
                  </div>
                  {query.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{query.description}</p>
                  )}
                  {query.filters.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {query.filters.map((f, idx) => {
                        const label = typeof f === 'string' ? f : (f as unknown as { key: string }).key || JSON.stringify(f);
                        return (
                          <span key={idx} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAdd(query)}
                  disabled={adding === query.name}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {adding === query.name ? 'Adding...' : 'Add'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
