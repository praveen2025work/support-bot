"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Layers, ChevronDown, Check } from "lucide-react";
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
  schema?: ColumnSchema[];
  groupByCol?: string | null;
  onGroupByChange?: (col: string | null) => void;
  onClearAll?: () => void;
}

/* ── Searchable Filter Dropdown ────────────────────────────────────── */

function SearchableDropdown({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = !!value;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search input when dropdown opens (focus is a DOM side-effect, not state)
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className={`flex items-center gap-1.5 text-[12px] border rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors min-w-[130px] max-w-[200px] ${
          hasValue
            ? "border-[var(--brand)] ring-1 ring-[var(--brand-subtle)]"
            : "border-[var(--border)]"
        }`}
        style={{
          backgroundColor: "var(--bg-primary)",
          color: hasValue ? "var(--brand)" : "var(--text-primary)",
          boxShadow: open ? "0 0 0 2px var(--brand-subtle)" : "none",
          borderColor: open ? "var(--brand)" : undefined,
        }}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1 truncate">{hasValue ? value : label}</span>
        <ChevronDown
          size={12}
          className="shrink-0 transition-transform"
          style={{
            color: hasValue ? "var(--brand)" : "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full left-0 mt-1 w-56 rounded-[var(--radius-md)] border overflow-hidden"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <Search size={12} style={{ color: "var(--text-muted)" }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.replace(/^All /, "")}...`}
              className="flex-1 text-[12px] bg-transparent outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* "All" option */}
          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
              style={{
                backgroundColor: !hasValue
                  ? "var(--brand-subtle)"
                  : "transparent",
                color: !hasValue ? "var(--brand)" : "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                if (hasValue)
                  e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
              }}
              onMouseLeave={(e) => {
                if (hasValue)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {!hasValue && <Check size={11} className="shrink-0" />}
              <span className={!hasValue ? "" : "pl-[19px]"}>{label}</span>
            </button>

            {filtered.length === 0 ? (
              <div
                className="px-3 py-3 text-[11px] text-center"
                style={{ color: "var(--text-muted)" }}
              >
                No matches
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? "var(--brand-subtle)"
                        : "transparent",
                      color: isSelected
                        ? "var(--brand)"
                        : "var(--text-primary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor =
                          "var(--bg-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {isSelected && <Check size={11} className="shrink-0" />}
                    <span className={isSelected ? "" : "pl-[19px]"}>{opt}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Panel ────────────────────────────────────────────────────── */

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
          placeholder="Search all columns..."
          className="pl-8 pr-3 py-2 text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text-primary)] w-48 outline-none focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>

      {/* Dynamic searchable filter dropdowns */}
      {filterableColumns.map((col) => (
        <SearchableDropdown
          key={col.name}
          label={`All ${col.name}`}
          value={filters[col.name] ?? ""}
          options={distinctValues[col.name] ?? []}
          onChange={(v) => onFilterChange(col.name, v)}
        />
      ))}

      {/* Group By dropdown */}
      {groupableColumns.length > 0 && onGroupByChange && (
        <SearchableDropdown
          label="No grouping"
          value={groupByCol ?? ""}
          options={groupableColumns.map((c) => c.name)}
          onChange={(v) => onGroupByChange(v || null)}
          icon={
            <Layers
              size={12}
              style={{
                color: groupByCol ? "var(--brand)" : "var(--text-muted)",
              }}
            />
          }
        />
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
