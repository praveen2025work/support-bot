"use client";

import type { FileSourceConfig, SchemaColumn } from "./types";

interface SchemaTabProps {
  schema: SchemaColumn[];
  source: FileSourceConfig;
}

const typeColors: Record<string, string> = {
  string: "bg-[var(--brand-subtle)] text-[var(--brand)]",
  number: "bg-[var(--success-subtle)] text-[var(--success)]",
  date: "bg-[var(--warning-subtle)] text-[var(--warning)]",
};

export function SchemaTab({ schema }: SchemaTabProps) {
  const numericCount = schema.filter((c) => c.type === "number").length;
  const stringCount = schema.filter((c) => c.type === "string").length;

  return (
    <div className="p-5">
      {/* Summary bar */}
      <div className="flex gap-4 mb-4 text-[12px]">
        <Stat label="Columns" value={schema.length} />
        <Stat label="Numeric" value={numericCount} color="var(--brand)" />
        <Stat label="String" value={stringCount} color="var(--success)" />
      </div>

      {/* Column table */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden text-[11px]">
        <div className="flex bg-[var(--bg-tertiary)] border-b border-[var(--border)] font-semibold text-[var(--text-muted)]">
          <div className="w-[180px] px-3 py-2">Column Name</div>
          <div className="w-[80px] px-3 py-2">Type</div>
          <div className="w-[80px] px-3 py-2">Distinct</div>
          <div className="w-[60px] px-3 py-2">Nulls</div>
          <div className="flex-1 px-3 py-2">Sample Values</div>
        </div>
        {schema.map((col) => (
          <div
            key={col.name}
            className="flex border-b border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <div className="w-[180px] px-3 py-2 font-medium text-[var(--text-primary)]">
              {col.name}
            </div>
            <div className="w-[80px] px-3 py-2">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${typeColors[col.type] ?? ""}`}
              >
                {col.type}
              </span>
            </div>
            <div className="w-[80px] px-3 py-2">{col.distinctCount}</div>
            <div className="w-[60px] px-3 py-2">{col.nullCount}</div>
            <div className="flex-1 px-3 py-2 flex gap-1 flex-wrap">
              {col.sampleValues.slice(0, 4).map((v, i) => (
                <span
                  key={i}
                  className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[10px] max-w-[100px] truncate"
                >
                  {typeof v === "object"
                    ? ((v as { value?: string }).value ?? String(v))
                    : String(v)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2">
      <span className="text-[var(--text-muted)]">{label}:</span>{" "}
      <strong
        style={color ? { color } : undefined}
        className="text-[var(--text-primary)]"
      >
        {value}
      </strong>
    </div>
  );
}
