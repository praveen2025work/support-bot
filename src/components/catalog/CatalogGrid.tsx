"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Database,
  FileSpreadsheet,
  Globe,
  Columns3,
  ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { CatalogEntry } from "@/types/catalog";
import UsageBadge from "./UsageBadge";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  api: <Database className="w-4 h-4" />,
  csv: <FileSpreadsheet className="w-4 h-4" />,
  xlsx: <FileSpreadsheet className="w-4 h-4" />,
  url: <Globe className="w-4 h-4" />,
  document: <Columns3 className="w-4 h-4" />,
  combined: <Columns3 className="w-4 h-4" />,
};

const TYPE_ACCENTS: Record<string, string> = {
  api: "var(--brand)",
  csv: "var(--accent)",
  xlsx: "var(--success)",
  url: "#10b981",
  document: "#a78bfa",
  combined: "#ec4899",
};

interface CatalogGridProps {
  groupId: string;
}

export default function CatalogGrid({ groupId }: CatalogGridProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    const qs = searchQuery
      ? `/api/catalog?groupId=${groupId}&q=${encodeURIComponent(searchQuery)}`
      : `/api/catalog?groupId=${groupId}`;

    async function loadEntries() {
      setLoading(true);
      try {
        const r = await fetch(qs);
        const res = await r.json();
        setEntries(res.data || []);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }

    loadEntries();
  }, [groupId, searchQuery]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [entries]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    entries.forEach((e) => types.add(e.type));
    return Array.from(types).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filterTag) result = result.filter((e) => e.tags.includes(filterTag));
    if (filterType) result = result.filter((e) => e.type === filterType);
    return result;
  }, [entries, filterTag, filterType]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Search + Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search queries, columns, tags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-subtle)] transition-all"
          />
        </div>
        <select
          value={filterTag || ""}
          onChange={(e) => setFilterTag(e.target.value || null)}
          className="px-3 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[12px] font-medium text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)]"
        >
          <option value="">All Tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filterType || ""}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="px-3 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[12px] font-medium text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand)]"
        >
          <option value="">All Types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="eyebrow !text-[10px]">
        {loading ? "Loading…" : `${filtered.length} queries available`}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 overflow-auto flex-1 pr-1">
        {filtered.map((entry) => {
          const accent = TYPE_ACCENTS[entry.type] ?? "var(--brand)";
          return (
            <button
              key={entry.name}
              onClick={() =>
                router.push(`/catalog/${entry.name}?groupId=${groupId}`)
              }
              className="group relative text-left p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all overflow-hidden cursor-pointer min-h-[140px] flex flex-col"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[2px] opacity-80"
                style={{ backgroundColor: accent }}
              />
              <div className="flex items-start gap-3 mb-2.5">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                    color: accent,
                  }}
                >
                  {TYPE_ICONS[entry.type] || <Database className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)] truncate leading-tight">
                    {entry.name}
                  </h3>
                  <span
                    className="eyebrow !text-[9px] !tracking-[0.14em]"
                    style={{ color: accent }}
                  >
                    {entry.type}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors shrink-0" />
              </div>
              {entry.description && (
                <p className="text-[12px] text-[var(--text-secondary)] mb-3 line-clamp-2 leading-relaxed">
                  {entry.description}
                </p>
              )}
              {entry.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {entry.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="chip !py-0.5 !px-2 !text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] mt-auto">
                <UsageBadge
                  trending={entry.trending}
                  usageCount7d={entry.usageCount7d}
                />
                <span className="text-[10.5px] text-[var(--text-muted)] font-mono">
                  {entry.columnCount} cols
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
