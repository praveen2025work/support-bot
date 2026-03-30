"use client";

import { Clock, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RecentQueryItem } from "@/types/home-feed";

interface RecentActivityProps {
  items: RecentQueryItem[];
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export function RecentActivity({ items }: RecentActivityProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[var(--text-muted)]" />
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
          Recent Activity
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={`${item.queryName}-${index}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-primary,var(--border))]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                {item.queryName}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                {item.userMessage}
              </p>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
              {formatTimestamp(item.timestamp)}
            </span>
            <button
              onClick={() =>
                router.push(`/?autoQuery=${encodeURIComponent(item.queryName)}`)
              }
              title="Resume"
              className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm,4px)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex-shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
