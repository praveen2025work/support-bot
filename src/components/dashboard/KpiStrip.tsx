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

const ACCENTS = ["var(--brand)", "var(--accent)", "var(--success)", "#a78bfa"];

export function KpiStrip({ items }: KpiStripProps) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-3 px-5 pt-4 pb-1 overflow-x-auto">
      {items.map((item, idx) => {
        const accent = ACCENTS[idx % ACCENTS.length];
        return (
          <div
            key={item.label}
            className="relative flex-1 min-w-[160px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)] transition-all overflow-hidden"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[2px] opacity-70"
              style={{ backgroundColor: accent }}
            />
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] truncate">
              {item.label}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="numerals text-[22px] font-bold leading-none text-[var(--text-primary)]">
                {item.value}
              </span>
              {item.change && (
                <span
                  className={`text-[11px] font-semibold ${
                    item.changeType === "positive"
                      ? "text-emerald-500"
                      : item.changeType === "negative"
                        ? "text-rose-500"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {item.change}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
