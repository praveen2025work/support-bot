"use client";

import type { LineageRow } from "../LineageFlowDiagram";

interface FeedHealthProps {
  data: LineageRow[];
}

export function FeedHealth({ data }: FeedHealthProps) {
  const byFeed: Record<
    string,
    { total: number; flagged: number; dur: number; avgDur: string }
  > = {};

  for (const d of data) {
    const f = d.FeedName;
    if (!byFeed[f]) byFeed[f] = { total: 0, flagged: 0, dur: 0, avgDur: "0" };
    byFeed[f].total++;
    const dur =
      typeof d.DurationAvg === "number"
        ? d.DurationAvg
        : parseFloat(String(d.DurationAvg));
    byFeed[f].dur += dur;
    if (dur > 5) byFeed[f].flagged++;
  }

  for (const v of Object.values(byFeed)) {
    v.avgDur = (v.dur / v.total).toFixed(1);
  }

  const sorted = Object.entries(byFeed).sort(
    (a, b) => b[1].flagged - a[1].flagged,
  );
  const maxT = Math.max(...sorted.map(([, v]) => v.total), 1);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
      <div className="text-[13px] font-bold text-gray-800 dark:text-gray-200 mb-3.5">
        Feed Health — Avg Duration (BOFC → Delivery)
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map(([name, v]) => {
          const avgDurNum = parseFloat(v.avgDur);
          return (
            <div key={name} className="flex items-center gap-2.5">
              <div className="w-[62px] text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0 truncate">
                {name}
              </div>

              {/* Bar */}
              <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md bg-blue-500/15 transition-all duration-400"
                  style={{ width: `${(v.total / maxT) * 100}%` }}
                />
                {v.flagged > 0 && (
                  <div
                    className="absolute top-0 left-0 h-full rounded-md bg-red-500/10"
                    style={{ width: `${(v.flagged / maxT) * 100}%` }}
                  />
                )}
              </div>

              {/* Count */}
              <div className="font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200 w-6 text-right">
                {v.total}
              </div>

              {/* Breach badge */}
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  v.flagged > 0
                    ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                }`}
              >
                {v.flagged} breach{v.flagged !== 1 ? "es" : ""}
              </span>

              {/* Avg duration */}
              <div
                className={`font-mono text-[11px] font-bold w-10 ${
                  avgDurNum > 5 ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {v.avgDur}h
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
