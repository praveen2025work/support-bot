"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/hooks/useChat";

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
        <div className="flex flex-col items-center justify-center mt-10 px-4">
          <p className="text-lg font-medium text-gray-700">
            What can I help you with?
          </p>
          <p className="text-sm text-gray-400 mt-1 mb-6">
            Pick an option below or type your own question.
          </p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            {STARTER_CARDS.map((card) => (
              <button
                key={card.action}
                onClick={() => onAction?.(card.action)}
                className="flex flex-col items-start text-left rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-colors shadow-sm"
              >
                <span className="text-sm font-medium text-gray-800">
                  {card.label}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">
                  {card.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onAction={onAction}
          onExecuteQuery={onExecuteQuery}
          onRetry={onRetry}
          onFeedback={onFeedback}
          displayMode={displayMode}
          compactAuto={compactAuto}
          compactRichContent={compactRichContent}
        />
      ))}
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
