"use client";

import { SlidersHorizontal, RotateCcw, Play } from "lucide-react";
import type { DashboardParameter } from "@/types/dashboard";

interface ParameterBarProps {
  parameters: DashboardParameter[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  className?: string;
}

function ParameterInput({
  param,
  value,
  onChange,
}: {
  param: DashboardParameter;
  value: string;
  onChange: (name: string, value: string) => void;
}) {
  const inputClass =
    "border rounded text-xs py-1 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400";

  switch (param.type) {
    case "select":
      return (
        <select
          value={value}
          onChange={(e) => onChange(param.name, e.target.value)}
          className={inputClass + " min-w-[100px]"}
        >
          <option value="">All</option>
          {(param.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(param.name, e.target.value)}
          className={inputClass}
        />
      );

    case "daterange": {
      const [start = "", end = ""] = value.split(",");
      return (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={start}
            onChange={(e) => onChange(param.name, `${e.target.value},${end}`)}
            className={inputClass}
          />
          <span className="text-[10px] text-gray-400">to</span>
          <input
            type="date"
            value={end}
            onChange={(e) => onChange(param.name, `${start},${e.target.value}`)}
            className={inputClass}
          />
        </div>
      );
    }

    case "number":
      return (
        <input
          type="number"
          value={value}
          min={param.min}
          max={param.max}
          onChange={(e) => onChange(param.name, e.target.value)}
          className={inputClass + " w-20"}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(param.name, e.target.value)}
          className={inputClass + " w-28"}
        />
      );
  }
}

export function ParameterBar({
  parameters,
  values,
  onChange,
  onApply,
  onReset,
  className = "",
}: ParameterBarProps) {
  if (parameters.length === 0) {
    return null;
  }

  return (
    <div
      className={
        "flex items-center gap-3 bg-gray-50 border-b px-4 py-2 " + className
      }
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 shrink-0">
        <SlidersHorizontal size={14} />
        <span>Parameters</span>
      </div>

      <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
        {parameters.map((param) => (
          <div key={param.id} className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-500 leading-none">
              {param.label}
            </label>
            <ParameterInput
              param={param}
              value={values[param.name] ?? param.defaultValue}
              onChange={onChange}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onApply}
          className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1.5 transition-colors"
        >
          <Play size={12} />
          Apply
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-100 rounded px-3 py-1.5 transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>
    </div>
  );
}
