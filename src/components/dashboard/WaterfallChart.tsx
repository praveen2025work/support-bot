"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface WaterfallChartProps {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  height?: number;
}

interface WaterfallDatum {
  name: string;
  value: number;
  start: number;
  end: number;
  invisible: number;
  visible: number;
  isPositive: boolean;
  isTotal: boolean;
  cumulative: number;
}

const COLOR_POSITIVE = "#10b981";
const COLOR_NEGATIVE = "#ef4444";
const COLOR_TOTAL = "#3b82f6";

function getBarColor(datum: WaterfallDatum): string {
  if (datum.isTotal) return COLOR_TOTAL;
  return datum.isPositive ? COLOR_POSITIVE : COLOR_NEGATIVE;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: WaterfallDatum }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const datum = payload[0].payload;
  const sign = datum.value >= 0 ? "+" : "";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>{datum.name}</p>
      <p style={{ margin: "4px 0 0", color: getBarColor(datum) }}>
        {sign}
        {datum.value.toLocaleString()}
      </p>
    </div>
  );
}

export function WaterfallChart({
  data,
  labelKey,
  valueKey,
  height = 220,
}: WaterfallChartProps) {
  const waterfallData = useMemo(() => {
    const result: WaterfallDatum[] = [];
    data.reduce((acc, row, i) => {
      const val = Number(row[valueKey]) || 0;
      const start = acc;
      const end = acc + val;
      result.push({
        name: String(row[labelKey] ?? ""),
        value: val,
        start: Math.min(start, end),
        end: Math.max(start, end),
        invisible: Math.min(start, end),
        visible: Math.abs(val),
        isPositive: val >= 0,
        isTotal: i === data.length - 1,
        cumulative: end,
      });
      return end;
    }, 0);
    return result;
  }, [data, labelKey, valueKey]);

  if (waterfallData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={waterfallData}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
        <Bar
          dataKey="invisible"
          stackId="waterfall"
          fill="transparent"
          isAnimationActive={false}
        />
        <Bar dataKey="visible" stackId="waterfall" radius={[3, 3, 0, 0]}>
          {waterfallData.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
