"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface KpiCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  unit?: string;
  prefix?: string;
  format?: "number" | "currency" | "percent";
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  sparklineData?: number[];
  thresholds?: { warning: number; danger: number };
  /** Accent color for the value text (e.g., "#22c55e") */
  color?: string;
  className?: string;
}

function formatValue(
  value: number | string,
  format?: "number" | "currency" | "percent",
  prefix?: string,
  unit?: string,
): string {
  if (typeof value === "string") {
    return `${prefix ?? ""}${value}${unit ?? ""}`;
  }

  let formatted: string;
  switch (format) {
    case "currency":
      formatted = `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      break;
    case "percent":
      formatted = `${value.toLocaleString()}%`;
      break;
    default:
      formatted = `${prefix ?? ""}${value.toLocaleString()}${unit ?? ""}`;
      break;
  }

  return formatted;
}

function computeTrend(
  value: number | string,
  previousValue?: number,
  explicitTrend?: "up" | "down" | "flat",
): { direction: "up" | "down" | "flat"; changePercent: number | null } {
  if (explicitTrend) {
    const changePercent =
      typeof value === "number" &&
      previousValue !== undefined &&
      previousValue !== 0
        ? ((value - previousValue) / Math.abs(previousValue)) * 100
        : null;
    return { direction: explicitTrend, changePercent };
  }

  if (typeof value === "number" && previousValue !== undefined) {
    const diff = value - previousValue;
    const changePercent =
      previousValue !== 0 ? (diff / Math.abs(previousValue)) * 100 : null;

    if (diff > 0) return { direction: "up", changePercent };
    if (diff < 0) return { direction: "down", changePercent };
    return { direction: "flat", changePercent: 0 };
  }

  return { direction: "flat", changePercent: null };
}

function progressPercent(
  value: number | string,
  thresholds?: { warning: number; danger: number },
): number | null {
  if (typeof value !== "number") return null;
  const ceiling = thresholds?.danger ?? Math.max(Math.abs(value) * 1.5, 100);
  if (ceiling <= 0) return 0;
  return Math.min(100, Math.max(0, (Math.abs(value) / ceiling) * 100));
}

const TREND_CONFIG = {
  up: {
    icon: TrendingUp,
    color: "text-emerald-500",
    stroke: "#10b981",
  },
  down: {
    icon: TrendingDown,
    color: "text-rose-500",
    stroke: "#f43f5e",
  },
  flat: {
    icon: Minus,
    color: "text-slate-400",
    stroke: "#94a3b8",
  },
} as const;

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  if (data.length < 2) return null;

  const width = 72;
  const height = 22;
  const padding = 1;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({
  title,
  value,
  previousValue,
  unit,
  prefix,
  format,
  trend: explicitTrend,
  trendLabel,
  sparklineData,
  thresholds,
  color,
  className = "",
}: KpiCardProps) {
  const { direction, changePercent } = computeTrend(
    value,
    previousValue,
    explicitTrend,
  );
  const trendConfig = TREND_CONFIG[direction];
  const TrendIcon = trendConfig.icon;
  const displayValue = formatValue(value, format, prefix, unit);
  const fillPercent = progressPercent(value, thresholds);
  const accent = color ?? "var(--brand)";

  return (
    <div
      className={`group relative flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3.5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)] transition-all duration-200 overflow-hidden ${className}`}
    >
      {/* Subtle accent stripe */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] opacity-70"
        style={{ backgroundColor: accent }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] truncate">
          {title}
        </span>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} stroke={trendConfig.stroke} />
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className="numerals text-[24px] font-bold leading-none text-[var(--text-primary)]"
          style={color ? { color } : undefined}
        >
          {displayValue}
        </span>
        {changePercent !== null && (
          <span
            className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${trendConfig.color}`}
          >
            <TrendIcon className="h-3 w-3" />
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(1)}%
          </span>
        )}
        {trendLabel && changePercent === null && (
          <span className="text-[11px] text-[var(--text-muted)]">
            {trendLabel}
          </span>
        )}
      </div>

      {fillPercent !== null && (
        <div className="w-full h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mt-auto">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${fillPercent}%`, backgroundColor: accent }}
          />
        </div>
      )}
    </div>
  );
}
