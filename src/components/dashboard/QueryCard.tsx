'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import type { Message } from '@/hooks/useChat';

interface CardMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  richContent?: Message['richContent'];
  executionMs?: number;
  isError?: boolean;
  timestamp: Date;
}

interface FilterOptionConfig {
  label: string;
  type: 'select' | 'text' | 'boolean';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

function fallbackConfig(filterKey: string): FilterOptionConfig {
  return {
    label: filterKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    type: 'text',
    placeholder: `Enter ${filterKey}...`,
  };
}

export function QueryCard({
  queryName,
  label,
  groupId,
  userName,
  defaultFilters,
  queryFilters,
  autoExecute,
  actions,
}: {
  queryName: string;
  label: string;
  groupId: string;
  userName?: string;
  defaultFilters?: Record<string, string>;
  /** Filter keys from the query config — needed to show editable filter inputs */
  queryFilters?: Array<string | { key: string; binding: string }>;
  autoExecute?: boolean;
  actions?: React.ReactNode;
}) {
  const [messages, setMessages] = useState<CardMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [editingFilters, setEditingFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>(defaultFilters || {});
  const [filterConfigs, setFilterConfigs] = useState<Record<string, FilterOptionConfig>>({});
  const sessionIdRef = useRef(`dashboard_${userName}_${queryName}_${Date.now()}`);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoExecutedRef = useRef(false);

  // Derive filter keys from queryFilters or defaultFilters keys
  const filterKeys: string[] = queryFilters
    ? queryFilters.map((f) => (typeof f === 'string' ? f : (f as { key: string }).key))
    : Object.keys(defaultFilters || {});

  // Fetch filter configs for rendering editable inputs
  useEffect(() => {
    if (filterKeys.length === 0) return;
    fetch('/api/filters')
      .then((res) => res.json())
      .then((json) => {
        const configs: Record<string, FilterOptionConfig> = {};
        for (const [key, entry] of Object.entries(json.filters || {})) {
          const e = entry as { label: string; type: string; options: { value: string; label: string }[]; placeholder: string | null };
          configs[key] = {
            label: e.label,
            type: e.type as 'select' | 'text' | 'boolean',
            options: e.type === 'select' ? e.options : undefined,
            placeholder: e.placeholder ?? undefined,
          };
        }
        setFilterConfigs(configs);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getConfig = (filterKey: string): FilterOptionConfig => {
    return filterConfigs[filterKey] || fallbackConfig(filterKey);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(async (text: string, filters?: Record<string, string>) => {
    const userMsg: CardMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          platform: 'web',
          groupId,
          userName,
          sessionId: sessionIdRef.current,
          ...(filters && Object.keys(filters).length > 0 ? { explicitFilters: filters } : {}),
        }),
      });

      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();

      const botMsg: CardMessage = {
        id: `b_${Date.now()}`,
        role: 'bot',
        text: data.text || data.response || 'No response',
        richContent: data.richContent,
        executionMs: data.executionMs,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `e_${Date.now()}`,
        role: 'bot',
        text: 'Something went wrong. Try again.',
        isError: true,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, userName]);

  // Auto-execute on mount for subscription cards with refreshOnLoad
  useEffect(() => {
    if (autoExecute && !autoExecutedRef.current) {
      autoExecutedRef.current = true;
      setHasRun(true);
      sendMessage(`run ${queryName}`, currentFilters);
    }
  }, [autoExecute, queryName, currentFilters, sendMessage]);

  const handleRun = () => {
    setHasRun(true);
    setEditingFilters(false);
    sendMessage(`run ${queryName}`, currentFilters);
  };

  const handleFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const text = followUpText.trim();
    if (!text || isLoading) return;
    setFollowUpText('');
    sendMessage(text);
  };

  const handleClear = () => {
    setMessages([]);
    setHasRun(false);
    setCurrentFilters(defaultFilters || {});
    sessionIdRef.current = `dashboard_${userName}_${queryName}_${Date.now()}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    setCurrentFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setCurrentFilters(defaultFilters || {});
  };

  const activeFilterEntries = Object.entries(currentFilters).filter(([, v]) => v);
  const hasFilters = filterKeys.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{label}</h3>
          <p className="text-xs text-gray-400 truncate">{queryName}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasFilters && (
            <button
              onClick={() => setEditingFilters((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors ${
                editingFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Edit filters"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* Filter pills (compact view when not editing) */}
      {activeFilterEntries.length > 0 && !editingFilters && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-1">
          {activeFilterEntries.map(([key, value]) => (
            <span key={key} className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] text-blue-700">
              {key}: {value}
            </span>
          ))}
        </div>
      )}

      {/* Editable filter panel */}
      {editingFilters && (
        <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-600">Query Filters</span>
            {Object.keys(defaultFilters || {}).length > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] text-blue-600 hover:underline"
              >
                Reset to defaults
              </button>
            )}
          </div>
          {filterKeys.map((filterKey) => {
            const config = getConfig(filterKey);
            return (
              <div key={filterKey}>
                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                  {config.label}
                </label>
                {config.type === 'select' && config.options ? (
                  <select
                    value={currentFilters[filterKey] || ''}
                    onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All (no filter)</option>
                    {config.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : config.type === 'boolean' ? (
                  <div className="flex items-center gap-3">
                    {['true', 'false'].map((val) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`card_${queryName}_${filterKey}`}
                          value={val}
                          checked={currentFilters[filterKey] === val}
                          onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                          className="accent-blue-600"
                        />
                        <span className="text-xs text-gray-700 capitalize">{val}</span>
                      </label>
                    ))}
                    {currentFilters[filterKey] && (
                      <button
                        onClick={() => handleFilterChange(filterKey, '')}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={currentFilters[filterKey] || ''}
                    onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                    placeholder={config.placeholder}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            );
          })}
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="w-full mt-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {hasRun ? 'Re-run with Filters' : 'Run with Filters'}
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col">
        {!hasRun ? (
          <div className="px-4 py-3">
            <button
              onClick={handleRun}
              className="w-full py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Run Query
            </button>
          </div>
        ) : (
          <>
            {/* Message thread */}
            <div ref={scrollContainerRef} className="flex-1 max-h-96 overflow-y-auto px-3 py-2 space-y-1">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={{
                    ...msg,
                    suggestions: undefined,
                    referenceUrl: undefined,
                    retryText: undefined,
                  }}
                />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-3">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div />
            </div>

            {/* Follow-up input */}
            <div className="border-t border-gray-100 px-3 py-2">
              <form onSubmit={handleFollowUp} className="flex gap-2">
                <input
                  type="text"
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  placeholder="Ask a follow-up..."
                  disabled={isLoading}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !followUpText.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </form>
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => sendMessage(`run ${queryName}`, currentFilters)}
                  disabled={isLoading}
                  className="text-[10px] text-blue-600 hover:underline disabled:opacity-50"
                >
                  Refresh
                </button>
                <button
                  onClick={handleClear}
                  className="text-[10px] text-gray-400 hover:underline"
                >
                  Clear
                </button>
                <a
                  href={`/?group=${encodeURIComponent(groupId)}`}
                  className="text-[10px] text-gray-400 hover:underline ml-auto"
                >
                  Open in Chat
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
