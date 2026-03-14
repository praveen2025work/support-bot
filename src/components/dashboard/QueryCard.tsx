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

export function QueryCard({
  queryName,
  label,
  groupId,
  userName,
  defaultFilters,
  autoExecute,
  actions,
}: {
  queryName: string;
  label: string;
  groupId: string;
  userName?: string;
  defaultFilters?: Record<string, string>;
  autoExecute?: boolean;
  actions?: React.ReactNode;
}) {
  const [messages, setMessages] = useState<CardMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const sessionIdRef = useRef(`dashboard_${userName}_${queryName}_${Date.now()}`);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoExecutedRef = useRef(false);

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
      sendMessage(`run ${queryName}`, defaultFilters);
    }
  }, [autoExecute, queryName, defaultFilters, sendMessage]);

  const handleRun = () => {
    setHasRun(true);
    sendMessage(`run ${queryName}`, defaultFilters);
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
    sessionIdRef.current = `dashboard_${userName}_${queryName}_${Date.now()}`;
  };

  const filterEntries = defaultFilters ? Object.entries(defaultFilters).filter(([, v]) => v) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{label}</h3>
          <p className="text-xs text-gray-400 truncate">{queryName}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}
        </div>
      </div>

      {/* Filter pills */}
      {filterEntries.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-1">
          {filterEntries.map(([key, value]) => (
            <span key={key} className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] text-blue-700">
              {key}: {value}
            </span>
          ))}
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
                  onClick={() => sendMessage(`run ${queryName}`, defaultFilters)}
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
