'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  date: string;
  value: number;
}

interface ForecastChartProps {
  historical: DataPoint[];
  predicted: DataPoint[];
  valueLabel?: string;
}

export default function ForecastChart({
  historical,
  predicted,
  valueLabel,
}: ForecastChartProps) {
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; historical?: number; predicted?: number }>();

    for (const pt of historical) {
      dataMap.set(pt.date, { date: pt.date, historical: pt.value });
    }

    // Connect the lines: include the last historical point in predicted series
    const lastHistorical = historical[historical.length - 1];
    if (lastHistorical) {
      const existing = dataMap.get(lastHistorical.date);
      if (existing) {
        existing.predicted = lastHistorical.value;
      }
    }

    for (const pt of predicted) {
      const existing = dataMap.get(pt.date);
      if (existing) {
        existing.predicted = pt.value;
      } else {
        dataMap.set(pt.date, { date: pt.date, predicted: pt.value });
      }
    }

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [historical, predicted]);

  const label = valueLabel || 'Value';

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
      <div className="text-xs font-medium text-gray-600 mb-1">
        Forecast: {label}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
          />
          <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="historical"
            name={`${label} (Actual)`}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            name={`${label} (Forecast)`}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 2 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
