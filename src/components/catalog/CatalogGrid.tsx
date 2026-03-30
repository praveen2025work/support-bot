"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Database,
  FileSpreadsheet,
  Globe,
  Columns3,
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search queries, columns, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-sm"
          />
        </div>
        <select
          value={filterTag || ""}
          onChange={(e) => setFilterTag(e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-sm"
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
          className="px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-sm"
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
      <div className="text-sm text-[var(--text-muted)]">
        {loading ? "Loading..." : `${filtered.length} queries available`}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto flex-1">
        {filtered.map((entry) => (
          <button
            key={entry.name}
            onClick={() =>
              router.push(`/catalog/${entry.name}?groupId=${groupId}`)
            }
            className="text-left p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[var(--text-muted)]">
                {TYPE_ICONS[entry.type] || <Database className="w-4 h-4" />}
              </span>
              <h3 className="font-medium text-sm truncate">{entry.name}</h3>
            </div>
            {entry.description && (
              <p className="text-xs text-[var(--text-muted)] mb-2 line-clamp-2">
                {entry.description}
              </p>
            )}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <UsageBadge
                trending={entry.trending}
                usageCount7d={entry.usageCount7d}
              />
              <span className="text-xs text-[var(--text-muted)]">
                {entry.columnCount} columns
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
