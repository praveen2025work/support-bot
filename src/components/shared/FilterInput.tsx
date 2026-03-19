"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { resolveDateRange, isDatePreset } from "@/lib/date-resolver";
import { RefreshCw, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FilterType =
  | "select"
  | "text"
  | "boolean"
  | "multi_select"
  | "date"
  | "date_range"
  | "number_range"
  | "search";

export interface FilterInputConfig {
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hasDynamicSource?: boolean;
  dateFormat?: string;
  presets?: { value: string; label: string }[];
  numberConfig?: { min?: number; max?: number; step?: number };
  debounceMs?: number;
  sourceUrl?: string;
}

export interface FilterInputProps {
  filterKey: string;
  config: FilterInputConfig;
  /** Current value for single-key filters, or comma-separated for multi_select */
  value: string;
  /** For range filters, provides _start/_end or _min/_max keyed values */
  allValues?: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  /** Compact sizing for dashboard cards */
  compact?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function FilterInput({
  filterKey,
  config,
  value,
  allValues,
  onChange,
  disabled,
  compact,
  onRefresh,
  refreshing,
}: FilterInputProps) {
  const inputCls = compact
    ? "text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
    : "text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

  switch (config.type) {
    /* ──── Select dropdown ──────────────────────────────────────── */
    case "select":
      return (
        <div className="flex items-center gap-1">
          <select
            value={value}
            onChange={(e) => onChange(filterKey, e.target.value)}
            disabled={disabled}
            className={`flex-1 ${inputCls}`}
          >
            <option value="">All (no filter)</option>
            {(config.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {config.hasDynamicSource && onRefresh && (
            <RefreshButton onClick={onRefresh} spinning={refreshing} />
          )}
        </div>
      );

    /* ──── Multi-select checkbox dropdown ──────────────────────── */
    case "multi_select":
      return (
        <MultiSelectInput
          filterKey={filterKey}
          config={config}
          value={value}
          onChange={onChange}
          disabled={disabled}
          inputCls={inputCls}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      );

    /* ──── Boolean toggle ──────────────────────────────────────── */
    case "boolean":
      return (
        <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden">
          {[
            { val: "", label: "All" },
            { val: "true", label: "True" },
            { val: "false", label: "False" },
          ].map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => onChange(filterKey, val)}
              disabled={disabled}
              className={`${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"} font-medium transition-colors disabled:opacity-50 ${
                (value || "") === val
                  ? val === ""
                    ? "bg-gray-600 text-white"
                    : val === "true"
                      ? "bg-green-600 text-white"
                      : "bg-red-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              } ${val !== "" ? "border-l border-gray-300" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      );

    /* ──── Single date picker ──────────────────────────────────── */
    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(filterKey, e.target.value)}
          disabled={disabled}
          className={`w-full ${inputCls}`}
        />
      );

    /* ──── Date range (from/to + presets) ─────────────────────── */
    case "date_range":
      return (
        <DateRangeInput
          filterKey={filterKey}
          config={config}
          allValues={allValues || {}}
          onChange={onChange}
          disabled={disabled}
          compact={compact}
          inputCls={inputCls}
        />
      );

    /* ──── Number range (min/max) ─────────────────────────────── */
    case "number_range":
      return (
        <NumberRangeInput
          filterKey={filterKey}
          config={config}
          allValues={allValues || {}}
          onChange={onChange}
          disabled={disabled}
          inputCls={inputCls}
        />
      );

    /* ──── Search with typeahead ──────────────────────────────── */
    case "search":
      return (
        <SearchInput
          filterKey={filterKey}
          config={config}
          value={value}
          onChange={onChange}
          disabled={disabled}
          inputCls={inputCls}
        />
      );

    /* ──── Text (default) ────────────────────────────────────── */
    case "text":
    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(filterKey, e.target.value)}
          placeholder={config.placeholder}
          disabled={disabled}
          className={`w-full ${inputCls}`}
        />
      );
  }
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function RefreshButton({
  onClick,
  spinning,
}: {
  onClick: () => void;
  spinning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={spinning}
      className="p-1 text-purple-500 hover:text-purple-700 disabled:opacity-50 rounded"
      title="Refresh options from source"
    >
      <RefreshCw size={14} className={spinning ? "animate-spin" : ""} />
    </button>
  );
}

/* ──── Multi-select ─────────────────────────────────────────────── */

function MultiSelectInput({
  filterKey,
  config,
  value,
  onChange,
  disabled,
  inputCls,
  onRefresh,
  refreshing,
}: {
  filterKey: string;
  config: FilterInputConfig;
  value: string;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  inputCls: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? value.split(",").filter(Boolean) : [];
  const options = config.options || [];

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (val: string) => {
    const set = new Set(selected);
    if (set.has(val)) set.delete(val);
    else set.add(val);
    onChange(filterKey, Array.from(set).join(","));
  };

  const selectAll = () =>
    onChange(filterKey, options.map((o) => o.value).join(","));
  const clearAll = () => onChange(filterKey, "");

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={disabled}
          className={`flex-1 text-left ${inputCls} ${disabled ? "opacity-50" : ""}`}
        >
          {selected.length === 0 ? (
            <span className="text-gray-400">All (no filter)</span>
          ) : (
            <span>{selected.length} selected</span>
          )}
        </button>
        {config.hasDynamicSource && onRefresh && (
          <RefreshButton onClick={onRefresh} spinning={refreshing} />
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100">
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] text-blue-600 hover:underline"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-gray-500 hover:underline"
            >
              Clear
            </button>
          </div>
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──── Date range ──────────────────────────────────────────────── */

function DateRangeInput({
  filterKey,
  config,
  allValues,
  onChange,
  disabled,
  compact,
  inputCls,
}: {
  filterKey: string;
  config: FilterInputConfig;
  allValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  inputCls: string;
}) {
  const startKey = `${filterKey}_start`;
  const endKey = `${filterKey}_end`;
  const startVal = allValues[startKey] || "";
  const endVal = allValues[endKey] || "";
  const presets = config.presets || config.options || [];

  const applyPreset = (presetValue: string) => {
    if (isDatePreset(presetValue)) {
      const range = resolveDateRange(
        presetValue,
        config.dateFormat || "YYYY-MM-DD",
      );
      onChange(startKey, range.start);
      onChange(endKey, range.end);
      // Also set the main key to the preset label for display
      onChange(filterKey, presetValue);
    }
  };

  return (
    <div className="space-y-1.5">
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => applyPreset(p.value)}
              disabled={disabled}
              className={`${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"} rounded-full border transition-colors disabled:opacity-50 ${
                allValues[filterKey] === p.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={startVal}
          onChange={(e) => {
            onChange(startKey, e.target.value);
            onChange(filterKey, "");
          }}
          disabled={disabled}
          className={`flex-1 ${inputCls}`}
          placeholder="From"
        />
        <span className="text-[10px] text-gray-400">to</span>
        <input
          type="date"
          value={endVal}
          onChange={(e) => {
            onChange(endKey, e.target.value);
            onChange(filterKey, "");
          }}
          disabled={disabled}
          className={`flex-1 ${inputCls}`}
          placeholder="To"
        />
      </div>
    </div>
  );
}

/* ──── Number range ──────────────────────────────────────────────── */

function NumberRangeInput({
  filterKey,
  config,
  allValues,
  onChange,
  disabled,
  inputCls,
}: {
  filterKey: string;
  config: FilterInputConfig;
  allValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  inputCls: string;
}) {
  const minKey = `${filterKey}_min`;
  const maxKey = `${filterKey}_max`;
  const nc = config.numberConfig || {};

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={allValues[minKey] || ""}
        onChange={(e) => onChange(minKey, e.target.value)}
        disabled={disabled}
        min={nc.min}
        max={nc.max}
        step={nc.step}
        placeholder="Min"
        className={`flex-1 ${inputCls}`}
      />
      <span className="text-[10px] text-gray-400">to</span>
      <input
        type="number"
        value={allValues[maxKey] || ""}
        onChange={(e) => onChange(maxKey, e.target.value)}
        disabled={disabled}
        min={nc.min}
        max={nc.max}
        step={nc.step}
        placeholder="Max"
        className={`flex-1 ${inputCls}`}
      />
    </div>
  );
}

/* ──── Search / typeahead ──────────────────────────────────────── */

function SearchInput({
  filterKey,
  config,
  value,
  onChange,
  disabled,
  inputCls,
}: {
  filterKey: string;
  config: FilterInputConfig;
  value: string;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  inputCls: string;
}) {
  const [suggestions, setSuggestions] = useState<
    { value: string; label: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!config.sourceUrl || !query.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const url = `${config.sourceUrl}${config.sourceUrl.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        let items = data;
        // No valuePath handling needed — source URL should return standard contract
        if (!Array.isArray(items)) items = [];
        if (items.length > 0 && typeof items[0] === "string") {
          setSuggestions(items.map((v: string) => ({ value: v, label: v })));
        } else {
          setSuggestions(
            items.slice(0, 20).map((item: Record<string, unknown>) => ({
              value: String(item.value ?? ""),
              label: String(item.label ?? item.value ?? ""),
            })),
          );
        }
        setShowSuggestions(true);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [config.sourceUrl],
  );

  const handleInput = (val: string) => {
    onChange(filterKey, val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (config.sourceUrl && val.trim()) {
      debounceRef.current = setTimeout(
        () => fetchSuggestions(val),
        config.debounceMs || 300,
      );
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={config.placeholder || `Search...`}
          disabled={disabled}
          className={`w-full ${inputCls} pr-6`}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 size={12} className="animate-spin text-gray-400" />
          </div>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.value}-${i}`}
              type="button"
              onClick={() => {
                onChange(filterKey, s.value);
                setShowSuggestions(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
