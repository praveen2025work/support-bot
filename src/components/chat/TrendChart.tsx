"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function getToken(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export interface TrendDataPoint {
  x: number;
  y: number;
  label: string;
}

export interface TrendLinePoint {
  x: number;
  y: number;
}

interface TrendChartProps {
  dataPoints: TrendDataPoint[];
  trendLine: TrendLinePoint[];
  slope: number;
  rSquared: number;
  direction: "up" | "down" | "flat";
}

function getDirectionColor(direction: string): string {
  switch (direction) {
    case "up":
      return getToken("--success");
    case "down":
      return getToken("--danger");
    default:
      return getToken("--text-muted");
  }
}

const DIRECTION_LABELS: Record<string, string> = {
  up: "Upward",
  down: "Downward",
  flat: "Flat",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TrendDataPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  if (!point.label) return null;
  return (
    <div className="bg-white border border-gray-200 rounded px-2 py-1 shadow-sm text-[11px]">
      {point.label && (
        <div className="font-medium text-gray-700">{point.label}</div>
      )}
      <div className="text-gray-500">x: {point.x}</div>
      <div className="text-gray-500">y: {point.y}</div>
    </div>
  );
}

export default function TrendChart({
  dataPoints,
  trendLine,
  slope,
  rSquared,
  direction,
}: TrendChartProps) {
  const trendColor = getDirectionColor(direction);

  const combinedData = useMemo(() => {
    const all = new Map<
      number,
      { x: number; actual?: number; trend?: number; label?: string }
    >();

    for (const pt of dataPoints) {
      all.set(pt.x, { x: pt.x, actual: pt.y, label: pt.label });
    }

    for (const pt of trendLine) {
      const existing = all.get(pt.x);
      if (existing) {
        existing.trend = pt.y;
      } else {
        all.set(pt.x, { x: pt.x, trend: pt.y });
      }
    }

    return Array.from(all.values()).sort((a, b) => a.x - b.x);
  }, [dataPoints, trendLine]);

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">
          Trend Analysis
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ color: trendColor, backgroundColor: `${trendColor}15` }}
        >
          {DIRECTION_LABELS[direction]}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart
          data={combinedData}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={getToken("--border")} />
          <XAxis
            type="number"
            dataKey="x"
            tick={{ fontSize: 10, fill: getToken("--text-muted") }}
            stroke={getToken("--text-muted")}
          />
          <YAxis
            tick={{ fontSize: 10, fill: getToken("--text-muted") }}
            stroke={getToken("--text-muted")}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            dataKey="actual"
            fill="#3b82f6"
            fillOpacity={0.7}
            r={4}
            name="Actual"
          />
          <Line
            type="linear"
            dataKey="trend"
            stroke={trendColor}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Trend"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-1 text-[10px] text-gray-500">
        <div>
          Slope:{" "}
          <span className="font-medium text-gray-700">{slope.toFixed(4)}</span>
        </div>
        <div>
          R&sup2;:{" "}
          <span className="font-medium text-gray-700">
            {rSquared.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}
