"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Minus, X } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useUser } from "@/contexts/UserContext";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { SuggestionChips } from "./SuggestionChips";
import { ErrorBoundary } from "./ErrorBoundary";
import { FileDropZone } from "./FileDropZone";

/** Compute a safe postMessage target origin instead of broadcasting to '*'. */
function getPostMessageTargetOrigin(): string {
  if (window.parent !== window) {
    if (document.referrer) {
      try {
        return new URL(document.referrer).origin;
      } catch {
        return "*";
      }
    }
    return "*";
  }
  return window.location.origin;
}

/** Hook: ping /api/health every 30s to track engine status */
function useEngineStatus() {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking");

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/health", {
        signal: AbortSignal.timeout(5000),
      });
      setStatus(res.ok ? "ok" : "down");
    } catch {
      setStatus("down");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polling on mount is a valid pattern
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return status;
}

export type DisplayMode = "auto" | "table" | "chart";

export function ChatWindow({
  platform = "web",
  groupId,
  userName,
  hideHeader = false,
}: {
  platform?: "web" | "widget";
  groupId?: string;
  userName?: string;
  hideHeader?: boolean;
}) {
  const {
    messages,
    isLoading,
    loadingStatus,
    sendMessage,
    executeQuery,
    retryMessage,
    clearMessages,
    submitFeedback,
    uploadFile,
  } = useChat(platform, groupId, userName);
  const { userInfo } = useUser();
  const engineStatus = useEngineStatus();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("auto");
  const [compactAuto, setCompactAuto] = useState(true);

  const hasResults = messages.some((m) => m.role === "bot" && m.richContent);

  const lastBotMessage = [...messages].reverse().find((m) => m.role === "bot");
  const suggestions = lastBotMessage?.suggestions || [];

  const handleWidgetClose = () => {
    const targetOrigin = getPostMessageTargetOrigin();
    window.parent.postMessage({ type: "chatbot-close" }, targetOrigin);
  };

  const handleWidgetMinimize = () => {
    const targetOrigin = getPostMessageTargetOrigin();
    window.parent.postMessage({ type: "chatbot-minimize" }, targetOrigin);
  };

  const handleNewSession = () => {
    clearMessages();
  };

  const handleClearChat = () => {
    clearMessages();
  };

  const handleDisconnect = () => {
    clearMessages();
    if (platform === "widget") {
      handleWidgetClose();
    }
  };

  // Status indicator config
  const statusConfig = {
    ok: { dot: "bg-green-400", label: "Connected", animate: "" },
    down: {
      dot: "bg-red-400",
      label: "Disconnected",
      animate: "animate-pulse",
    },
    checking: {
      dot: "bg-yellow-400",
      label: "Checking...",
      animate: "animate-pulse",
    },
  };
  const st = statusConfig[engineStatus];

  return (
    <ErrorBoundary>
      <FileDropZone onFileDrop={uploadFile} disabled={isLoading}>
        <div className="flex flex-col h-full bg-[var(--bg-primary)]">
          {platform === "widget" ? (
            /* Single-row sticky header: bot icon, title, user info, status, minimize, close */
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 flex items-center gap-2 flex-shrink-0 shadow-sm">
              {/* Bot icon */}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot size={14} stroke="white" />
              </div>
              {/* Title + user info on one line */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white whitespace-nowrap">
                    MITR AI
                  </span>
                  {userInfo && (
                    <>
                      <span className="text-white/40">·</span>
                      <div className="w-5 h-5 rounded-full bg-white/20 text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                        {userInfo.givenName?.[0]}
                        {userInfo.surname?.[0]}
                      </div>
                      <span className="text-[11px] text-white/80 truncate">
                        {userInfo.displayName}
                        {(userInfo.department || userInfo.role) && (
                          <span className="text-white/50">
                            {" "}
                            | {userInfo.department || userInfo.role}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {/* Engine status indicator */}
              <div
                className="flex items-center gap-1 flex-shrink-0"
                title={`Engine: ${st.label}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${st.dot} ${st.animate}`}
                />
                <span className="text-[10px] text-white/70 hidden sm:inline">
                  {st.label}
                </span>
              </div>
              {/* Minimize button */}
              <button
                onClick={handleWidgetMinimize}
                className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Minimize chat"
                title="Minimize"
              >
                <Minus size={12} stroke="white" />
              </button>
              {/* Close button */}
              <button
                onClick={handleWidgetClose}
                className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Close chat"
                title="Close"
              >
                <X size={12} stroke="white" />
              </button>
            </div>
          ) : !hideHeader ? (
            /* Non-widget: sticky header with title, status, user info */
            <div className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                  MITR AI
                </h1>
                <p className="text-xs text-[var(--text-secondary)]">
                  {groupId && groupId !== "default"
                    ? `${groupId.charAt(0).toUpperCase() + groupId.slice(1)} assistant`
                    : "Ask me about queries, URLs, or estimations"}
                </p>
              </div>
              {/* Engine status */}
              <div
                className="flex items-center gap-1.5"
                title={`Engine: ${st.label}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${st.dot} ${st.animate}`}
                />
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {st.label}
                </span>
              </div>
              {/* User info */}
              {userInfo && (
                <div className="flex items-center gap-2 pl-3 border-l border-[var(--border)]">
                  <div className="w-7 h-7 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold flex items-center justify-center">
                    {userInfo.givenName?.[0]}
                    {userInfo.surname?.[0]}
                  </div>
                  <div className="text-xs text-[var(--text-primary)] leading-tight">
                    <div className="font-medium">{userInfo.displayName}</div>
                    {(userInfo.department || userInfo.role) && (
                      <div className="text-[var(--text-muted)]">
                        {userInfo.department || userInfo.role}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <MessageList
            messages={messages}
            isLoading={isLoading}
            loadingStatus={loadingStatus}
            onAction={sendMessage}
            onExecuteQuery={executeQuery}
            onRetry={retryMessage}
            onFeedback={submitFeedback}
            displayMode={displayMode}
            compactAuto={compactAuto}
          />

          {suggestions.length > 0 && !isLoading && (
            <SuggestionChips suggestions={suggestions} onSelect={sendMessage} />
          )}

          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            onNewSession={handleNewSession}
            onClearChat={handleClearChat}
            onDisconnect={handleDisconnect}
            onFileSelect={uploadFile}
            platform={platform}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            compactAuto={compactAuto}
            onCompactAutoChange={setCompactAuto}
            hasResults={hasResults}
          />
        </div>
      </FileDropZone>
    </ErrorBoundary>
  );
}
