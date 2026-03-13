'use client';

import { useChat } from '@/hooks/useChat';
import { useUser } from '@/contexts/UserContext';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestionChips } from './SuggestionChips';
import { ErrorBoundary } from './ErrorBoundary';

/** Compute a safe postMessage target origin instead of broadcasting to '*'. */
function getPostMessageTargetOrigin(): string {
  if (window.parent !== window) {
    // Embedded in an iframe — use the parent's origin from document.referrer
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

  const lastBotMessage = [...messages].reverse().find((m) => m.role === 'bot');
  const suggestions = lastBotMessage?.suggestions || [];

  const handleWidgetClose = () => {
    const targetOrigin = getPostMessageTargetOrigin();
    window.parent.postMessage({ type: 'chatbot-close' }, targetOrigin);
  };

  const handleWidgetMinimize = () => {
    const targetOrigin = getPostMessageTargetOrigin();
    window.parent.postMessage({ type: 'chatbot-close' }, targetOrigin);
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-white">
      {platform === 'widget' ? (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
          {/* Bot icon */}
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2"/>
              <circle cx="12" cy="5" r="2"/>
              <line x1="12" y1="7" x2="12" y2="11"/>
              <circle cx="8" cy="16" r="1" fill="white"/>
              <circle cx="16" cy="16" r="1" fill="white"/>
              <path d="M9 19h6"/>
            </svg>
          </div>
          {/* Title + user info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white leading-tight">Chatbot</h1>
            {userInfo ? (
              <p className="text-[11px] text-white/70 truncate">
                {userInfo.displayName} &middot; {userInfo.department || userInfo.role || ''}
              </p>
            ) : (
              <p className="text-[11px] text-white/70">Ask me anything</p>
            )}
          </div>
          {/* User avatar */}
          {userInfo && (
            <div className="w-6 h-6 rounded-full bg-white/20 text-white text-[9px] font-semibold flex items-center justify-center flex-shrink-0" title={userInfo.displayName}>
              {userInfo.givenName?.[0]}{userInfo.surname?.[0]}
            </div>
          )}
          {/* Minimize button */}
          <button
            onClick={handleWidgetMinimize}
            className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Minimize chat"
            title="Minimize"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ) : (
        <div className="border-b border-gray-200 px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Chatbot</h1>
          <p className="text-xs text-gray-500">
            {groupId && groupId !== 'default'
              ? `${groupId.charAt(0).toUpperCase() + groupId.slice(1)} assistant`
              : 'Ask me about queries, URLs, or estimations'}
          </p>
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
