"use client";

import { useMemo, useState } from "react";
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
  Treemap,
  ReferenceLine,
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

export type ChartType =
  | "line"
  | "bar"
  | "pie"
  | "area"
  | "stacked-bar"
  | "stacked-area"
  | "gauge"
  | "waterfall"
  | "treemap"
  | "none";

export interface ChartConfig {
  defaultType?: ChartType;
  labelKey?: string;
  valueKeys?: string[];
  height?: number;
  stacked?: boolean;
  showLegend?: boolean;
}

export interface ColumnConfig {
  idColumns?: string[];
  dateColumns?: string[];
  labelColumns?: string[];
  valueColumns?: string[];
  ignoreColumns?: string[];
}

export interface DetectedColumnMeta {
  column: string;
  detectedType: "date" | "integer" | "decimal" | "id" | "string";
  format?: string;
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
  const sample = data.slice(0, 5).map((r) => String(r[key] ?? ""));
  return sample.every(
    (v) =>
      /^\d{4}[-/]/.test(v) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(v),
  );
}

function detectChartType(
  data: Record<string, unknown>[],
  headers?: string[],
  config?: ChartConfig,
  columnConfig?: ColumnConfig,
  columnMetadata?: DetectedColumnMeta[],
): ChartDetection {
  if (!data || data.length < 2)
    return { type: "none", labelKey: "", numericKeys: [] };

  const keys = headers ?? Object.keys(data[0]);

  // Build lookup from engine-detected column metadata
  const metaMap = new Map<string, DetectedColumnMeta>();
  if (columnMetadata) {
    for (const m of columnMetadata) metaMap.set(m.column.toLowerCase(), m);
  }

  // Build exclusion sets from columnConfig
  const idSet = new Set(
    (columnConfig?.idColumns || []).map((c) => c.toLowerCase()),
  );
  const dateExcludeSet = new Set(
    (columnConfig?.dateColumns || []).map((c) => c.toLowerCase()),
  );
  const ignoreSet = new Set(
    (columnConfig?.ignoreColumns || []).map((c) => c.toLowerCase()),
  );

  // If columnConfig specifies labelColumns, use first; else fall back to chartConfig
  const configLabelKey = columnConfig?.labelColumns?.[0]
    ? keys.find(
        (k) => k.toLowerCase() === columnConfig.labelColumns![0].toLowerCase(),
      )
    : config?.labelKey && keys.includes(config.labelKey)
      ? config.labelKey
      : undefined;

  // If columnConfig specifies valueColumns, use those; else fall back to chartConfig
  const explicitValueKeys =
    columnConfig?.valueColumns && columnConfig.valueColumns.length > 0
      ? (columnConfig.valueColumns
          .map((vc) => keys.find((k) => k.toLowerCase() === vc.toLowerCase()))
          .filter(Boolean) as string[])
      : config?.valueKeys?.filter((k) => keys.includes(k));

  const numericKeys =
    explicitValueKeys && explicitValueKeys.length > 0
      ? explicitValueKeys
      : keys.filter((key) => {
          const keyLower = key.toLowerCase();
          // Skip columns marked as ID, date, or ignored via columnConfig
          if (
            idSet.has(keyLower) ||
            dateExcludeSet.has(keyLower) ||
            ignoreSet.has(keyLower)
          )
            return false;
          // Use engine-detected metadata if available
          const meta = metaMap.get(keyLower);
          if (meta) {
            // Skip date, id, and string columns from numeric keys
            if (
              meta.detectedType === "date" ||
              meta.detectedType === "id" ||
              meta.detectedType === "string"
            )
              return false;
            // integer and decimal are numeric
            if (
              meta.detectedType === "integer" ||
              meta.detectedType === "decimal"
            )
              return true;
          }
          // Fallback: name-based and value-based detection
          if (ID_NAME_PATTERN.test(key)) return false;
          if (DATE_EXCLUDE_PATTERN.test(key)) return false;
          const numericCount = data.filter((row) => {
            const val = row[key];
            return (
              val !== null &&
              val !== undefined &&
              val !== "" &&
              !isNaN(Number(val))
            );
          }).length;
          return numericCount / data.length > 0.8;
        });

  if (numericKeys.length === 0)
    return { type: "none", labelKey: "", numericKeys: [] };

  const nonNumericKeys = keys.filter((k) => !numericKeys.includes(k));

  // If no explicit label key, prefer date columns from metadata as the label
  let autoLabelKey: string | undefined;
  if (!configLabelKey && columnMetadata) {
    const dateCol = keys.find((k) => {
      const meta = metaMap.get(k.toLowerCase());
      return meta?.detectedType === "date" && !numericKeys.includes(k);
    });
    if (dateCol) autoLabelKey = dateCol;
  }

  const labelKey =
    configLabelKey || autoLabelKey || nonNumericKeys[0] || keys[0];

  // If config specifies a default type, use it
  if (config?.defaultType && config.defaultType !== "none") {
    return {
      type: config.defaultType,
      labelKey,
      numericKeys: numericKeys.slice(0, 3),
    };
  }

  // Auto-detection: check if label is a date column (metadata first, then fallback)
  const labelMeta = metaMap.get(labelKey.toLowerCase());
  const labelIsDate =
    labelMeta?.detectedType === "date" || isDateColumn(labelKey, data);

  // Date label + numeric columns -> LineChart
  if (labelIsDate && numericKeys.length >= 1) {
    return { type: "line", labelKey, numericKeys: numericKeys.slice(0, 3) };
  }

  // Gauge: single row with 1 numeric value (KPI-like)
  if (data.length === 1 && numericKeys.length === 1) {
    return { type: "gauge", labelKey, numericKeys };
  }

  // Treemap: many categories (>8) with a single numeric value
  if (
    numericKeys.length === 1 &&
    data.length > 8 &&
    nonNumericKeys.length >= 1
  ) {
    return { type: "treemap", labelKey, numericKeys };
  }

  // Waterfall: sequential categories with mixed positive/negative values
  if (
    numericKeys.length === 1 &&
    nonNumericKeys.length >= 1 &&
    data.length >= 3 &&
    data.length <= 20
  ) {
    const values = data.map((row) => Number(row[numericKeys[0]]) || 0);
    const hasPositive = values.some((v) => v > 0);
    const hasNegative = values.some((v) => v < 0);
    if (hasPositive && hasNegative) {
      return { type: "waterfall", labelKey, numericKeys };
    }
  }

  // Single numeric + few categories -> PieChart
  if (
    numericKeys.length === 1 &&
    data.length <= 8 &&
    nonNumericKeys.length >= 1
  ) {
    return { type: "pie", labelKey, numericKeys };
  }

  // String label + numeric columns -> BarChart
  if (nonNumericKeys.length >= 1 && numericKeys.length >= 1) {
    return { type: "bar", labelKey, numericKeys: numericKeys.slice(0, 3) };
  }

  return { type: "none", labelKey: "", numericKeys: [] };
}

