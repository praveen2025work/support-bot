'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
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

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'stacked-bar' | 'stacked-area' | 'none';

export interface ChartConfig {
  defaultType?: ChartType;
  labelKey?: string;
  valueKeys?: string[];
  height?: number;
  stacked?: boolean;
  showLegend?: boolean;
}

interface ChartDetection {
  type: ChartType;
  labelKey: string;
  numericKeys: string[];
}

// Broad date detection for chart label/x-axis (includes month, year, day, week, cohort)
const DATE_NAME_PATTERN =
  /(?:_|^)(date|month|year|day|week|time|period|timestamp|created|updated|cohort|asof|effective)$|date$|time$|^month$|^year$|^day$|^week$|^cohort$/i;

// Narrow date pattern for excluding from numeric chart values (only actual date/timestamp columns)
const DATE_EXCLUDE_PATTERN =
  /(?:_|^)(date|time|timestamp|datetime|created|updated|modified|asof|effective)$|date$|time$/i;

// Matches: stageid, stage_id, substageid, workflowprocessid, user_key, etc.
const ID_NAME_PATTERN =
  /(?:_|^)(id|key|code|index|seq|sequence|ref|reference|pk|fk)$|id$|key$/i;

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
  headers?: string[],
  config?: ChartConfig
): ChartDetection {
  if (!data || data.length < 2)
    return { type: 'none', labelKey: '', numericKeys: [] };

  const keys = headers ?? Object.keys(data[0]);

  // If config specifies labelKey and valueKeys, use them directly
  const configLabelKey = config?.labelKey && keys.includes(config.labelKey) ? config.labelKey : undefined;
  const configValueKeys = config?.valueKeys?.filter((k) => keys.includes(k));

  const numericKeys = configValueKeys && configValueKeys.length > 0
    ? configValueKeys
    : keys.filter((key) => {
        // Skip ID and date/timestamp columns — they're numeric but not meaningful to chart
        if (ID_NAME_PATTERN.test(key)) return false;
        if (DATE_EXCLUDE_PATTERN.test(key)) return false;
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
  const labelKey = configLabelKey || nonNumericKeys[0] || keys[0];

  // If config specifies a default type, use it
  if (config?.defaultType && config.defaultType !== 'none') {
    return { type: config.defaultType, labelKey, numericKeys: numericKeys.slice(0, 3) };
  }

  // Auto-detection fallback
  // Date label + numeric columns -> LineChart
  if (isDateColumn(labelKey, data) && numericKeys.length >= 1) {
    return { type: 'line', labelKey, numericKeys: numericKeys.slice(0, 3) };
  }

  // Single numeric + few categories -> PieChart
  if (
    numericKeys.length === 1 &&
    data.length <= 8 &&
    nonNumericKeys.length >= 1
  ) {
    return { type: 'pie', labelKey, numericKeys };
  }

  // String label + numeric columns -> BarChart
  if (nonNumericKeys.length >= 1 && numericKeys.length >= 1) {
    return { type: 'bar', labelKey, numericKeys: numericKeys.slice(0, 3) };
  }

  return { type: 'none', labelKey: '', numericKeys: [] };
}

const CHART_TYPE_ICONS: { type: ChartType; label: string; icon: string }[] = [
  { type: 'bar', label: 'Bar', icon: '▐' },
  { type: 'stacked-bar', label: 'Stacked', icon: '▊' },
  { type: 'line', label: 'Line', icon: '⟋' },
  { type: 'area', label: 'Area', icon: '▨' },
  { type: 'stacked-area', label: 'Stack Area', icon: '▩' },
  { type: 'pie', label: 'Pie', icon: '◕' },
  { type: 'none', label: 'Hide', icon: '▭' },
];

function ChartToolbar({
  activeType,
  onTypeChange,
}: {
  activeType: ChartType;
  onTypeChange: (type: ChartType) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-1">
      <span className="text-[10px] text-gray-400 mr-1">Chart:</span>
      {CHART_TYPE_ICONS.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => onTypeChange(type)}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            activeType === type
              ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
          }`}
          title={label}
        >
          <span className="mr-0.5">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

export function DataChart({
  data,
  headers,
  chartConfig,
}: {
  data: Record<string, unknown>[];
  headers?: string[];
  chartConfig?: ChartConfig;
}) {
  const detection = useMemo(() => detectChartType(data, headers, chartConfig), [data, headers, chartConfig]);
  const [overrideType, setOverrideType] = useState<ChartType | null>(null);

  const activeType = overrideType ?? detection.type;

  const chartData = useMemo(() => {
    if (detection.labelKey === '' && detection.numericKeys.length === 0) return [];
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

  if (detection.numericKeys.length === 0) return null;

  const chartHeight = chartConfig?.height || 220;
  const showLegend = chartConfig?.showLegend ?? detection.numericKeys.length > 1;
  const stacked = chartConfig?.stacked ?? false;

  const renderChart = () => {
    switch (activeType) {
      case 'line':
        return (
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
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
        );

      case 'bar':
        return (
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {detection.numericKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[i % COLORS.length]}
                  radius={[2, 2, 0, 0]}
                  stackId={stacked ? 'stack' : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'stacked-bar':
        return (
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {detection.numericKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[i % COLORS.length]}
                  radius={[2, 2, 0, 0]}
                  stackId="stack"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {detection.numericKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  stackId={stacked ? 'stack' : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'stacked-area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {detection.numericKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  stackId="stack"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
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
        );

      case 'none':
      default:
        return null;
    }
  };

  return (
    <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-white">
      <ChartToolbar activeType={activeType} onTypeChange={setOverrideType} />
      {renderChart()}
    </div>
  );
}
