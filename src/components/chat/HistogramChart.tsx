"use client";

function getToken(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
];

export interface HistogramBin {
  label: string;
  start: number;
  end: number;
  count: number;
}

export interface HistogramStats {
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
}

interface HistogramChartProps {
  bins: HistogramBin[];
  stats: HistogramStats;
  column: string;
}

export default function HistogramChart({
  bins,
  stats,
  column,
}: HistogramChartProps) {
  const chartData = bins.map((bin) => ({
    label: bin.label,
    count: bin.count,
  }));

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
      <div className="text-xs font-medium text-gray-600 mb-1">
        Distribution of {column}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={getToken("--border")} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: getToken("--text-muted") }}
            stroke={getToken("--text-muted")}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fontSize: 10, fill: getToken("--text-muted") }}
            stroke={getToken("--text-muted")}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              backgroundColor: getToken("--bg-primary"),
              borderColor: getToken("--border"),
            }}
            formatter={(value) => [String(value ?? ""), "Count"]}
          />
          <ReferenceLine
            x={
              bins.findIndex(
                (b) => stats.mean >= b.start && stats.mean < b.end,
              ) >= 0
                ? bins[
                    bins.findIndex(
                      (b) => stats.mean >= b.start && stats.mean < b.end,
                    )
                  ]?.label
                : undefined
            }
            stroke={getToken("--danger")}
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: "Mean",
              position: "top",
              fontSize: 9,
              fill: getToken("--danger"),
            }}
          />
          <ReferenceLine
            x={
              bins.findIndex(
                (b) => stats.median >= b.start && stats.median < b.end,
              ) >= 0
                ? bins[
                    bins.findIndex(
                      (b) => stats.median >= b.start && stats.median < b.end,
                    )
                  ]?.label
                : undefined
            }
            stroke={getToken("--success")}
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: "Median",
              position: "top",
              fontSize: 9,
              fill: getToken("--success"),
            }}
          />
          <Bar dataKey="count" fill={COLORS[0]} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-4 gap-2 mt-2 text-[10px] text-gray-500">
        <div className="text-center">
          <span className="block font-medium text-gray-700">
            {stats.mean.toFixed(2)}
          </span>
          Mean
        </div>
        <div className="text-center">
          <span className="block font-medium text-gray-700">
            {stats.median.toFixed(2)}
          </span>
          Median
        </div>
        <div className="text-center">
          <span className="block font-medium text-gray-700">
            {stats.stdDev.toFixed(2)}
          </span>
          Std Dev
        </div>
        <div className="text-center">
          <span className="block font-medium text-gray-700">
            {stats.skewness.toFixed(2)}
          </span>
          Skewness
        </div>
      </div>
    </div>
  );
}
