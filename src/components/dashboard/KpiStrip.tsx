"use client";

interface KpiItem {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface KpiStripProps {
  items: KpiItem[];
}

export function KpiStrip({ items }: KpiStripProps) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-2 px-4 pt-2.5 pb-0 overflow-x-auto">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex-1 min-w-[140px] bg-[var(--bg-primary)] rounded-[var(--radius-lg)] px-3.5 py-2.5 shadow-[var(--shadow-xs)] flex items-center gap-2.5"
        >
          <div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              {item.label}
            </div>
            <div className="text-[20px] font-bold text-[var(--text-primary)] leading-tight">
              {item.value}
            </div>
          </div>
          {item.change && (
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-[var(--radius-full)] ${
                item.changeType === "positive"
                  ? "text-[var(--success)] bg-[var(--success-subtle)]"
                  : item.changeType === "negative"
                    ? "text-[var(--danger)] bg-[var(--danger-subtle)]"
                    : "text-[var(--text-muted)] bg-[var(--bg-tertiary)]"
              }`}
            >
              {item.change}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
