"use client";

import { useState, useEffect } from "react";
import type { QueryInfo } from "@/types/dashboard";
import { X } from "lucide-react";
import type { FilterInputConfig } from "@/components/shared/FilterInput";
import { fetchFilterConfigs, getFilterConfig } from "@/lib/filter-config";

export function AddFavoriteModal({
  queries,
  groupId,
  onAdd,
  onClose,
}: {
  queries: QueryInfo[];
  groupId: string;
  onAdd: (item: {
    queryName: string;
    groupId: string;
    label: string;
    defaultFilters: Record<string, string>;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [filterConfigs, setFilterConfigs] = useState<
    Record<string, FilterInputConfig>
  >({});

  // Fetch filter configs on mount (shared cached utility)
  useEffect(() => {
    fetchFilterConfigs().then(setFilterConfigs);
  }, []);

  const filtered = queries.filter(
    (q) =>
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleExpand = (query: QueryInfo) => {
    if (expandedQuery === query.name) {
      setExpandedQuery(null);
      setFilterValues({});
    } else {
      setExpandedQuery(query.name);
      setFilterValues({});
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleAdd = async (query: QueryInfo) => {
    setAdding(query.name);
    try {
      // Collect non-empty filter values
      const defaults: Record<string, string> = {};
      for (const [k, v] of Object.entries(filterValues)) {
        if (v.trim()) defaults[k] = v.trim();
      }
      await onAdd({
        queryName: query.name,
        groupId,
        label: query.name,
        defaultFilters: defaults,
      });
      setExpandedQuery(null);
      setFilterValues({});
    } finally {
      setAdding(null);
    }
  };

  const getFilterKeys = (query: QueryInfo): string[] => {
    return query.filters.map((f) =>
      typeof f === "string" ? f : (f as { key: string }).key,
    );
  };

  const typeColors: Record<string, string> = {
    api: "bg-green-100 text-green-700",
    url: "bg-purple-100 text-purple-700",
    document: "bg-orange-100 text-orange-700",
    csv: "bg-blue-100 text-blue-700",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Add Favorite Query
          </h2>
          <div className="ml-auto">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search queries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {queries.length === 0
                ? "No queries available"
                : "No matching queries"}
            </div>
          ) : (
            filtered.map((query) => {
              const filterKeys = getFilterKeys(query);
              const isExpanded = expandedQuery === query.name;

              return (
                <div key={query.name} className="transition-colors">
                  <div className="px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {query.name}
                        </p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColors[query.type] || "bg-gray-100 text-gray-600"}`}
                        >
                          {query.type}
                        </span>
                      </div>
                      {query.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {query.description}
                        </p>
                      )}
                      {filterKeys.length > 0 && !isExpanded && (
                        <div className="flex gap-1 mt-1">
                          {filterKeys.map((key) => (
                            <span
                              key={key}
                              className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {filterKeys.length > 0 ? (
                      <button
                        onClick={() => handleExpand(query)}
                        disabled={adding === query.name}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {isExpanded ? "Collapse" : "Configure"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAdd(query)}
                        disabled={adding === query.name}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {adding === query.name ? "Adding..." : "Add"}
                      </button>
                    )}
                  </div>

                  {/* Expanded filter configuration */}
                  {isExpanded && (
                    <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
                      <p className="text-[11px] text-gray-500 mt-2 mb-2">
                        Set default filter values (optional — can be changed
                        when running):
                      </p>
                      <div className="space-y-2">
                        {filterKeys.map((filterKey) => {
                          const config = getFilterConfig(
                            filterConfigs,
                            filterKey,
                          );
                          return (
                            <div key={filterKey}>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {config.label}
                              </label>
                              {config.type === "select" && config.options ? (
                                <select
                                  value={filterValues[filterKey] || ""}
                                  onChange={(e) =>
                                    handleFilterChange(
                                      filterKey,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">All (no filter)</option>
                                  {config.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : config.type === "boolean" ? (
                                <div className="flex items-center gap-3">
                                  {["true", "false"].map((val) => (
                                    <label
                                      key={val}
                                      className="flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <input
                                        type="radio"
                                        name={`add_${filterKey}`}
                                        value={val}
                                        checked={
                                          filterValues[filterKey] === val
                                        }
                                        onChange={(e) =>
                                          handleFilterChange(
                                            filterKey,
                                            e.target.value,
                                          )
                                        }
                                        className="accent-blue-600"
                                      />
                                      <span className="text-xs text-gray-700 capitalize">
                                        {val}
                                      </span>
                                    </label>
                                  ))}
                                  {filterValues[filterKey] && (
                                    <button
                                      onClick={() =>
                                        handleFilterChange(filterKey, "")
                                      }
                                      className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={filterValues[filterKey] || ""}
                                  onChange={(e) =>
                                    handleFilterChange(
                                      filterKey,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={config.placeholder}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAdd(query)}
                          disabled={adding === query.name}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {adding === query.name
                            ? "Adding..."
                            : "Add with Filters"}
                        </button>
                        <button
                          onClick={() => {
                            setFilterValues({});
                            handleAdd(query);
                          }}
                          disabled={adding === query.name}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          Add without Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
