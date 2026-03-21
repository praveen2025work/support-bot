"use client";

import { useState } from "react";
import { X, Plus, Trash2, Bell } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export interface AlertRule {
  id: string;
  column: string;
  operator: "gt" | "lt" | "eq" | "neq" | "between";
  threshold: string;
  threshold2?: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertRule[];
  columns: string[];
  onSave: (alerts: AlertRule[]) => void;
}

const SEVERITY_COLORS = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export function AlertConfigModal({
  isOpen,
  onClose,
  alerts: initialAlerts,
  columns,
  onSave,
}: AlertConfigModalProps) {
  const [rules, setRules] = useState<AlertRule[]>(initialAlerts);
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: `alert_${Date.now()}`,
        column: columns[0] || "",
        operator: "gt",
        threshold: "0",
        severity: "warning",
        message: "Value exceeded threshold",
      },
    ]);
  };

  const updateRule = (id: string, partial: Partial<AlertRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...partial } : r)),
    );
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[560px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Bell size={16} />
            Alert Rules
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No alert rules configured
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={rule.column}
                    onChange={(e) =>
                      updateRule(rule.id, { column: e.target.value })
                    }
                    className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rule.operator}
                    onChange={(e) =>
                      updateRule(rule.id, {
                        operator: e.target.value as AlertRule["operator"],
                      })
                    }
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                    <option value="eq">=</option>
                    <option value="neq">&ne;</option>
                    <option value="between">between</option>
                  </select>
                  <input
                    value={rule.threshold}
                    onChange={(e) =>
                      updateRule(rule.id, { threshold: e.target.value })
                    }
                    className="text-xs border border-gray-300 rounded px-2 py-1 w-20"
                    placeholder="Value"
                  />
                  {rule.operator === "between" && (
                    <input
                      value={rule.threshold2 || ""}
                      onChange={(e) =>
                        updateRule(rule.id, { threshold2: e.target.value })
                      }
                      className="text-xs border border-gray-300 rounded px-2 py-1 w-20"
                      placeholder="Max"
                    />
                  )}
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={rule.severity}
                    onChange={(e) =>
                      updateRule(rule.id, {
                        severity: e.target.value as AlertRule["severity"],
                      })
                    }
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${SEVERITY_COLORS[rule.severity]}`}
                  >
                    {rule.severity}
                  </span>
                  <input
                    value={rule.message}
                    onChange={(e) =>
                      updateRule(rule.id, { message: e.target.value })
                    }
                    className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                    placeholder="Alert message..."
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={addRule}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} />
            Add Rule
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(rules);
                onClose();
              }}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function evaluateAlerts(
  data: Record<string, unknown>[],
  alerts: AlertRule[],
): AlertRule[] {
  if (!alerts.length || !data.length) return [];

  const triggered: AlertRule[] = [];
  for (const rule of alerts) {
    const threshold = Number(rule.threshold);
    for (const row of data) {
      const val = Number(row[rule.column]);
      if (isNaN(val)) continue;

      let match = false;
      switch (rule.operator) {
        case "gt":
          match = val > threshold;
          break;
        case "lt":
          match = val < threshold;
          break;
        case "eq":
          match = val === threshold;
          break;
        case "neq":
          match = val !== threshold;
          break;
        case "between": {
          const t2 = Number(rule.threshold2 ?? threshold);
          match = val >= threshold && val <= t2;
          break;
        }
      }
      if (match) {
        triggered.push(rule);
        break; // One match per rule is enough
      }
    }
  }
  return triggered;
}
