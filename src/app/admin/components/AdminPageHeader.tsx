"use client";

import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right-aligned actions (buttons, filters). */
  actions?: ReactNode;
  /** Optional KPI strip rendered below the title row. */
  kpis?: ReactNode;
}

/**
 * Shared header for every page under /admin. Establishes a consistent
 * eyebrow + Sora display title + subtitle row and an action well on the
 * right. Designed to sit on a canvas-tone background.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  kpis,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 mb-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="font-display text-[24px] font-bold tracking-tight text-[var(--text-primary)] leading-tight mt-0.5">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">{actions}</div>
        )}
      </div>
      {kpis}
    </header>
  );
}

interface AdminKpiTileProps {
  label: string;
  value: number | string;
  sub?: string;
  tone?: string;
  icon?: ReactNode;
  progress?: number;
}

/**
 * Reusable KPI tile rendered under the admin header. Top accent stripe +
 * uppercase eyebrow + tabular numerals + optional sub-line and progress bar.
 */
export function AdminKpiTile({
  label,
  value,
  sub,
  tone = "var(--brand)",
  icon,
  progress,
}: AdminKpiTileProps) {
  return (
    <div className="relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3.5 overflow-hidden shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)] transition-all">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] opacity-80"
        style={{ backgroundColor: tone }}
      />
      <div className="flex items-start justify-between mb-1.5">
        <span className="eyebrow !text-[9.5px]">{label}</span>
        {icon && (
          <span style={{ color: tone }} className="shrink-0">
            {icon}
          </span>
        )}
      </div>
      <div className="numerals text-[22px] font-bold leading-none text-[var(--text-primary)]">
        {value}
      </div>
      {sub && (
        <div className="text-[10.5px] text-[var(--text-muted)] mt-1.5">
          {sub}
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-2 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              backgroundColor: tone,
            }}
          />
        </div>
      )}
    </div>
  );
}

interface DateRangePreset {
  label: string;
  value: string;
}

interface AdminDateRangeProps {
  value: string;
  onChange: (next: string) => void;
  presets?: DateRangePreset[];
}

const DEFAULT_PRESETS: DateRangePreset[] = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All", value: "all" },
];

/**
 * Compact Stitch-style range pill row used in headers of time-series
 * admin pages. Pure presentation — caller decides how to interpret the value.
 */
export function AdminDateRange({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
}: AdminDateRangeProps) {
  return (
    <div className="inline-flex items-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full p-0.5">
      {presets.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`px-3 py-1 text-[11.5px] font-semibold rounded-full transition-colors ${
              active
                ? "bg-[var(--bg-elevated)] text-[var(--brand)] shadow-[var(--shadow-xs)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
