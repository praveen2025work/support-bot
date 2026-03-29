"use client";

import { useState, useMemo } from "react";
import type { LineageRow } from "../LineageFlowDiagram";

const REGION_BADGE: Record<string, string> = {
  NAM: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  EMEA: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  APAC: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  LATAM: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
};

const COLS: { key: string; label: string; mono?: boolean }[] = [
  { key: "NamedPnlName", label: "Named P&L" },
  { key: "MasterBookID", label: "Master Book", mono: true },
  { key: "FeedName", label: "Feed" },
  { key: "Region", label: "Region" },
  { key: "Avg_CompletedOnTime", label: "BOFC Avg (IST)", mono: true },
  { key: "Avg_DelTimePCLocationTime", label: "Del Avg (IST)", mono: true },
  { key: "DurationAvg", label: "Dur Avg (h)", mono: true },
  { key: "DurationMax", label: "Dur Max (h)", mono: true },
  { key: "DurationMin", label: "Dur Min (h)", mono: true },
];

interface LineageDataTableProps {
  data: LineageRow[];
  selectedPnl: string | null;
  onSelectPnl: (name: string) => void;
}

export function LineageDataTable({
  data,
  selectedPnl,
  onSelectPnl,
}: LineageDataTableProps) {
  const [sortCol, setSortCol] = useState("DurationAvg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [data, sortCol, sortDir]);

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
          P&L Detail Grid — {data.length.toLocaleString()} records
          <span className="text-[10px] text-gray-400 font-medium ml-2">
            SLA Rule: DurationAvg &gt; 5 hours = Breach
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          Page {page + 1}/{totalPages || 1}
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            className="px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs"
          >
            ‹
          </button>
          <button
            onClick={() => setPage(Math.min((totalPages || 1) - 1, page + 1))}
            className="px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs"
          >
            ›
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ maxHeight: 540 }}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-gray-400 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-[1] w-8">
                SLA
              </th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 cursor-pointer select-none whitespace-nowrap z-[1] hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {c.label}{" "}
                  {sortCol === c.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => {
              const dur =
                typeof row.DurationAvg === "number"
                  ? row.DurationAvg
                  : parseFloat(String(row.DurationAvg));
              const flagged = dur > 5;
              const sel = row.NamedPnlName === selectedPnl;

              return (
                <tr
                  key={`${row.MasterBookID}-${row.FeedName}-${idx}`}
                  onClick={() => onSelectPnl(row.NamedPnlName)}
                  className={`cursor-pointer transition-colors ${
                    sel
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : flagged
                        ? "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {/* SLA dot */}
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 text-center">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        flagged
                          ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                          : "bg-emerald-500 opacity-60"
                      }`}
                    />
                  </td>

                  {COLS.map((c) => {
                    let content: React.ReactNode = String(row[c.key] ?? "");

                    if (c.key === "Region") {
                      const cls =
                        REGION_BADGE[String(row.Region)] ??
                        "bg-gray-100 text-gray-500";
                      content = (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${cls}`}
                        >
                          {String(row.Region)}
                        </span>
                      );
                    }

                    if (c.key === "DurationAvg") {
                      content = (
                        <span
                          className={`font-bold ${flagged ? "text-red-500" : "text-emerald-500"}`}
                        >
                          {dur}h
                        </span>
                      );
                    }

                    if (c.key === "DurationMax")
                      content = `${row.DurationMax}h`;
                    if (c.key === "DurationMin")
                      content = `${row.DurationMin}h`;

                    return (
                      <td
                        key={c.key}
                        className={`px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 ${
                          c.mono ? "font-mono text-[11px]" : ""
                        } ${c.key === "NamedPnlName" ? "font-semibold" : ""} text-gray-700 dark:text-gray-300`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
