"use client";

import { useEffect, useState } from "react";
import { MorningBriefing } from "./MorningBriefing";
import { PinnedKpis } from "./PinnedKpis";
import { SuggestedQueries } from "./SuggestedQueries";
import { RecentActivity } from "./RecentActivity";
import type { HomeFeedData, PinnedKpi } from "@/types/home-feed";

interface HomeFeedProps {
  groupId: string;
  userId: string;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-20 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] animate-pulse" />
      <div className="h-16 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] animate-pulse" />
      <div className="h-32 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] animate-pulse" />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function HomeFeed({ groupId, userId }: HomeFeedProps) {
  const [feedData, setFeedData] = useState<HomeFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pinnedKpis: PinnedKpi[] = [];

  useEffect(() => {
    async function fetchFeed() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ groupId, userId });
        const response = await fetch(`/api/home-feed?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to load home feed (${response.status})`);
        }
        const json = await response.json();
        if (!json.success) {
          throw new Error(json.error ?? "Unknown error loading home feed");
        }
        setFeedData(json.data as HomeFeedData);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load home feed",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchFeed();
  }, [groupId, userId]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {getGreeting()}
        </h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
          {formatDate()}
        </p>
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className="px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-red-300 text-[13px] text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && feedData && (
        <>
          <MorningBriefing briefing={feedData.briefing} />
          <PinnedKpis kpis={pinnedKpis} />
          <SuggestedQueries suggestions={feedData.suggestedQueries} />
          <RecentActivity items={feedData.recentActivity} />
        </>
      )}
    </div>
  );
}
