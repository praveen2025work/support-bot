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

  if (format === "currency" || format === "percent") {
    return formatted;
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

function getThresholdColor(
  value: number | string,
  thresholds?: { warning: number; danger: number },
): string {
  if (!thresholds || typeof value !== "number") {
    return "text-gray-900";
  }
  if (value >= thresholds.danger) return "text-red-600";
  if (value >= thresholds.warning) return "text-amber-500";
  return "text-green-600";
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: "text-green-500", stroke: "#22c55e" },
  down: { icon: TrendingDown, color: "text-red-500", stroke: "#ef4444" },
  flat: { icon: Minus, color: "text-gray-400", stroke: "#9ca3af" },
} as const;

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  if (data.length < 2) return null;

  const width = 60;
  const height = 20;
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
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
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
  const valueColor = color ? "" : getThresholdColor(value, thresholds);
  const displayValue = formatValue(value, format, prefix, unit);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`}
      style={color ? { borderLeftWidth: 4, borderLeftColor: color } : undefined}
    >
      <p className="text-xs uppercase tracking-wider text-gray-500">{title}</p>

      <div className="mt-2 flex items-end justify-between">
        <span
          className={`text-2xl font-bold ${valueColor}`}
          style={color ? { color } : undefined}
        >
          {displayValue}
        </span>

        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} stroke={trendConfig.stroke} />
        )}
      </div>

      <div className="mt-2 flex items-center gap-1">
        <TrendIcon className={`h-4 w-4 ${trendConfig.color}`} />
        {changePercent !== null && (
          <span className={`text-sm font-medium ${trendConfig.color}`}>
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(1)}%
          </span>
        )}
      </div>

      {trendLabel && <p className="mt-1 text-xs text-gray-400">{trendLabel}</p>}
    </div>
  );
}
