'use client';

import { useState, useEffect } from 'react';

interface FilterOptionConfig {
  label: string;
  type: 'select' | 'text' | 'boolean';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface QueryFilterFormData {
  queryName: string;
  description?: string;
  filters: Array<string | { key: string; binding: string }>;
}

// Cache filter configs across form instances within the same page session
let filterConfigCache: Record<string, FilterOptionConfig> | null = null;

function fallbackConfig(filterKey: string): FilterOptionConfig {
  return {
    label: filterKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    type: 'text',
    placeholder: `Enter ${filterKey}...`,
  };
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
  const [filterConfigs, setFilterConfigs] = useState<Record<string, FilterOptionConfig>>(
    filterConfigCache || {}
  );

  useEffect(() => {
    if (filterConfigCache) return;
    fetch('/api/filters')
      .then((res) => res.json())
      .then((json) => {
        const configs: Record<string, FilterOptionConfig> = {};
        for (const [key, entry] of Object.entries(json.filters || {})) {
          const e = entry as { label: string; type: string; options: { value: string; label: string }[]; placeholder: string | null };
          configs[key] = {
            label: e.label,
            type: e.type as 'select' | 'text' | 'boolean',
            options: e.type === 'select' ? e.options : undefined,
            placeholder: e.placeholder ?? undefined,
          };
        }
        filterConfigCache = configs;
        setFilterConfigs(configs);
      })
      .catch(() => {});
  }, []);

  const getConfig = (filterKey: string): FilterOptionConfig => {
    return filterConfigs[filterKey] || fallbackConfig(filterKey);
  };

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
          ? `Filters applied: ${activeFilters.map(([k, v]) => `${k}=${v}`).join(', ')}`
          : 'Running without filters...'}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      {data.filters.map((filterItem) => {
        const filterKey = typeof filterItem === 'string' ? filterItem : filterItem.key;
        const config = getConfig(filterKey);
        return (
          <div key={filterKey}>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {config.label}
            </label>
            {config.type === 'select' && config.options ? (
              <select
                value={values[filterKey] || ''}
                onChange={(e) => handleChange(filterKey, e.target.value)}
                disabled={disabled}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All (no filter)</option>
                {config.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : config.type === 'boolean' ? (
              <div className="flex items-center gap-3">
                {['true', 'false'].map((val) => (
                  <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={filterKey}
                      value={val}
                      checked={values[filterKey] === val}
                      onChange={(e) => handleChange(filterKey, e.target.value)}
                      disabled={disabled}
                      className="accent-blue-600"
                    />
                    <span className="text-xs text-gray-700 capitalize">{val}</span>
                  </label>
                ))}
                {values[filterKey] && (
                  <button
                    onClick={() => handleChange(filterKey, '')}
                    disabled={disabled}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={values[filterKey] || ''}
                onChange={(e) => handleChange(filterKey, e.target.value)}
                placeholder={config.placeholder}
                disabled={disabled}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
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