const CHART_TYPE_ICONS: { type: ChartType; label: string; icon: string }[] = [
  { type: "bar", label: "Bar", icon: "▐" },
  { type: "stacked-bar", label: "Stacked", icon: "▊" },
  { type: "line", label: "Line", icon: "⟋" },
  { type: "area", label: "Area", icon: "▨" },
  { type: "stacked-area", label: "Stack Area", icon: "▩" },
  { type: "pie", label: "Pie", icon: "◕" },
  { type: "gauge", label: "Gauge", icon: "◔" },
  { type: "waterfall", label: "Waterfall", icon: "▟" },
  { type: "treemap", label: "Treemap", icon: "▦" },
  { type: "none", label: "Hide", icon: "▭" },
];

function ChartToolbar({
  activeType,
  onTypeChange,
}: {
  activeType: ChartType;
  onTypeChange: (type: ChartType) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 mb-1">
      <span className="text-[10px] text-gray-400 mr-1">Chart:</span>
      {CHART_TYPE_ICONS.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => onTypeChange(type)}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
            activeType === type
              ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
              : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
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
  columnConfig,
  columnMetadata,
}: {
  data: Record<string, unknown>[];
  headers?: string[];
  chartConfig?: ChartConfig;
  columnConfig?: ColumnConfig;
  columnMetadata?: DetectedColumnMeta[];
}) {
  const detection = useMemo(
    () =>
      detectChartType(data, headers, chartConfig, columnConfig, columnMetadata),
    [data, headers, chartConfig, columnConfig, columnMetadata],
  );
  const [overrideType, setOverrideType] = useState<ChartType | null>(null);

  const activeType = overrideType ?? detection.type;

  const chartData = useMemo(() => {
    if (detection.labelKey === "" && detection.numericKeys.length === 0)
      return [];
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
  const showLegend =
    chartConfig?.showLegend ?? detection.numericKeys.length > 1;
  const stacked = chartConfig?.stacked ?? false;

  const renderChart = () => {
    switch (activeType) {
      case "line":
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

      case "bar":
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
                  stackId={stacked ? "stack" : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "stacked-bar":
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

      case "area":
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
                  stackId={stacked ? "stack" : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "stacked-area":
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

      case "pie": {
        const RADIAN = Math.PI / 180;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderPieLabel = (props: any) => {
          const cx = Number(props.cx ?? 0);
          const cy = Number(props.cy ?? 0);
          const midAngle = Number(props.midAngle ?? 0);
          const oR = Number(props.outerRadius ?? 0);
          const percent = Number(props.percent ?? 0);
          const name = String(props.name ?? "");
          const radius = oR + 18;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          if (percent < 0.03) return null;
          const displayName = name.length > 12 ? name.slice(0, 11) + "…" : name;
          return (
            <text
              x={x}
              y={y}
              fill="currentColor"
              textAnchor={x > cx ? "start" : "end"}
              dominantBaseline="central"
              fontSize={10}
              className="text-gray-600 dark:text-gray-400"
            >
              {`${displayName} ${(percent * 100).toFixed(0)}%`}
            </text>
          );
        };
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={detection.numericKeys[0]}
                nameKey={detection.labelKey}
                cx="50%"
                cy="50%"
                outerRadius={Math.min(chartHeight * 0.3, 75)}
                innerRadius={Math.min(chartHeight * 0.15, 35)}
                label={renderPieLabel}
                labelLine={{
                  stroke: "currentColor",
                  strokeWidth: 0.5,
                  strokeOpacity: 0.4,
                }}
                fontSize={10}
                paddingAngle={1}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "gauge": {
        // Gauge: show first numeric value as a semi-circular dial
        const gaugeValue = Number(
          chartData[0]?.[detection.numericKeys[0]] ?? 0,
        );
        const allValues = chartData.map((r) =>
          Number(r[detection.numericKeys[0]] ?? 0),
        );
        const gaugeMax = Math.max(...allValues, 100);
        const ratio = Math.min(Math.max(gaugeValue / gaugeMax, 0), 1);
        const gaugeColor =
          ratio < 0.6 ? "#10b981" : ratio < 0.8 ? "#f59e0b" : "#ef4444";
        const gaugeData = [
          { name: "value", value: ratio * 100 },
          { name: "empty", value: (1 - ratio) * 100 },
        ];
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="70%"
                startAngle={180}
                endAngle={0}
                innerRadius="60%"
                outerRadius="80%"
                dataKey="value"
                stroke="none"
              >
                <Cell fill={gaugeColor} />
                <Cell fill="#e5e7eb" />
              </Pie>
              <text
                x="50%"
                y="65%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-800 dark:fill-gray-200"
                fontSize={20}
                fontWeight={700}
              >
                {gaugeValue.toLocaleString()}
              </text>
              <text
                x="50%"
                y="80%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-400"
                fontSize={10}
              >
                {detection.numericKeys[0]} (max {gaugeMax.toLocaleString()})
              </text>
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "waterfall": {
        let cumulative = 0;
        const waterfallData = chartData.map((row) => {
          const val = Number(row[detection.numericKeys[0]] ?? 0);
          const start = cumulative;
          cumulative += val;
          return {
            name: String(row[detection.labelKey] ?? ""),
            invisible: Math.min(start, cumulative),
            visible: Math.abs(val),
            value: val,
            isPositive: val >= 0,
          };
        });
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={waterfallData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(v: unknown, name: unknown) =>
                  String(name) === "invisible" ? null : [Number(v), "Value"]
                }
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
              <Bar dataKey="invisible" stackId="waterfall" fill="transparent" />
              <Bar dataKey="visible" stackId="waterfall" radius={[2, 2, 0, 0]}>
                {waterfallData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isPositive ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case "treemap": {
        const treemapData = chartData.map((row, i) => ({
          name: String(row[detection.labelKey] ?? `Item ${i + 1}`),
          size: Math.abs(Number(row[detection.numericKeys[0]] ?? 0)),
          fill: COLORS[i % COLORS.length],
        }));
        const TreemapContent = (props: Record<string, unknown>) => {
          const { x, y, width, height, name, fill } = props as {
            x: number;
            y: number;
            width: number;
            height: number;
            name: string;
            fill: string;
          };
          if ((width as number) < 40 || (height as number) < 25) return null;
          const label =
            String(name ?? "").length > 15
              ? String(name ?? "").slice(0, 14) + "…"
              : String(name ?? "");
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
                y={y + height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={10}
                fontWeight={600}
              >
                {label}
              </text>
            </g>
          );
        };
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <Treemap
              data={treemapData}
              dataKey="size"
              nameKey="name"
              content={<TreemapContent />}
            >
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </Treemap>
          </ResponsiveContainer>
        );
      }

      case "none":
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
