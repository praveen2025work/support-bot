"use client";

import { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

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

interface TreemapChartProps {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  height?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomContent = (props: any) => {
  const { x, y, width, height, name, value, fill } = props;
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        fill="#fff"
        fontSize={11}
        fontWeight={600}
      >
        {String(name).length > 15 ? String(name).slice(0, 14) + "\u2026" : name}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        fill="rgba(255,255,255,0.8)"
        fontSize={10}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </text>
    </g>
  );
};

export function TreemapChart({
  data,
  labelKey,
  valueKey,
  height = 220,
}: TreemapChartProps) {
  const treemapData = useMemo(
    () => ({
      name: "root",
      children: data.slice(0, 30).map((row, i) => ({
        name: String(row[labelKey] ?? `Item ${i + 1}`),
        size: Math.abs(Number(row[valueKey]) || 0),
        fill: COLORS[i % COLORS.length],
      })),
    }),
    [data, labelKey, valueKey],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={treemapData.children}
        dataKey="size"
        nameKey="name"
        content={<CustomContent />}
      >
        <Tooltip />
      </Treemap>
    </ResponsiveContainer>
  );
}
