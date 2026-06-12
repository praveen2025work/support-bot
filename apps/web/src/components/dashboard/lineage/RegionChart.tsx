"use client";

import type { LineageRow } from "../LineageFlowDiagram";

const _REGIONS = ["NAM", "EMEA", "APAC"];
const REGION_COLORS: Record<string, string> = {
  NAM: "bg-blue-500",
  EMEA: "bg-purple-500",
  APAC: "bg-emerald-500",
  LATAM: "bg-amber-500",
};

interface RegionChartProps {
  data: LineageRow[];
}

export function RegionChart({ data }: RegionChartProps) {
  const byRegion: Record<string, { total: number; flagged: number }> = {};
  const regions = Array.from(new Set(data.map((d) => String(d.Region ?? ""))))
    .filter(Boolean)
    .sort();

  for (const r of regions) {
    byRegion[r] = { total: 0, flagged: 0 };
  }
  for (const d of data) {
    const r = String(d.Region ?? "");
    if (!byRegion[r]) byRegion[r] = { total: 0, flagged: 0 };
    byRegion[r].total++;
    const dur =
      typeof d.DurationAvg === "number"
        ? d.DurationAvg
        : parseFloat(String(d.DurationAvg));
    if (dur > 5) byRegion[r].flagged++;
  }

  const maxVal = Math.max(...Object.values(byRegion).map((v) => v.total), 1);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
      <div className="text-[13px] font-bold text-gray-800 dark:text-gray-200 mb-4">
        Volume &amp; SLA Breaches by Region
      </div>

      <div className="flex justify-around items-end h-28 px-1">
        {regions.map((r) => {
          const pct = (byRegion[r].total / maxVal) * 100;
          const fpct = (byRegion[r].flagged / maxVal) * 100;
          const breachRate =
            byRegion[r].total > 0
              ? Math.round((byRegion[r].flagged / byRegion[r].total) * 100)
              : 0;
          const barColor = REGION_COLORS[r] ?? "bg-gray-400";

          return (
            <div key={r} className="text-center flex-1">
              <div className="flex gap-0.5 justify-center items-end h-[70px]">
                <div
                  className={`w-5 ${barColor} opacity-80 rounded-t transition-all duration-400`}
                  style={{ height: `${pct}%`, minHeight: 3 }}
                />
                {byRegion[r].flagged > 0 && (
                  <div
                    className="w-5 bg-red-500 opacity-70 rounded-t transition-all duration-400"
                    style={{ height: `${fpct}%`, minHeight: 3 }}
                  />
                )}
              </div>
              <div className="text-[10px] font-bold text-gray-500 mt-2 tracking-wide">
                {r}
              </div>
              <div className="text-[17px] font-extrabold font-mono text-gray-800 dark:text-gray-200">
                {byRegion[r].total}
              </div>
              <div
                className={`text-[9px] font-semibold ${
                  breachRate > 40 ? "text-red-500" : "text-gray-400"
                }`}
              >
                {breachRate}% breach
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-3">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> Total
        </span>
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> Breach
          (&gt;5h)
        </span>
      </div>
    </div>
  );
}
