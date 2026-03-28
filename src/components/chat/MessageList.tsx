"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/hooks/useChat";

function formatDateSeparator(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface StarterCard {
  label: string;
  description: string;
  action: string;
}

const STARTER_CARDS: StarterCard[] = [
  {
    label: "List queries",
    description: "See all available queries you can run",
    action: "list queries",
  },
  {
    label: "Get help",
    description: "Learn what I can do and see examples",
    action: "help",
  },
  {
    label: "Run a query",
    description: "Execute a query and see live results",
    action: "run monthly_revenue",
  },
  {
    label: "Find URLs",
    description: "Search for relevant links and docs",
    action: "find urls for monthly_revenue",
  },
];

export function MessageList({
  messages,
  isLoading,
  loadingStatus,
  onAction,
  onExecuteQuery,
  onRetry,
  onFeedback,
  displayMode = "auto",
  compactAuto = true,
  compactRichContent,
}: {
  messages: Message[];
  isLoading: boolean;
  loadingStatus?: string;
  onAction?: (text: string) => void;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onRetry?: (text: string) => void;
  onFeedback?: (
    messageId: string,
    type: "positive" | "negative",
    correction?: string,
  ) => void;
  displayMode?: "auto" | "table" | "chart";
  compactAuto?: boolean;
  compactRichContent?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-hover,#4f46e5)] flex items-center justify-center mb-4 shadow-[var(--shadow-xs)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 2L12.5 7.5L18 8.5L14 12.5L15 18L10 15.5L5 18L6 12.5L2 8.5L7.5 7.5L10 2Z"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">
            What can I help with?
          </p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1 mb-6">
            Ask about your data, run queries, or explore insights
          </p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            {STARTER_CARDS.map((card) => (
              <button
                key={card.action}
                onClick={() => onAction?.(card.action)}
                className="flex flex-col items-start text-left bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-lg)] px-4 py-3 hover:border-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors shadow-[var(--shadow-xs)]"
              >
                <span className="text-[13px] font-medium text-[var(--text-primary)]">
                  {card.label}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {card.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {messages.map((msg, index) => {
        const msgDate = msg.timestamp ? new Date(msg.timestamp) : null;
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const prevDate = prevMsg?.timestamp
          ? new Date(prevMsg.timestamp)
          : null;
        const showSeparator =
          msgDate !== null &&
          (prevDate === null ||
            msgDate.toDateString() !== prevDate.toDateString());
        return (
          <div key={msg.id}>
            {showSeparator && msgDate && (
              <div className="text-center my-3">
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-[var(--radius-full)]">
                  {formatDateSeparator(msgDate)}
                </span>
              </div>
            )}
            <MessageBubble
              message={msg}
              onAction={onAction}
              onExecuteQuery={onExecuteQuery}
              onRetry={onRetry}
              onFeedback={onFeedback}
              displayMode={displayMode}
              compactAuto={compactAuto}
              compactRichContent={compactRichContent}
            />
          </div>
        );
      })}
      {isLoading && (
        <div className="flex justify-start mb-3">
          <div className="bg-gray-100 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
              {loadingStatus && (
                <span className="text-xs text-gray-500 ml-1">
                  {loadingStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
