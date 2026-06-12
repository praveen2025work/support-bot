"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type {
  KpiCardConfig,
  DashboardParameter,
  QueryInfo,
} from "@/types/dashboard";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface DashboardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    kpiCards?: KpiCardConfig[];
    parameters?: DashboardParameter[];
  }) => void;
  kpiCards: KpiCardConfig[];
  parameters: DashboardParameter[];
  availableQueries: QueryInfo[];
}

const PRESET_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

function emptyKpi(): KpiCardConfig {
  return {
    title: "",
    queryName: "",
    valueField: "count",
    groupByColumn: "",
    filterValue: "",
    color: PRESET_COLORS[0],
    format: "number",
  };
}

function emptyParam(): DashboardParameter {
  return {
    id: `param_${Date.now()}`,
    name: "",
    label: "",
    type: "select",
    queryName: "",
    key: "",
    defaultValue: "",
  };
}

/** Outer gate: only mounts the inner editor when open, so state resets naturally */
export function DashboardSettingsModal({
  isOpen,
  ...rest
}: DashboardSettingsModalProps) {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;
  return <DashboardSettingsEditor {...rest} />;
}

/** Inner editor — mounts fresh each time the modal opens */
function DashboardSettingsEditor({
  onClose,
  onSave,
  kpiCards: initialKpis,
  parameters: initialParams,
  availableQueries,
}: Omit<DashboardSettingsModalProps, "isOpen">) {
  const [activeTab, setActiveTab] = useState<"kpi" | "parameters">("kpi");
  const [kpis, setKpis] = useState<KpiCardConfig[]>(
    initialKpis.length > 0 ? [...initialKpis] : [],
  );
  const [params, setParams] = useState<DashboardParameter[]>(
    initialParams.length > 0 ? [...initialParams] : [],
  );

  const updateKpi = useCallback(
    (idx: number, partial: Partial<KpiCardConfig>) => {
      setKpis((prev) =>
        prev.map((k, i) => (i === idx ? { ...k, ...partial } : k)),
      );
    },
    [],
  );

  const updateParam = useCallback(
    (idx: number, partial: Partial<DashboardParameter>) => {
      setParams((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, ...partial } : p)),
      );
    },
    [],
  );

  const handleSave = () => {
    // Filter out empty entries
    const cleanKpis = kpis.filter((k) => k.title && k.queryName);
    const cleanParams = params.filter((p) => p.name && p.label);
    onSave({ kpiCards: cleanKpis, parameters: cleanParams });
    onClose();
  };

  const labelCls =
    "block text-xs font-medium text-[var(--text-secondary)] mb-1";
  const inputCls =
    "w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)]";
  const selectCls = `${inputCls} appearance-none`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Dashboard Settings
          </h2>
          <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-0.5">
            {(["kpi", "parameters"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab === "kpi" ? "KPI Tiles" : "Parameters"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3">
          {activeTab === "kpi" && (
            <>
              <p className="text-xs text-[var(--text-secondary)]">
                KPI tiles show live counts from a query, grouped by a column.
                Leave empty to disable KPI tiles.
              </p>
              {kpis.map((kpi, i) => (
                <div
                  key={i}
                  className="border border-[var(--border)] rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical
                        size={14}
                        className="text-[var(--text-muted)] cursor-grab"
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        Tile {i + 1}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setKpis((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Title</label>
                      <input
                        className={inputCls}
                        value={kpi.title}
                        onChange={(e) =>
                          updateKpi(i, { title: e.target.value })
                        }
                        placeholder="e.g., Critical Issues"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Query</label>
                      <select
                        className={selectCls}
                        value={kpi.queryName}
                        onChange={(e) =>
                          updateKpi(i, { queryName: e.target.value })
                        }
                      >
                        <option value="">Select query...</option>
                        {availableQueries.map((q) => (
                          <option key={q.name} value={q.name}>
                            {q.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Group By Column</label>
                      <input
                        className={inputCls}
                        value={kpi.groupByColumn ?? ""}
                        onChange={(e) =>
                          updateKpi(i, { groupByColumn: e.target.value })
                        }
                        placeholder="e.g., issue_type"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Filter Value</label>
                      <input
                        className={inputCls}
                        value={kpi.filterValue ?? ""}
                        onChange={(e) =>
                          updateKpi(i, { filterValue: e.target.value })
                        }
                        placeholder="e.g., critical"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <label className={labelCls}>Color</label>
                      <div className="flex gap-1">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateKpi(i, { color: c })}
                            className={`w-5 h-5 rounded-full border-2 transition-transform ${
                              kpi.color === c
                                ? "border-[var(--text-primary)] scale-110"
                                : "border-transparent hover:scale-110"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Format</label>
                      <select
                        className={selectCls}
                        value={kpi.format ?? "number"}
                        onChange={(e) =>
                          updateKpi(i, {
                            format: e.target.value as
                              | "number"
                              | "currency"
                              | "percent",
                          })
                        }
                      >
                        <option value="number">Number</option>
                        <option value="currency">Currency</option>
                        <option value="percent">Percent</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setKpis((prev) => [...prev, emptyKpi()])}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--brand)] border border-[var(--brand)] rounded-lg hover:bg-[var(--brand-subtle)]"
              >
                <Plus size={14} /> Add KPI Tile
              </button>
            </>
          )}

          {activeTab === "parameters" && (
            <>
              <p className="text-xs text-[var(--text-secondary)]">
                Parameters add dropdown filters at the top of the dashboard.
                When applied, they filter all cards and KPI tiles. Leave empty
                to disable.
              </p>
              {params.map((param, i) => (
                <div
                  key={param.id}
                  className="border border-[var(--border)] rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Filter {i + 1}
                    </span>
                    <button
                      onClick={() =>
                        setParams((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Label</label>
                      <input
                        className={inputCls}
                        value={param.label}
                        onChange={(e) =>
                          updateParam(i, {
                            label: e.target.value,
                            name: e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "_"),
                            key: e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "_"),
                          })
                        }
                        placeholder="e.g., Business Area"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Column Key</label>
                      <input
                        className={inputCls}
                        value={param.key ?? param.name}
                        onChange={(e) =>
                          updateParam(i, {
                            key: e.target.value,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g., businessarea"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Type</label>
                      <select
                        className={selectCls}
                        value={param.type}
                        onChange={(e) =>
                          updateParam(i, {
                            type: e.target.value as DashboardParameter["type"],
                          })
                        }
                      >
                        <option value="select">
                          Dropdown (auto-populated)
                        </option>
                        <option value="text">Text Input</option>
                        <option value="date">Date</option>
                        <option value="number">Number</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>
                        Source Query{" "}
                        <span className="text-[var(--text-muted)]">(for dropdown)</span>
                      </label>
                      <select
                        className={selectCls}
                        value={param.queryName ?? ""}
                        onChange={(e) =>
                          updateParam(i, { queryName: e.target.value })
                        }
                        disabled={param.type !== "select"}
                      >
                        <option value="">Select query...</option>
                        {availableQueries.map((q) => (
                          <option key={q.name} value={q.name}>
                            {q.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setParams((prev) => [...prev, emptyParam()])}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--brand)] border border-[var(--brand)] rounded-lg hover:bg-[var(--brand-subtle)]"
              >
                <Plus size={14} /> Add Parameter
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] flex justify-between items-center">
          <p className="text-xs text-[var(--text-muted)]">
            {kpis.length} KPI tile{kpis.length !== 1 ? "s" : ""} &middot;{" "}
            {params.length} parameter{params.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--text-primary)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-secondary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm text-white bg-[var(--brand)] rounded-lg hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
