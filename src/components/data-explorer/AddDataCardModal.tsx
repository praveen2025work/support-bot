"use client";

import { useState } from "react";
import { X, BarChart3, Table2, Layers, Hash, List } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type { DataCard, DataCardType, CardLayout, SchemaResponse } from "./types";

interface AddDataCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (card: DataCard, layout: CardLayout) => void;
  schema: SchemaResponse | null;
}

const CARD_TYPES: { type: DataCardType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "kpi", label: "KPI Tile", icon: <Hash size={16} />, desc: "Single metric (avg, sum, count, min, max)" },
  { type: "chart", label: "Chart", icon: <BarChart3 size={16} />, desc: "Auto-detected or pinned chart type" },
  { type: "table", label: "Data Table", icon: <Table2 size={16} />, desc: "Sortable paginated table" },
  { type: "lineage", label: "Lineage Flow", icon: <Layers size={16} />, desc: "PnL lineage flow diagram" },
  { type: "summary", label: "Summary Metrics", icon: <List size={16} />, desc: "Auto-generated KPI row from all numeric columns" },
];

const OPERATIONS = ["avg", "sum", "count", "min", "max"] as const;
const COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2"];

function genId() {
  return `dc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function AddDataCardModal({
  isOpen,
  onClose,
  onAdd,
  schema,
}: AddDataCardModalProps) {
  const [cardType, setCardType] = useState<DataCardType>("kpi");
  const [label, setLabel] = useState("");

  // KPI
  const [kpiColumn, setKpiColumn] = useState("");
  const [kpiOp, setKpiOp] = useState<(typeof OPERATIONS)[number]>("avg");
  const [kpiColor, setKpiColor] = useState(COLORS[0]);

  // Chart
  const [chartType, setChartType] = useState("auto");

  // Table
  const [tablePageSize, setTablePageSize] = useState(25);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const numericCols = schema?.schema.filter(
    (c) => c.type === "integer" || c.type === "decimal" || c.type === "number",
  ) ?? [];

  const hasLineage =
    schema?.schema.some((c) => c.name === "NamedPnlName") &&
    schema?.schema.some((c) => c.name === "MasterBookID");

  const handleAdd = () => {
    const id = genId();
    const card: DataCard = {
      id,
      type: cardType,
      label: label || `${cardType} card`,
    };

    // Default layout based on type
    let layout: CardLayout = { i: id, x: 0, y: 100, w: 6, h: 5, minW: 3, minH: 3 };

    switch (cardType) {
      case "kpi":
        card.kpiConfig = {
          column: kpiColumn || numericCols[0]?.name || "",
          operation: kpiOp,
          color: kpiColor,
        };
        card.label = label || `${kpiOp} ${kpiColumn}`;
        layout = { i: id, x: 0, y: 100, w: 3, h: 2, minW: 2, minH: 2 };
        break;
      case "chart":
        card.chartConfig = {
          chartType: chartType === "auto" ? undefined : chartType,
        };
        card.label = label || "Chart";
        layout = { i: id, x: 0, y: 100, w: 6, h: 5, minW: 4, minH: 4 };
        break;
      case "table":
        card.tableConfig = { pageSize: tablePageSize };
        card.label = label || "Data Table";
        layout = { i: id, x: 0, y: 100, w: 12, h: 6, minW: 6, minH: 4 };
        break;
      case "lineage":
        card.lineageConfig = {};
        card.label = label || "Lineage Flow";
        layout = { i: id, x: 0, y: 100, w: 12, h: 6, minW: 8, minH: 4 };
        break;
      case "summary":
        card.label = label || "Summary Metrics";
        layout = { i: id, x: 0, y: 100, w: 12, h: 4, minW: 6, minH: 3 };
        break;
    }

    onAdd(card, layout);
    onClose();
    // Reset
    setLabel("");
    setCardType("kpi");
  };

  const inputCls =
    "w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand)] outline-none";
  const selectCls =
    "w-full text-sm px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-primary)] rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Add Card
          </h3>
          <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)]">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Card type */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Card Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CARD_TYPES.filter(
                (t) => t.type !== "lineage" || hasLineage,
              ).map((t) => (
                <button
                  key={t.type}
                  onClick={() => setCardType(t.type)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                    cardType === t.type
                      ? "border-[var(--brand)] bg-[var(--brand-subtle)] text-[var(--brand)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)]"
                  }`}
                >
                  {t.icon}
                  <div>
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[10px] opacity-60">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`e.g., Avg ${numericCols[0]?.name ?? "metric"}`}
              className={inputCls}
            />
          </div>

          {/* KPI config */}
          {cardType === "kpi" && (
            <div className="space-y-3 border border-[var(--border)] rounded-lg p-4">
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">KPI Configuration</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Column</label>
                  <select value={kpiColumn} onChange={(e) => setKpiColumn(e.target.value)} className={selectCls}>
                    <option value="">Select column</option>
                    {numericCols.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Operation</label>
                  <select value={kpiOp} onChange={(e) => setKpiOp(e.target.value as typeof kpiOp)} className={selectCls}>
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
                        kpiColor === c ? "border-[var(--text-primary)] scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chart config */}
          {cardType === "chart" && (
            <div className="space-y-3 border border-[var(--border)] rounded-lg p-4">
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Chart Configuration</div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Chart Type</label>
                <select value={chartType} onChange={(e) => setChartType(e.target.value)} className={selectCls}>
                  <option value="auto">Auto-detect</option>
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="pie">Pie</option>
                  <option value="area">Area</option>
                  <option value="stacked-bar">Stacked Bar</option>
                  <option value="treemap">Treemap</option>
                </select>
              </div>
            </div>
          )}

          {/* Table config */}
          {cardType === "table" && (
            <div className="space-y-3 border border-[var(--border)] rounded-lg p-4">
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Table Configuration</div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Rows per page</label>
                <select value={tablePageSize} onChange={(e) => setTablePageSize(Number(e.target.value))} className={selectCls}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-secondary)]">
            Cancel
          </button>
          <button onClick={handleAdd} className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand)] hover:opacity-90 rounded-lg">
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
}
