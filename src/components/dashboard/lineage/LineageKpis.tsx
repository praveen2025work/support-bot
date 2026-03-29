"use client";

import { useMemo } from "react";
import type { LineageRow } from "../LineageFlowDiagram";

interface LineageKpisProps {
  data: LineageRow[];
}

interface KpiItem {
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  sub?: string;
}

export function LineageKpis({ data }: LineageKpisProps) {
  const kpis = useMemo((): KpiItem[] => {
    const total = data.length;
    const flagged = data.filter((d) => {
      const dur =
        typeof d.DurationAvg === "number"
          ? d.DurationAvg
          : parseFloat(String(d.DurationAvg));
      return dur > 5;
    }).length;
    const avgDur =
      total > 0
        ? (
            data.reduce((s, d) => {
              const dur =
                typeof d.DurationAvg === "number"
                  ? d.DurationAvg
                  : parseFloat(String(d.DurationAvg));
              return s + dur;
            }, 0) / total
          ).toFixed(1)
        : "0";
    const uniqueNpls = new Set(data.map((d) => d.NamedPnlName)).size;
    const uniqueBooks = new Set(data.map((d) => d.MasterBookID)).size;

    const breachPct = total > 0 ? ((flagged / total) * 100).toFixed(0) : "0";

    return [
      {
        label: "Total Records",
        value: total.toLocaleString(),
        color: "border-blue-500",
      },
      {
        label: "SLA Breaches (>5h)",
        value: flagged,
        suffix: ` (${breachPct}%)`,
        color: "border-red-500",
        sub: "DurationAvg exceeds 5 hours",
      },
      {
        label: "Avg Duration",
        value: avgDur,
        suffix: " hours",
        color: parseFloat(avgDur) > 5 ? "border-red-500" : "border-emerald-500",
        sub: "BOFC CompletedOn → Delivery PC",
      },
      { label: "Named P&Ls", value: uniqueNpls, color: "border-blue-500" },
      { label: "Master Books", value: uniqueBooks, color: "border-purple-500" },
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((k) => (
        <div
          key={k.label}
          className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 shadow-sm relative overflow-hidden border-l-4 ${k.color}`}
        >
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            {k.label}
          </div>
          <div className="text-2xl font-extrabold font-mono leading-tight text-gray-800 dark:text-gray-100">
            {k.value}
            {k.suffix && (
              <span className="text-[13px] font-semibold text-gray-400 ml-1">
                {k.suffix}
              </span>
            )}
          </div>
          {k.sub && (
            <div className="text-[10px] text-gray-400 mt-1 font-medium">
              {k.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
