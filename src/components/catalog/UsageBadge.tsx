"use client";

import { TrendingUp, Users } from "lucide-react";

interface UsageBadgeProps {
  trending: boolean;
  usageCount7d: number;
}

export default function UsageBadge({
  trending,
  usageCount7d,
}: UsageBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {trending && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
          <TrendingUp className="w-3 h-3" />
          Trending
        </span>
      )}
      <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
        <Users className="w-3 h-3" />
        {usageCount7d} runs this week
      </span>
    </div>
  );
}
