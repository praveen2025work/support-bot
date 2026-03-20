"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  thresholds?: { warning: number; danger: number };
  height?: number;
}

const DEFAULT_THRESHOLDS = { warning: 60, danger: 80 };

function getColor(
  value: number,
  thresholds: { warning: number; danger: number },
): string {
  if (value >= thresholds.danger) return "#ef4444";
  if (value >= thresholds.warning) return "#f59e0b";
  return "#22c55e";
}

export function GaugeChart({
  value,
  min = 0,
  max = 100,
  label,
  unit = "",
  thresholds = DEFAULT_THRESHOLDS,
  height = 180,
}: GaugeChartProps) {
  const clampedValue = Math.min(Math.max(value, min), max);
  const range = max - min;
  const filled = range === 0 ? 0 : ((clampedValue - min) / range) * 100;
  const remaining = 100 - filled;

  const data = [
    { name: "filled", value: filled },
    { name: "remaining", value: remaining },
  ];

  const fillColor = getColor(clampedValue, thresholds);

  return (
    <div className="flex flex-col items-center w-full">
      {label && (
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          {label}
        </span>
      )}
      <div style={{ width: "100%", height }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="90%"
              dataKey="value"
              stroke="none"
              isAnimationActive
            >
              <Cell fill={fillColor} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {clampedValue}
            {unit ? (
              <span className="text-base font-normal ml-0.5">{unit}</span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}
