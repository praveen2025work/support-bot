"use client";

import { useState, useEffect } from "react";
import { Search, X, Layers, ChevronDown } from "lucide-react";
import type { ColumnSchema } from "./types";

interface FilterableColumn {
  name: string;
  type: string;
  distinctCount: number;
}

interface AutoFilterPanelProps {
  source: string;
  groupId: string;
  filterableColumns: FilterableColumn[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** All columns from schema — used for group-by dropdown */
  schema?: ColumnSchema[];
  groupByCol?: string | null;
  onGroupByChange?: (col: string | null) => void;
  /** Bulk-clear all filters, search, and group-by in one call */
  onClearAll?: () => void;
}

export function AutoFilterPanel({
  source,
  groupId,
  filterableColumns,
  filters,
  onFilterChange,
  search,
  onSearchChange,
  onClearAll,
  schema,
  groupByCol,
  onGroupByChange,
}: AutoFilterPanelProps) {
  const [distinctValues, setDistinctValues] = useState<
    Record<string, string[]>
  >({});

  // Load distinct values for filterable columns
  useEffect(() => {
    if (!source || filterableColumns.length === 0) return;
    async function loadDistinct() {
      const results: Record<string, string[]> = {};
      await Promise.all(
        filterableColumns.map(async (col) => {
          try {
            const res = await fetch(
              `/api/data/distinct/${encodeURIComponent(source)}/${encodeURIComponent(col.name)}?groupId=${encodeURIComponent(groupId)}&limit=100`,
            );
            if (res.ok) {
              const data = await res.json();
              results[col.name] = (data.values ?? []).map(String);
            }
          } catch {
            // ignore
          }
        }),
      );
      setDistinctValues(results);
    }
    loadDistinct();
  }, [source, groupId, filterableColumns]);

  const activeCount = Object.values(filters).filter(Boolean).length;
  const groupableColumns = (schema ?? []).filter(
    (c) => c.type === "string" || c.type === "id",
  );
  const totalActive = activeCount + (search ? 1 : 0) + (groupByCol ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search all columns…"
          className="pl-8 pr-3 py-2 text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text-primary)] w-48 outline-none focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>

      {/* Dynamic filter dropdowns */}
      {filterableColumns.map((col) => {
        const values = distinctValues[col.name] ?? [];
        const hasValue = !!filters[col.name];
        return (
          <div key={col.name} className="relative">
            <select
              value={filters[col.name] ?? ""}
              onChange={(e) => onFilterChange(col.name, e.target.value)}
              className={`appearance-none pl-3 pr-7 py-2 text-[12px] border rounded-[var(--radius-md)] bg-[var(--bg-primary)] min-w-[130px] outline-none transition-colors cursor-pointer ${
                hasValue
                  ? "border-[var(--brand)] text-[var(--brand)] ring-1 ring-[var(--brand-subtle)]"
                  : "border-[var(--border)] text-[var(--text-primary)]"
              }`}
            >
              <option value="">All {col.name}</option>
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: hasValue ? "var(--brand)" : "var(--text-muted)" }}
            />
          </div>
        );
      })}

      {/* Group By dropdown */}
      {groupableColumns.length > 0 && onGroupByChange && (
        <div className="relative flex items-center gap-1">
          <Layers
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              color: groupByCol ? "var(--brand)" : "var(--text-muted)",
            }}
          />
          <select
            value={groupByCol ?? ""}
            onChange={(e) => onGroupByChange(e.target.value || null)}
            className={`appearance-none pl-8 pr-7 py-2 text-[12px] border rounded-[var(--radius-md)] bg-[var(--bg-primary)] min-w-[130px] outline-none transition-colors cursor-pointer ${
              groupByCol
                ? "border-[var(--brand)] text-[var(--brand)] ring-1 ring-[var(--brand-subtle)]"
                : "border-[var(--border)] text-[var(--text-primary)]"
            }`}
          >
            <option value="">No grouping</option>
            {groupableColumns.map((c) => (
              <option key={c.name} value={c.name}>
                Group by {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              color: groupByCol ? "var(--brand)" : "var(--text-muted)",
            }}
          />
        </div>
      )}

      {/* Clear all */}
      {totalActive > 0 && (
        <button
          onClick={() => {
            if (onClearAll) {
              onClearAll();
            } else {
              Object.keys(filters).forEach((key) => onFilterChange(key, ""));
              onSearchChange("");
              onGroupByChange?.(null);
            }
          }}
          className="inline-flex items-center gap-1 px-2.5 py-2 text-[12px] text-[var(--danger)] border border-[var(--danger-subtle)] rounded-[var(--radius-md)] hover:bg-[var(--danger-subtle)] transition-colors"
        >
          <X size={12} />
          Clear ({totalActive})
        </button>
      )}
    </div>
  );
}
