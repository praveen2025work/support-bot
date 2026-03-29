"use client";

import { useState } from "react";

interface ColumnPickerProps {
  columns: Array<{ name: string; type: string }>;
  selected: string[];
  onToggle: (columnName: string) => void;
}

const typeColors: Record<string, string> = {
  string: "text-[var(--brand)]",
  number: "text-[var(--success)]",
  date: "text-[var(--warning)]",
};

export function ColumnPicker({
  columns,
  selected,
  onToggle,
}: ColumnPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? columns.filter((col) =>
        col.name.toLowerCase().includes(search.toLowerCase()),
      )
    : columns;

  const selectedSet = new Set(selected);

  return (
    <div className="w-[200px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-primary)] flex flex-col h-full">
      {/* Search input */}
      <div className="p-2 border-b border-[var(--border)]">
        <input
          type="text"
          placeholder="Search columns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1.5 text-[12px] rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand)]"
        />
      </div>

      {/* Column list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((col) => (
          <label
            key={col.name}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(col.name)}
              onChange={() => onToggle(col.name)}
              className="accent-[var(--brand)] shrink-0"
            />
            <span className="text-[12px] text-[var(--text-primary)] truncate flex-1">
              {col.name}
            </span>
            <span
              className={`text-[10px] ${typeColors[col.type] ?? "text-[var(--text-muted)]"}`}
            >
              {col.type}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-3 text-[11px] text-[var(--text-muted)] text-center">
            No columns found
          </div>
        )}
      </div>
    </div>
  );
}
