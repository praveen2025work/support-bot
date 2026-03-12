'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = [
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
];

type ChartType = 'line' | 'bar' | 'pie' | 'none';

interface ChartDetection {
  type: ChartType;
  labelKey: string;
  numericKeys: string[];
}

const DATE_NAME_PATTERN =
  /^(date|month|year|day|week|time|period|timestamp|created|updated|cohort)/i;

function isDateColumn(key: string, data: Record<string, unknown>[]): boolean {
  if (DATE_NAME_PATTERN.test(key)) return true;
  const sample = data.slice(0, 5).map((r) => String(r[key] ?? ''));
  return sample.every(
    (v) =>
      /^\d{4}[-/]/.test(v) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(v)
  );
}

function detectChartType(
  data: Record<string, unknown>[],
  headers?: string[]
): ChartDetection {
  if (!data || data.length < 2)
    return { type: 'none', labelKey: '', numericKeys: [] };

  const keys = headers ?? Object.keys(data[0]);

  const numericKeys = keys.filter((key) => {
    const numericCount = data.filter((row) => {
      const val = row[key];
      return (
        val !== null && val !== undefined && val !== '' && !isNaN(Number(val))
      );
    }).length;
    return numericCount / data.length > 0.8;
  });

  if (numericKeys.length === 0)
    return { type: 'none', labelKey: '', numericKeys: [] };

  const nonNumericKeys = keys.filter((k) => !numericKeys.includes(k));
  const labelKey = nonNumericKeys[0] || keys[0];

  // Date label + numeric columns → LineChart
  if (isDateColumn(labelKey, data) && numericKeys.length >= 1) {
    return { type: 'line', labelKey, numericKeys: numericKeys.slice(0, 3) };
  }

  // Single numeric + few categories → PieChart
  if (
    numericKeys.length === 1 &&
    data.length <= 8 &&
    nonNumericKeys.length >= 1
  ) {
    return { type: 'pie', labelKey, numericKeys };
  }

  // String label + numeric columns → BarChart
  if (nonNumericKeys.length >= 1 && numericKeys.length >= 1) {
    return { type: 'bar', labelKey, numericKeys: numericKeys.slice(0, 3) };
  }

  return { type: 'none', labelKey: '', numericKeys: [] };
}

export function DataChart({
  data,
  headers,
}: {
  data: Record<string, unknown>[];
  headers?: string[];
}) {
  const detection = useMemo(() => detectChartType(data, headers), [data, headers]);

  const chartData = useMemo(() => {
    if (detection.type === 'none') return [];
    return data.slice(0, 30).map((row) => {
      const entry: Record<string, unknown> = {
        [detection.labelKey]: row[detection.labelKey],
      };
      for (const key of detection.numericKeys) {
        entry[key] = Number(row[key]) || 0;
      }
      return entry;
    });
  }, [data, detection]);

  if (detection.type === 'none') return null;

  const chartHeight = 220;

  switch (detection.type) {
    case 'line':
      return (
        <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={detection.labelKey}
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              {detection.numericKeys.length > 1 && (
                <Legend wrapperStyle={{ fontSize: 10 }} />
              )}
              {detection.numericKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'bar':
      return (
        <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={detection.labelKey}
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              {detection.numericKeys.length > 1 && (
                <Legend wrapperStyle={{ fontSize: 10 }} />
              )}
              {detection.numericKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[i % COLORS.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'pie':
      return (
        <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={detection.numericKeys[0]}
                nameKey={detection.labelKey}
                cx="50%"
                cy="50%"
                outerRadius={75}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={10}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );

    default:
      return null;
  }
}
