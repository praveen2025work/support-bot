'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { useDashboardContext } from '@/contexts/DashboardContext';
import type { Message } from '@/hooks/useChat';
import type { EventLinkConfig } from '@/types/dashboard';

interface CardMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  richContent?: Message['richContent'];
  executionMs?: number;
  isError?: boolean;
  timestamp: Date;
  originalQuery?: string;
  suggestions?: string[];
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
  favoriteId,
  onSaveFilters,
  actions,
  cardId,
  eventLinkConfig,
  hideHeader,
  onExecutionInfo,
  onFilterChange,
}: {
  queryName: string;
  label: string;
  groupId: string;
  userName?: string;
  defaultFilters?: Record<string, string>;
  /** Filter keys from the query config — needed to show editable filter inputs */
  queryFilters?: Array<string | { key: string; binding: string }>;
  autoExecute?: boolean;
  favoriteId?: string;
  onSaveFilters?: (favoriteId: string, filters: Record<string, string>) => Promise<void>;
  actions?: React.ReactNode;
  /** Grid dashboard card ID for event linking */
  cardId?: string;
  /** Event link configuration for cross-card filtering */
  eventLinkConfig?: EventLinkConfig;
  /** Hide internal header when rendered inside grid (grid provides its own header) */
  hideHeader?: boolean;
  /** Callback with last execution time in ms */
  onExecutionInfo?: (executionMs: number | null) => void;
  /** Callback when user changes filters — used by grid to persist */
  onFilterChange?: (filters: Record<string, string>) => void;
}) {
  const [messages, setMessages] = useState<CardMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [editingFilters, setEditingFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>(defaultFilters || {});
  const [filterConfigs, setFilterConfigs] = useState<Record<string, FilterOptionConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const sessionIdRef = useRef(`dashboard_${userName}_${queryName}_${Date.now()}`);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoExecutedRef = useRef(false);
  const resolvedCardId = cardId || useRef(`${queryName}_${favoriteId || Date.now()}`).current;

  // Dashboard context for shared state
  const { businessDate, sharedFilters, setSharedFilter, linkedSelection, setLinkedSelection, registerCardLinkConfig, unregisterCard, getApplicableFilters } = useDashboardContext();

  // Derive filter keys from queryFilters or defaultFilters keys
  const filterKeys: string[] = queryFilters
    ? queryFilters.map((f) => (typeof f === 'string' ? f : (f as { key: string }).key))
    : Object.keys(defaultFilters || {});

  // Register event link config for cross-card filtering
  useEffect(() => {
    if (eventLinkConfig) {
      registerCardLinkConfig(resolvedCardId, eventLinkConfig);
      return () => unregisterCard(resolvedCardId);
    }
  }, [resolvedCardId, eventLinkConfig, registerCardLinkConfig, unregisterCard]);

  // Compute cross-card event filters
  const eventFilters = useMemo(() => {
    if (!eventLinkConfig) return {};
    return getApplicableFilters(resolvedCardId, filterKeys);
  }, [resolvedCardId, eventLinkConfig, getApplicableFilters, filterKeys]);

  // Merge current filters with shared filters, event filters, and business date
  const mergedFilters = useMemo(() => {
    const merged = { ...sharedFilters, ...eventFilters, ...currentFilters };
    if (businessDate) merged.business_date = businessDate;
    return merged;
  }, [currentFilters, sharedFilters, eventFilters, businessDate]);

  // Fetch filter configs for rendering editable inputs
  const filterKeysLen = filterKeys.length;
  useEffect(() => {
    if (filterKeysLen === 0) return;
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
  }, [filterKeysLen]);

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
        originalQuery: text,
        suggestions: data.suggestions as string[] | undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
      onExecutionInfo?.(data.executionMs ?? null);
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
      sendMessage(`run ${queryName}`, mergedFilters);
    }
  }, [autoExecute, queryName, mergedFilters, sendMessage]);

  // Auto-rerun when business date changes (debounced)
  const businessDateRef = useRef(businessDate);
  useEffect(() => {
    if (businessDateRef.current === businessDate) return;
    businessDateRef.current = businessDate;
    if (!hasRun) return;
    const timer = setTimeout(() => {
      sendMessage(`run ${queryName}`, mergedFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [businessDate, hasRun, queryName, mergedFilters, sendMessage]);

  // Auto-rerun when cross-card event filters change (debounced)
  const eventFiltersRef = useRef(eventFilters);
  useEffect(() => {
    const prev = JSON.stringify(eventFiltersRef.current);
    const curr = JSON.stringify(eventFilters);
    if (prev === curr) return;
    eventFiltersRef.current = eventFilters;
    if (!hasRun || Object.keys(eventFilters).length === 0) return;
    const timer = setTimeout(() => {
      sendMessage(`run ${queryName}`, mergedFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [eventFilters, hasRun, queryName, mergedFilters, sendMessage]);

  const handleRun = () => {
    setHasRun(true);
    setEditingFilters(false);
    sendMessage(`run ${queryName}`, mergedFilters);
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
    const updated = { ...currentFilters, [key]: value };
    setCurrentFilters(updated);
    // Propagate to shared filters so other cards can pick it up
    setSharedFilter(key, value);
    // Persist filter changes to the dashboard card
    onFilterChange?.(updated);
  };

  const handleResetFilters = () => {
    setCurrentFilters(defaultFilters || {});
  };

  const handleSaveFilters = async () => {
    if (!favoriteId || !onSaveFilters) return;
    setSaving(true);
    try {
      await onSaveFilters(favoriteId, currentFilters);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => setIsHovered(false), 200);
  };
  useEffect(() => () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); }, []);

  const activeFilterEntries = Object.entries(currentFilters).filter(([, v]) => v);
  const hasFilters = filterKeys.length > 0;

  const handleRerun = useCallback((originalQuery: string) => {
    sendMessage(originalQuery, mergedFilters);
  }, [sendMessage, mergedFilters]);

  return (
    <div
      className={hideHeader ? 'bg-white overflow-hidden flex flex-col h-full w-full group' : 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col resize flex-shrink-0 group'}
      style={hideHeader ? undefined : { minHeight: 360, height: 480, minWidth: 320, width: 380, maxWidth: '100%' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header — hidden in grid view (grid provides its own) */}
      {!hideHeader && (
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
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
      )}

      {/* Filter pills (compact view when not editing) */}
      {activeFilterEntries.length > 0 && !editingFilters && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-1 shrink-0">
          {activeFilterEntries.map(([key, value]) => (
            <span key={key} className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] text-blue-700">
              {key}: {value}
            </span>
          ))}
          {hideHeader && hasFilters && (
            <button
              onClick={() => setEditingFilters(true)}
              className="inline-flex items-center rounded-full bg-gray-100 border border-gray-300 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200"
              title="Edit filters"
            >
              ✎ Edit
            </button>
          )}
        </div>
      )}

      {/* In grid mode with no active filters, still show a filter button if filters exist */}
      {hideHeader && hasFilters && activeFilterEntries.length === 0 && !editingFilters && (
        <div className="px-4 py-1.5 border-b border-gray-100 shrink-0">
          <button
            onClick={() => setEditingFilters(true)}
            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600"
            title="Edit filters"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        </div>
      )}

      {/* Editable filter panel */}
      {editingFilters && (
        <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 space-y-2 shrink-0 overflow-y-auto max-h-48">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-600">Query Filters</span>
            <div className="flex items-center gap-2">
              {Object.keys(defaultFilters || {}).length > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  Reset to defaults
                </button>
              )}
              <button
                onClick={() => setEditingFilters(false)}
                className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                title="Close filters"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleRun}
              disabled={isLoading}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {hasRun ? 'Re-run with Filters' : 'Run with Filters'}
            </button>
            {onSaveFilters && favoriteId && (
              <button
                onClick={handleSaveFilters}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {saveSuccess ? 'Saved!' : saving ? 'Saving...' : 'Save Defaults'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-h-0">
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
          /* Message thread */
          <div ref={scrollContainerRef} className="flex-1 overflow-y-scroll overflow-x-hidden px-3 py-2 space-y-1 min-h-0 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id}>
                <MessageBubble
                  message={{
                    ...msg,
                    suggestions: undefined,
                    referenceUrl: undefined,
                    retryText: undefined,
                  }}
                  cardId={cardId}
                  linkedSelection={linkedSelection}
                  onCellClick={(column, value) => setLinkedSelection(resolvedCardId, column, String(value))}
                />
                {/* Rerun button — hidden in dashboard grid (Refresh in hover panel serves same purpose) */}
                {!hideHeader && msg.role === 'bot' && msg.originalQuery && (
                  <div className="flex justify-start mb-1 -mt-1 ml-1">
                    <button
                      onClick={() => handleRerun(msg.originalQuery!)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      title="Re-run this query for latest data"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Rerun
                    </button>
                  </div>
                )}
              </div>
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
        )}
      </div>

      {/* Hover action panel — slides open at bottom (in normal flow, not absolute) */}
      <div
        className={`shrink-0 overflow-hidden transition-all duration-200 ease-in-out ${
          isHovered ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white border-t border-gray-200 px-3 py-2.5 space-y-2">
          {/* Suggestion chips from last bot response */}
          {(() => {
            const lastBot = [...messages].reverse().find((m) => m.role === 'bot');
            const chips = lastBot?.suggestions;
            if (!chips || chips.length === 0 || isLoading) return null;
            return (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => {
                      setFollowUpText('');
                      sendMessage(chip);
                    }}
                    className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Follow-up input */}
          <form onSubmit={handleFollowUp} className="flex gap-2">
            <input
              type="text"
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="Ask a follow-up..."
              disabled={isLoading || !hasRun}
              className="flex-1 text-xs border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !followUpText.trim() || !hasRun}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </form>

          {/* Action buttons row */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => sendMessage(`run ${queryName}`, mergedFilters)}
              disabled={isLoading || !hasRun}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleClear}
              disabled={!hasRun}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40"
              title="Clear & Reset"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
            <a
              href={`/?group=${encodeURIComponent(groupId)}&query=${encodeURIComponent(queryName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors ml-auto"
              title="Open in Chat (new tab)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Chat
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
