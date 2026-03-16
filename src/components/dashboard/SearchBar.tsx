'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchResult {
  queryName: string;
  description: string;
  score: number;
  matchedTerms: string[];
}

export function SearchBar({
  groupId,
  onSelect,
}: {
  groupId: string;
  onSelect?: (queryName: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (text: string) => {
      if (text.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/queries/search?q=${encodeURIComponent(text)}&groupId=${encodeURIComponent(groupId)}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen((data.results || []).length > 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [groupId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search queries by topic..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.queryName}
              onClick={() => {
                onSelect?.(r.queryName);
                setQuery('');
                setIsOpen(false);
                setResults([]);
              }}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{r.queryName}</span>
                <span className="text-[10px] text-gray-400">{Math.round(r.score * 100)}% match</span>
              </div>
              {r.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.description}</p>
              )}
              {r.matchedTerms.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {r.matchedTerms.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
