"use client";

import { Pin, ArrowUpRight } from "lucide-react";
import { SystemHealthRail } from "./SystemHealthRail";

interface PinnedQuery {
  name: string;
  label: string;
  value?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface PinnedDashboardProps {
  queries?: PinnedQuery[];
  onQueryClick?: (name: string) => void;
}

export function PinnedDashboard({
  queries,
  onQueryClick,
}: PinnedDashboardProps) {
  const hasPinned = !!queries && queries.length > 0;

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex flex-col gap-4 max-w-md mx-auto">
        {/* Pinned queries (or empty hint) */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
          <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-[var(--brand)]" />
              <span className="eyebrow !text-[10px]">Pinned</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              {queries?.length ?? 0}
            </span>
          </header>
          {hasPinned ? (
            <div className="grid grid-cols-2 gap-2 p-3">
              {queries!.map((q) => (
                <button
                  key={q.name}
                  onClick={() => onQueryClick?.(q.name)}
                  className="group bg-[var(--bg-secondary)] rounded-[var(--radius-md)] p-3 border border-transparent hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)] transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] text-[var(--text-muted)] uppercase tracking-[0.12em] font-semibold truncate">
                      {q.label}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors shrink-0" />
                  </div>
                  {q.value && (
                    <div className="numerals text-[20px] font-bold text-[var(--text-primary)] leading-none">
                      {q.value}
                    </div>
                  )}
                  {q.change && (
                    <div
                      className={`text-[10.5px] mt-1 font-semibold ${q.changeType === "positive" ? "text-emerald-500" : q.changeType === "negative" ? "text-rose-500" : "text-[var(--text-muted)]"}`}
                    >
                      {q.change}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 text-center">
              <div className="text-[12.5px] font-medium text-[var(--text-secondary)] mb-0.5">
                No pinned queries yet
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Pin a query from chat to see it surfaced here.
              </div>
            </div>
          )}
        </section>

        {/* System Health + Action History — always visible */}
        <SystemHealthRail />
      </div>
    </div>
  );
}
