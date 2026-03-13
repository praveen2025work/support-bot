'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { useUser } from '@/contexts/UserContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestionChips } from './SuggestionChips';
import { ErrorBoundary } from './ErrorBoundary';

/** Compute a safe postMessage target origin instead of broadcasting to '*'. */
function getPostMessageTargetOrigin(): string {
  if (window.parent !== window) {
    if (document.referrer) {
      try {
        return new URL(document.referrer).origin;
      } catch {
        return '*';
      }
    }
    return '*';
  }
  return window.location.origin;
}

/** Hook: ping /api/health every 30s to track engine status */
function useEngineStatus() {
  const [status, setStatus] = useState<'ok' | 'down' | 'checking'>('checking');

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      setStatus(res.ok ? 'ok' : 'down');
    } catch {
      setStatus('down');
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return status;
}

export function ChatWindow({
  platform = 'web',
  groupId,
  userName,
}: {
  platform?: 'web' | 'widget';
  groupId?: string;
  userName?: string;
}) {
  const { messages, isLoading, loadingStatus, sendMessage, executeQuery, retryMessage } = useChat(platform, groupId, userName);
  const { userInfo } = useUser();
  const engineStatus = useEngineStatus();

  const lastBotMessage = [...messages].reverse().find((m) => m.role === 'bot');
  const suggestions = lastBotMessage?.suggestions || [];

  const handleWidgetClose = () => {
    const targetOrigin = getPostMessageTargetOrigin();
    window.parent.postMessage({ type: 'chatbot-close' }, targetOrigin);
  };

  const handleWidgetMinimize = () => {
    const targetOrigin = getPostMessageTargetOrigin();
    window.parent.postMessage({ type: 'chatbot-minimize' }, targetOrigin);
  };

  // Status indicator config
  const statusConfig = {
    ok: { dot: 'bg-green-400', label: 'Connected', animate: '' },
    down: { dot: 'bg-red-400', label: 'Disconnected', animate: 'animate-pulse' },
    checking: { dot: 'bg-yellow-400', label: 'Checking...', animate: 'animate-pulse' },
  };
  const st = statusConfig[engineStatus];

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-white">
      {platform === 'widget' ? (
        <div className="flex-shrink-0">
          {/* Top bar: title, status, minimize, close */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 flex items-center gap-2">
            {/* Bot icon */}
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="12" cy="5" r="2"/>
                <line x1="12" y1="7" x2="12" y2="11"/>
                <circle cx="8" cy="16" r="1" fill="white"/>
                <circle cx="16" cy="16" r="1" fill="white"/>
                <path d="M9 19h6"/>
              </svg>
            </div>
            {/* Title */}
            <h1 className="text-sm font-semibold text-white leading-tight">Chatbot</h1>
            {/* Engine status indicator */}
            <div className="flex items-center gap-1.5 ml-auto mr-1" title={`Engine: ${st.label}`}>
              <span className={`w-2 h-2 rounded-full ${st.dot} ${st.animate}`} />
              <span className="text-[10px] text-white/80 hidden sm:inline">{st.label}</span>
            </div>
            {/* Minimize button */}
            <button
              onClick={handleWidgetMinimize}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Minimize chat"
              title="Minimize"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            {/* Close button */}
            <button
              onClick={handleWidgetClose}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Close chat"
              title="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          {/* User info bar — always visible */}
          <div className="bg-blue-50 border-b border-blue-100 px-3 py-1.5 flex items-center gap-2">
            {userInfo ? (
              <>
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                  {userInfo.givenName?.[0]}{userInfo.surname?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-800 truncate block">
                    {userInfo.displayName}
                    {(userInfo.department || userInfo.role) && (
                      <span className="text-gray-400 font-normal"> | {userInfo.department || userInfo.role}</span>
                    )}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-xs text-gray-500">Ask me anything</span>
            )}
          </div>
        </div>
      ) : (
        <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Chatbot</h1>
            <p className="text-xs text-gray-500">
              {groupId && groupId !== 'default'
                ? `${groupId.charAt(0).toUpperCase() + groupId.slice(1)} assistant`
                : 'Ask me about queries, URLs, or estimations'}
            </p>
          </div>
          {/* Engine status for non-widget mode */}
          <div className="flex items-center gap-1.5" title={`Engine: ${st.label}`}>
            <span className={`w-2 h-2 rounded-full ${st.dot} ${st.animate}`} />
            <span className="text-[11px] text-gray-500">{st.label}</span>
          </div>
          {/* User info for non-widget mode */}
          {userInfo && (
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {userInfo.givenName?.[0]}{userInfo.surname?.[0]}
              </div>
              <div className="text-xs text-gray-700 leading-tight">
                <div className="font-medium">{userInfo.displayName}</div>
                {(userInfo.department || userInfo.role) && (
                  <div className="text-gray-400">{userInfo.department || userInfo.role}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <MessageList messages={messages} isLoading={isLoading} loadingStatus={loadingStatus} onAction={sendMessage} onExecuteQuery={executeQuery} onRetry={retryMessage} />

      {suggestions.length > 0 && !isLoading && (
        <SuggestionChips suggestions={suggestions} onSelect={sendMessage} />
      )}

      <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </ErrorBoundary>
  );
}
