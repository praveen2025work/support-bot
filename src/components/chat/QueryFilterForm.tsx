"use client";

import { useState, useEffect } from "react";
import {
  FilterInput,
  type FilterInputConfig,
} from "@/components/shared/FilterInput";
import { fetchFilterConfigs, getFilterConfig } from "@/lib/filter-config";

export interface QueryFilterFormData {
  queryName: string;
  description?: string;
  filters: Array<string | { key: string; binding: string }>;
}

export function QueryFilterForm({
  data,
  onSubmit,
  disabled,
}: {
  data: QueryFilterFormData;
  onSubmit: (queryName: string, filters: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [filterConfigs, setFilterConfigs] = useState<
    Record<string, FilterInputConfig>
  >({});

  useEffect(() => {
    fetchFilterConfigs().then(setFilterConfigs);
  }, []);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleRun = () => {
    const activeFilters: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) activeFilters[k] = v.trim();
    }
    setSubmitted(true);
    onSubmit(data.queryName, activeFilters);
  };

  const handleSkip = () => {
    setSubmitted(true);
    onSubmit(data.queryName, {});
  };

  if (submitted) {
    const activeFilters = Object.entries(values).filter(([, v]) => v.trim());
    return (
      <div className="mt-2 text-xs text-gray-500 italic">
        {activeFilters.length > 0
          ? `Filters applied: ${activeFilters.map(([k, v]) => `${k}=${v}`).join(", ")}`
          : "Running without filters..."}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      {data.filters.map((filterItem) => {
        const filterKey =
          typeof filterItem === "string" ? filterItem : filterItem.key;
        const config = getFilterConfig(filterConfigs, filterKey);
        return (
          <div key={filterKey}>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {config.label}
            </label>
            <FilterInput
              filterKey={filterKey}
              config={config}
              value={values[filterKey] || ""}
              allValues={values}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
        );
      })}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleRun}
          disabled={disabled}
          className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Run Query
        </button>
        <button
          onClick={handleSkip}
          disabled={disabled}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Skip filters
        </button>
      </div>
    </div>
  );
}
