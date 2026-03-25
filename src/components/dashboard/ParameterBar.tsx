"use client";

import { useState, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  Play,
  ChevronDown,
  X,
  Search,
} from "lucide-react";
import type { DashboardParameter } from "@/types/dashboard";

interface ParameterBarProps {
  parameters: DashboardParameter[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  className?: string;
}

/* ── Searchable dropdown select ─────────────────────────────────────── */

function SearchableSelect({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: string[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const displayValue = value || placeholder;

  return (
    <div ref={containerRef} className="relative min-w-[160px]">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`
          w-full flex items-center justify-between gap-1.5
          px-3 py-1.5 rounded-lg border text-sm transition-all
          ${
            value
              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-200"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          }
          hover:border-blue-400 dark:hover:border-blue-500
          focus:outline-none focus:ring-2 focus:ring-blue-400/40
        `}
      >
        <span
          className={`truncate ${!value ? "text-gray-400 dark:text-gray-500" : ""}`}
        >
          {displayValue}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 rounded hover:bg-blue-200/60 dark:hover:bg-blue-800/60 transition-colors"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {/* All option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearch("");
              }}
              className={`
                w-full text-left px-3 py-2 text-sm transition-colors
                ${!value ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"}
              `}
            >
              All
            </button>

            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                No matches
              </div>
            )}

            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors
                  ${value === opt ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"}
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Parameter input router ─────────────────────────────────────────── */

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
    "px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all";

  switch (param.type) {
    case "select":
      return (
        <SearchableSelect
          options={param.options ?? []}
          value={value}
          placeholder={`All ${param.label}`}
          onChange={(v) => onChange(param.name, v)}
        />
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
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={start}
            onChange={(e) => onChange(param.name, `${e.target.value},${end}`)}
            className={inputClass + " w-[130px]"}
          />
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            to
          </span>
          <input
            type="date"
            value={end}
            onChange={(e) => onChange(param.name, `${start},${e.target.value}`)}
            className={inputClass + " w-[130px]"}
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
          className={inputClass + " w-24"}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(param.name, e.target.value)}
          placeholder={param.label}
          className={inputClass + " w-32"}
        />
      );
  }
}

/* ── Active filter chips ────────────────────────────────────────────── */

function ActiveFilterChips({
  parameters,
  values,
  onChange,
}: {
  parameters: DashboardParameter[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  const active = parameters.filter((p) => values[p.name]);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {active.map((p) => (
        <span
          key={p.id}
          className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium"
        >
          {p.label}: {values[p.name]}
          <button
            type="button"
            onClick={() => onChange(p.name, "")}
            className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

/* ── Main ParameterBar ──────────────────────────────────────────────── */

export function ParameterBar({
  parameters,
  values,
  onChange,
  onApply,
  onReset,
  className = "",
}: ParameterBarProps) {
  if (parameters.length === 0) return null;

  const activeCount = parameters.filter((p) => values[p.name]).length;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Filter controls row */}
      <div className="flex items-center gap-3 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5">
        {/* Label */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">
          <SlidersHorizontal size={14} />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold">
              {activeCount}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Inputs */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {parameters.map((param) => (
            <div key={param.id} className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-none">
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

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onApply}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg px-4 py-2 shadow-sm transition-all hover:shadow"
          >
            <Play size={12} fill="currentColor" />
            Apply
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 rounded-lg px-3 py-2 transition-all"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        parameters={parameters}
        values={values}
        onChange={onChange}
      />
    </div>
  );
}
