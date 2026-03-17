'use client';

import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4',
  '#10b981', '#f59e0b', '#ef4444', '#ec4899',
];

interface ScatterPoint {
  x: number;
  y: number;
  cluster?: number;
  label?: string;
}

interface ScatterPlotProps {
  points: ScatterPoint[];
  xLabel?: string;
  yLabel?: string;
  title?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
  xLabel?: string;
  yLabel?: string;
}

function CustomTooltip({ active, payload, xLabel, yLabel }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded px-2 py-1 shadow-sm text-[11px]">
      {point.label && <div className="font-medium text-gray-700">{point.label}</div>}
      <div className="text-gray-500">
        {xLabel || 'x'}: {point.x.toFixed(2)}
      </div>
      <div className="text-gray-500">
        {yLabel || 'y'}: {point.y.toFixed(2)}
      </div>
      {point.cluster !== undefined && (
        <div className="text-gray-400">Cluster: {point.cluster}</div>
      )}
    </div>
  );
}

export default function ScatterPlot({ points, xLabel, yLabel, title }: ScatterPlotProps) {
  const clusteredData = useMemo(() => {
    const groups = new Map<number, ScatterPoint[]>();
    for (const pt of points) {
      const cluster = pt.cluster ?? 0;
      if (!groups.has(cluster)) groups.set(cluster, []);
      groups.get(cluster)!.push(pt);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [points]);

  const hasMultipleClusters = clusteredData.length > 1;

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
      {title && (
        <div className="text-xs font-medium text-gray-600 mb-1">{title}</div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel || 'x'}
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
            label={
              xLabel
                ? { value: xLabel, position: 'insideBottom', offset: -2, fontSize: 10, fill: '#6b7280' }
                : undefined
            }
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel || 'y'}
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#6b7280' }
                : undefined
            }
          />
          <Tooltip content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} />} />
          {hasMultipleClusters && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {clusteredData.map(([cluster, data], i) => (
            <Scatter
              key={cluster}
              name={`Cluster ${cluster}`}
              data={data}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.7}
              r={4}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
