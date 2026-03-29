"use client";

import { useState } from "react";
import type { DataViewPlugin, ColumnSchema } from "./types";
import { LineageFlowDiagram } from "@/components/dashboard/LineageFlowDiagram";

/* ─── Lineage Flow Plugin ────────────────────────────────────────── */
function LineageFlowView({
  data,
  allData,
}: {
  data: Record<string, string | number>[];
  schema: ColumnSchema[];
  allData?: Record<string, string | number>[];
}) {
  const sourceData = allData ?? data;
  const pnlNames = Array.from(
    new Set(sourceData.map((r) => String(r.NamedPnlName ?? ""))),
  )
    .filter(Boolean)
    .sort();
  const [selectedPnl, setSelectedPnl] = useState<string | null>(
    pnlNames[0] ?? null,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-semibold">Named P&L:</span>
        <select
          value={selectedPnl ?? ""}
          onChange={(e) => setSelectedPnl(e.target.value || null)}
          className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 min-w-[200px]"
        >
          <option value="">— Select —</option>
          {pnlNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <LineageFlowDiagram
        data={sourceData as unknown}
        selectedPnl={selectedPnl}
      />
    </div>
  );
}

/* ─── Plugin Registry ────────────────────────────────────────────── */
export const VIEW_PLUGINS: DataViewPlugin[] = [
  {
    id: "lineage-flow",
    label: "Lineage Flow",
    icon: "GitBranch",
    isApplicable: (schema) =>
      schema.some((c) => c.name === "NamedPnlName") &&
      schema.some((c) => c.name === "MasterBookID"),
    component: LineageFlowView,
  },
];

/**
 * Returns applicable plugins for the given schema.
 */
export function getApplicablePlugins(schema: ColumnSchema[]): DataViewPlugin[] {
  return VIEW_PLUGINS.filter((p) => p.isApplicable(schema));
}
