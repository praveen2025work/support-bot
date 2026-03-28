"use client";

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
  if (!queries || queries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
          No pinned queries yet
        </div>
        <div className="text-[12px] text-[var(--text-muted)]">
          Pin your favorite queries to see them here
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
            Pinned Queries
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Your favorites at a glance
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {queries.map((q) => (
          <button
            key={q.name}
            onClick={() => onQueryClick?.(q.name)}
            className="bg-[var(--bg-primary)] rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow text-left"
          >
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              {q.label}
            </div>
            {q.value && (
              <div className="text-[20px] font-bold text-[var(--text-primary)] mt-0.5">
                {q.value}
              </div>
            )}
            {q.change && (
              <div
                className={`text-[11px] mt-0.5 ${q.changeType === "positive" ? "text-[var(--success)]" : q.changeType === "negative" ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}
              >
                {q.change}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
