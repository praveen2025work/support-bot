"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Clock,
  RotateCw,
  AlertTriangle,
  Bell,
  CheckCircle,
} from "lucide-react";
import type { HomeFeedData } from "@/types/home-feed";

interface ChatWelcomeProps {
  groupId: string;
  userId: string;
  onSendQuery: (queryName: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function ChatWelcome({
  groupId,
  userId,
  onSendQuery,
}: ChatWelcomeProps) {
  const [feedData, setFeedData] = useState<HomeFeedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const params = new URLSearchParams({ groupId, userId });
        const res = await fetch(`/api/home-feed?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) setFeedData(json.data as HomeFeedData);
      } catch {
        // silently fail — welcome state is optional
      } finally {
        setLoading(false);
      }
    }
    void fetchFeed();
  }, [groupId, userId]);

  const briefing = feedData?.briefing;
  const suggestions = feedData?.suggestedQueries ?? [];
  const recentActivity = feedData?.recentActivity ?? [];
  const hasIssues =
    briefing &&
    (briefing.anomaliesDetected > 0 || briefing.watchAlertsTriggered > 0);

  return (
    <div className="flex-1 flex items-start justify-center overflow-auto px-4 py-8">
      <div className="w-full max-w-lg flex flex-col gap-5">
        {/* Greeting */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {getGreeting()}
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Ask me about your data, or pick a suggestion below.
          </p>
        </div>

        {/* Briefing (compact) */}
        {!loading && briefing && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border text-[13px] ${
              hasIssues
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-[var(--border)] bg-[var(--bg-secondary)]"
            }`}
          >
            {hasIssues ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0" />
            )}
            <span className="text-[var(--text-secondary)] flex-1">
              {briefing.message}
            </span>
            {briefing.anomaliesDetected > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-red-500">
                <AlertTriangle className="w-3 h-3" />
                {briefing.anomaliesDetected}
              </span>
            )}
            {briefing.watchAlertsTriggered > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-amber-500">
                <Bell className="w-3 h-3" />
                {briefing.watchAlertsTriggered}
              </span>
            )}
          </div>
        )}

        {/* Suggested queries */}
        {!loading && suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Suggested
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.queryName}
                  onClick={() => onSendQuery(s.queryName)}
                  className="px-3 py-2 text-left rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {s.queryName}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {s.reason}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {!loading && recentActivity.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Recent
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {recentActivity.map((item, i) => (
                <button
                  key={`${item.queryName}-${i}`}
                  onClick={() => onSendQuery(item.queryName)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      {item.queryName}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] ml-2">
                      {item.userMessage}
                    </span>
                  </div>
                  <RotateCw className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            <div className="h-12 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] animate-pulse" />
            <div className="h-20 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
