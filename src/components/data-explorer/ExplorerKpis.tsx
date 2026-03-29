"use client";

import { useMemo } from "react";
import type { ColumnSchema } from "./types";

interface SummaryConfig {
  columns?: string[];
  showMinMax?: boolean;
}

interface ExplorerKpisProps {
  rows: Record<string, string | number>[];
  schema: ColumnSchema[];
  summaryConfig?: SummaryConfig;
}

export function ExplorerKpis({ rows, schema, summaryConfig }: ExplorerKpisProps) {
  const showMinMax = summaryConfig?.showMinMax ?? true;
  const allowedColumns = summaryConfig?.columns;

  const kpis = useMemo(() => {
    if (rows.length === 0) return [];

    let numCols = schema.filter(
      (c) =>
        c.type === "numeric" || c.type === "integer" || c.type === "decimal",
    );

    // Filter to allowed columns if configured
    if (allowedColumns && allowedColumns.length > 0) {
      numCols = numCols.filter((c) => allowedColumns.includes(c.name));
    }

    numCols = numCols.slice(0, 6); // max 6 KPIs

    const results: Array<{
      label: string;
      value: string;
      sub: string;
      color: string;
    }> = [
      {
        label: "Total Records",
        value: rows.length.toLocaleString(),
        sub: "",
        color: "border-[var(--brand)]",
      },
    ];

    for (const col of numCols) {
      const vals = rows
        .map((r) => {
          const v = r[col.name];
          return typeof v === "number" ? v : parseFloat(String(v));
        })
        .filter((v) => !isNaN(v));

      if (vals.length === 0) continue;

      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sub = showMinMax
        ? `min: ${Math.min(...vals).toFixed(1)}, max: ${Math.max(...vals).toFixed(1)}`
        : "";

      results.push({
        label: `Avg ${col.name}`,
        value: avg.toFixed(avg < 10 ? 2 : 0),
        sub,
        color: "border-emerald-500",
      });
    }

    return results;
  }, [rows, schema, allowedColumns, showMinMax]);

  if (kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {kpis.map((k) => (
        <div
          key={k.label}
          className={`bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-sm border-l-4 ${k.color}`}
        >
          <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
            {k.label}
          </div>
          <div className="text-xl font-extrabold font-mono text-[var(--text-primary)] leading-tight">
            {k.value}
          </div>
          {k.sub && (
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{k.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
