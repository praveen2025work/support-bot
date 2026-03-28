"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type { DataCard, SchemaResponse } from "./types";

const OPERATIONS = ["avg", "sum", "count", "min", "max"] as const;
const COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2"];
const CHART_TYPES = [
  { value: "", label: "Auto-detect" },
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "pie", label: "Pie" },
  { value: "area", label: "Area" },
  { value: "stacked-bar", label: "Stacked Bar" },
  { value: "stacked-area", label: "Stacked Area" },
  { value: "treemap", label: "Treemap" },
  { value: "waterfall", label: "Waterfall" },
  { value: "gauge", label: "Gauge" },
];

interface DataCardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: DataCard;
  schema: SchemaResponse | null;
  onSave: (cardId: string, partial: Partial<DataCard>) => void;
}

export function DataCardSettingsModal({
  isOpen,
  onClose,
  card,
  schema,
  onSave,
}: DataCardSettingsModalProps) {
  // ── Shared state ──
  const [label, setLabel] = useState(card.label);
  const [groupBy, setGroupBy] = useState(card.groupBy ?? card.chartConfig?.groupBy ?? "");

  // ── KPI state ──
  const [kpiColumn, setKpiColumn] = useState(card.kpiConfig?.column ?? "");
  const [kpiOp, setKpiOp] = useState<(typeof OPERATIONS)[number]>(
    card.kpiConfig?.operation ?? "avg",
  );
  const [kpiColor, setKpiColor] = useState(card.kpiConfig?.color ?? COLORS[0]);
  const [kpiWarning, setKpiWarning] = useState<string>(
    card.kpiConfig?.thresholds?.warning?.toString() ?? "",
  );
  const [kpiDanger, setKpiDanger] = useState<string>(
    card.kpiConfig?.thresholds?.danger?.toString() ?? "",
  );

  // ── Chart state ──
  const [chartType, setChartType] = useState(card.chartConfig?.chartType ?? "");
  const [labelColumn, setLabelColumn] = useState(card.chartConfig?.labelColumn ?? "");
  const [valueColumns, setValueColumns] = useState<string[]>(card.chartConfig?.valueColumns ?? []);

  // ── Table state ──
  const [tablePageSize, setTablePageSize] = useState(card.tableConfig?.pageSize ?? 25);
  const [tableColumns, setTableColumns] = useState<string[]>(card.tableConfig?.columns ?? []);
  const [defaultSortCol, setDefaultSortCol] = useState(card.tableConfig?.defaultSort?.column ?? "");
  const [defaultSortDir, setDefaultSortDir] = useState<"asc" | "desc">(
    card.tableConfig?.defaultSort?.direction ?? "asc",
  );

  // ── Summary state ──
  const [summaryColumns, setSummaryColumns] = useState<string[]>(card.summaryConfig?.columns ?? []);
  const [showMinMax, setShowMinMax] = useState(card.summaryConfig?.showMinMax ?? true);

  // ── Lineage state ──
  const [lineagePnl, setLineagePnl] = useState(card.lineageConfig?.selectedPnl ?? "");
  const [lineageCompact, setLineageCompact] = useState(card.lineageConfig?.compact ?? true);

  // Reset state when card prop changes
  useEffect(() => {
    setLabel(card.label);
    setGroupBy(card.groupBy ?? card.chartConfig?.groupBy ?? "");
    setKpiColumn(card.kpiConfig?.column ?? "");
    setKpiOp(card.kpiConfig?.operation ?? "avg");
    setKpiColor(card.kpiConfig?.color ?? COLORS[0]);
    setKpiWarning(card.kpiConfig?.thresholds?.warning?.toString() ?? "");
    setKpiDanger(card.kpiConfig?.thresholds?.danger?.toString() ?? "");
    setChartType(card.chartConfig?.chartType ?? "");
    setLabelColumn(card.chartConfig?.labelColumn ?? "");
    setValueColumns(card.chartConfig?.valueColumns ?? []);
    setTablePageSize(card.tableConfig?.pageSize ?? 25);
    setTableColumns(card.tableConfig?.columns ?? []);
    setDefaultSortCol(card.tableConfig?.defaultSort?.column ?? "");
    setDefaultSortDir(card.tableConfig?.defaultSort?.direction ?? "asc");
    setSummaryColumns(card.summaryConfig?.columns ?? []);
    setShowMinMax(card.summaryConfig?.showMinMax ?? true);
    setLineagePnl(card.lineageConfig?.selectedPnl ?? "");
    setLineageCompact(card.lineageConfig?.compact ?? true);
  }, [card]);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const numericCols =
    schema?.schema.filter(
      (c) =>
        c.type === "integer" ||
        c.type === "decimal" ||
        c.type === "number",
    ) ?? [];

  const allCols = schema?.schema ?? [];
  const stringCols = allCols.filter((c) => c.type === "string" || c.type === "id");

  const handleSave = () => {
    const partial: Partial<DataCard> = { label };

    if (card.type === "kpi") {
      const thresholds =
        kpiWarning !== "" || kpiDanger !== ""
          ? {
              warning: kpiWarning !== "" ? Number(kpiWarning) : Infinity,
              danger: kpiDanger !== "" ? Number(kpiDanger) : Infinity,
            }
          : undefined;
      partial.kpiConfig = {
        column: kpiColumn,
        operation: kpiOp,
        color: kpiColor,
        thresholds,
      };
    }

    if (card.type === "chart") {
      partial.chartConfig = {
        ...card.chartConfig,
        chartType: chartType || undefined,
        groupBy: groupBy || undefined,
        labelColumn: labelColumn || undefined,
        valueColumns: valueColumns.length > 0 ? valueColumns : undefined,
      };
    }

    if (card.type === "table") {
      partial.tableConfig = {
        ...card.tableConfig,
        pageSize: tablePageSize,
        columns: tableColumns.length > 0 ? tableColumns : undefined,
        defaultSort: defaultSortCol
          ? { column: defaultSortCol, direction: defaultSortDir }
          : undefined,
      };
    }

    if (card.type === "summary") {
      partial.summaryConfig = {
        columns: summaryColumns.length > 0 ? summaryColumns : undefined,
        showMinMax,
      };
    }

    if (card.type === "lineage") {
      partial.lineageConfig = {
        selectedPnl: lineagePnl || undefined,
        compact: lineageCompact,
      };
    }

    if (groupBy && card.type !== "chart") {
      partial.groupBy = groupBy || undefined;
    }

    onSave(card.id, partial);
    onClose();
  };

  const toggleValueColumn = (col: string) => {
    setValueColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  const toggleTableColumn = (col: string) => {
    setTableColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  const toggleSummaryColumn = (col: string) => {
    setSummaryColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  const inputCls =
    "w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] outline-none";
  const selectCls =
    "w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]";
  const sectionCls =
    "border border-[var(--border)] rounded-lg p-4 space-y-3";
  const checkboxCls =
    "w-4 h-4 text-[var(--brand)] border-[var(--border)] rounded focus:ring-[var(--brand)]";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bg-primary)] rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Card Settings
            <span className="text-[var(--text-muted)] font-normal ml-2">— {card.type}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Label (all card types) */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Label
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* ── KPI Configuration ── */}
          {card.type === "kpi" && (
            <div className={sectionCls}>
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                KPI Configuration
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Column</label>
                  <select
                    value={kpiColumn}
                    onChange={(e) => setKpiColumn(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select column</option>
                    {numericCols.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Operation</label>
                  <select
                    value={kpiOp}
                    onChange={(e) => setKpiOp(e.target.value as typeof kpiOp)}
                    className={selectCls}
                  >
                    {OPERATIONS.map((o) => (
                      <option key={o} value={o}>{o.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setKpiColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        kpiColor === c
                          ? "border-[var(--text-primary)] scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {/* Thresholds */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Thresholds</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-amber-500 mb-0.5">Warning (&ge;)</label>
                    <input
                      type="number"
                      value={kpiWarning}
                      onChange={(e) => setKpiWarning(e.target.value)}
                      placeholder="e.g. 80"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-red-500 mb-0.5">Danger (&ge;)</label>
                    <input
                      type="number"
                      value={kpiDanger}
                      onChange={(e) => setKpiDanger(e.target.value)}
                      placeholder="e.g. 100"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Chart Configuration ── */}
          {card.type === "chart" && (
            <div className={sectionCls}>
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Chart Configuration
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Chart Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className={selectCls}
                >
                  {CHART_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Group By Column</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className={selectCls}
                >
                  <option value="">None</option>
                  {allCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Label Column (X-axis)</label>
                <select
                  value={labelColumn}
                  onChange={(e) => setLabelColumn(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Auto-detect</option>
                  {allCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Value Columns (Y-axis)
                  {valueColumns.length > 0 && (
                    <span className="ml-1 text-[var(--brand)]">({valueColumns.length} selected)</span>
                  )}
                </label>
                <div className="max-h-32 overflow-y-auto border border-[var(--border)] rounded-lg p-2 space-y-1">
                  {numericCols.length === 0 && (
                    <div className="text-xs text-[var(--text-muted)] italic">No numeric columns</div>
                  )}
                  {numericCols.map((c) => (
                    <label key={c.name} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-secondary)] px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={valueColumns.includes(c.name)}
                        onChange={() => toggleValueColumn(c.name)}
                        className={checkboxCls}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
                {valueColumns.length === 0 && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">Leave empty for auto-detection</div>
                )}
              </div>
            </div>
          )}

          {/* ── Table Configuration ── */}
          {card.type === "table" && (
            <div className={sectionCls}>
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Table Configuration
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Rows per page</label>
                <select
                  value={tablePageSize}
                  onChange={(e) => setTablePageSize(Number(e.target.value))}
                  className={selectCls}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              {/* Default Sort */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Default Sort</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <select
                      value={defaultSortCol}
                      onChange={(e) => setDefaultSortCol(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">No default sort</option>
                      {allCols.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={defaultSortDir}
                    onChange={(e) => setDefaultSortDir(e.target.value as "asc" | "desc")}
                    className={selectCls}
                    disabled={!defaultSortCol}
                  >
                    <option value="asc">ASC</option>
                    <option value="desc">DESC</option>
                  </select>
                </div>
              </div>
              {/* Column Visibility */}
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Visible Columns
                  {tableColumns.length > 0 && (
                    <span className="ml-1 text-[var(--brand)]">({tableColumns.length} selected)</span>
                  )}
                </label>
                <div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded-lg p-2 space-y-1">
                  {allCols.map((c) => (
                    <label key={c.name} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-secondary)] px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={tableColumns.length === 0 || tableColumns.includes(c.name)}
                        onChange={() => {
                          if (tableColumns.length === 0) {
                            // First click: select all except this one
                            setTableColumns(allCols.filter((col) => col.name !== c.name).map((col) => col.name));
                          } else {
                            toggleTableColumn(c.name);
                          }
                        }}
                        className={checkboxCls}
                      />
                      <span>{c.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] ml-auto">{c.type}</span>
                    </label>
                  ))}
                </div>
                {tableColumns.length === 0 && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">All columns shown (uncheck to hide)</div>
                )}
              </div>
            </div>
          )}

          {/* ── Summary Configuration ── */}
          {card.type === "summary" && (
            <div className={sectionCls}>
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Summary Configuration
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMinMax}
                  onChange={(e) => setShowMinMax(e.target.checked)}
                  className={checkboxCls}
                />
                Show min/max values
              </label>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Numeric Columns to Display
                  {summaryColumns.length > 0 && (
                    <span className="ml-1 text-[var(--brand)]">({summaryColumns.length} selected)</span>
                  )}
                </label>
                <div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded-lg p-2 space-y-1">
                  {numericCols.length === 0 && (
                    <div className="text-xs text-[var(--text-muted)] italic">No numeric columns</div>
                  )}
                  {numericCols.map((c) => (
                    <label key={c.name} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-secondary)] px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={summaryColumns.length === 0 || summaryColumns.includes(c.name)}
                        onChange={() => {
                          if (summaryColumns.length === 0) {
                            setSummaryColumns(numericCols.filter((col) => col.name !== c.name).map((col) => col.name));
                          } else {
                            toggleSummaryColumn(c.name);
                          }
                        }}
                        className={checkboxCls}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
                {summaryColumns.length === 0 && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">All numeric columns shown (uncheck to hide)</div>
                )}
              </div>
            </div>
          )}

          {/* ── Lineage Configuration ── */}
          {card.type === "lineage" && (
            <div className={sectionCls}>
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Lineage Configuration
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Default Named P&L</label>
                <select
                  value={lineagePnl}
                  onChange={(e) => setLineagePnl(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Auto (first available)</option>
                  {stringCols
                    .filter((c) => c.name.toLowerCase().includes("pnl") || c.name.toLowerCase().includes("named"))
                    .map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  {stringCols
                    .filter((c) => !c.name.toLowerCase().includes("pnl") && !c.name.toLowerCase().includes("named"))
                    .map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={lineageCompact}
                  onChange={(e) => setLineageCompact(e.target.checked)}
                  className={checkboxCls}
                />
                Compact mode
              </label>
            </div>
          )}

          {/* Card info */}
          <div className="text-[10px] text-[var(--text-muted)] space-y-0.5">
            <div>Card ID: {card.id}</div>
            <div>Type: {card.type}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-secondary)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand)] hover:opacity-90 rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
