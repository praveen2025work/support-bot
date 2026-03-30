"use client";

import { Pin } from "lucide-react";
import type { PinnedKpi } from "@/types/home-feed";

interface PinnedKpisProps {
  kpis: PinnedKpi[];
}

export function PinnedKpis({ kpis }: PinnedKpisProps) {
  if (kpis.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary,var(--border))]">
        <Pin className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
        <p className="text-[12px] text-[var(--text-muted)]">
          Pin KPIs from chat results or dashboards to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="flex-shrink-0 w-40 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-primary,var(--border))]"
        >
          <p className="text-[11px] text-[var(--text-muted)] truncate">
            {kpi.label}
          </p>
          <p className="text-[22px] font-semibold text-[var(--text-primary)] mt-1 truncate">
            —
          </p>
          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
            {kpi.queryName}
          </p>
        </div>
      ))}
    </div>
  );
}
