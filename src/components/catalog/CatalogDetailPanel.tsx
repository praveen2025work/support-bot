"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  MessageSquare,
  LayoutDashboard,
  Database,
  FileSpreadsheet,
  Globe,
  Columns3,
  Link2,
  Sparkles,
  Activity,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { CatalogDetail } from "@/types/catalog";
import UsageBadge from "./UsageBadge";

const TYPE_LABELS: Record<string, string> = {
  api: "Database · API",
  csv: "CSV File",
  xlsx: "Excel File",
  url: "URL",
  document: "Document",
  combined: "Combined Source",
};

const TYPE_ICONS: Record<string, typeof Database> = {
  api: Database,
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  url: Globe,
  document: Columns3,
  combined: Columns3,
};

const TYPE_ACCENTS: Record<string, string> = {
  api: "var(--brand)",
  csv: "var(--accent)",
  xlsx: "var(--success)",
  url: "#10b981",
  document: "#a78bfa",
  combined: "#ec4899",
};

interface CatalogDetailPanelProps {
  queryName: string;
  groupId: string;
}

export default function CatalogDetailPanel({
  queryName,
  groupId,
}: CatalogDetailPanelProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<CatalogDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/catalog/${encodeURIComponent(queryName)}?groupId=${groupId}`)
      .then((r) => r.json())
      .then((res) => setDetail(res.data || null))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [queryName, groupId]);

  if (loading)
    return (
      <div className="p-8 text-[13px] text-[var(--text-muted)]">Loading…</div>
    );
  if (!detail)
    return (
      <div className="p-8 text-[13px] text-[var(--text-muted)]">
        Query not found.
      </div>
    );

  const Icon = TYPE_ICONS[detail.type] ?? Database;
  const accent = TYPE_ACCENTS[detail.type] ?? "var(--brand)";

  return (
    <div className="flex flex-col bg-[var(--bg-canvas)] min-h-screen">
      <div className="px-6 py-5 max-w-[1400px] mx-auto w-full">
        {/* Back link */}
        <button
          onClick={() => router.push("/catalog")}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to catalog
        </button>

        {/* Hero card */}
        <div className="relative rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden shadow-[var(--shadow-md)] mb-5">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ backgroundColor: accent }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 15% 0%, color-mix(in srgb, ${accent} 12%, transparent), transparent 55%), radial-gradient(circle at 95% 100%, color-mix(in srgb, ${accent} 10%, transparent), transparent 55%)`,
            }}
          />
          <div className="relative px-7 py-6 flex items-start gap-5">
            <div
              className="w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0 shadow-[0_10px_30px_-10px]"
              style={{
                background: accent,
                color: "white",
                boxShadow: `0 12px 32px -10px ${accent}`,
              }}
            >
              <Icon className="w-6 h-6" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="eyebrow" style={{ color: accent }}>
                {TYPE_LABELS[detail.type] || detail.type}
              </span>
              <h1 className="font-display text-[26px] font-bold tracking-tight text-[var(--text-primary)] leading-tight mt-0.5">
                {detail.name}
              </h1>
              {detail.description && (
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-2 max-w-2xl">
                  {detail.description}
                </p>
              )}
              {detail.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {detail.tags.map((tag) => (
                    <span key={tag} className="chip !py-0.5 !px-2 !text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() =>
                  router.push(`/?autoQuery=${encodeURIComponent(detail.name)}`)
                }
                className="btn-primary"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Try in Chat
              </button>
              <button
                onClick={() =>
                  router.push(
                    `/dashboard?addQuery=${encodeURIComponent(detail.name)}`,
                  )
                }
                className="btn-secondary"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Add to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Columns schema */}
          <div className="surface overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Columns3 className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span className="eyebrow !text-[10px]">Schema</span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono ml-1">
                  · {detail.columnCount} columns
                </span>
              </div>
            </div>
            {detail.columns.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Columns3 className="w-7 h-7 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">
                  Schema resolves at runtime
                </div>
                <p className="text-[11.5px] text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                  {detail.type === "combined"
                    ? "Combined queries join multiple sub-sources, so the column list is finalised when the query runs. Try it in Chat to see live columns."
                    : "This source hasn't reported a column schema yet. Run it once to register its column list."}
                </p>
                <button
                  onClick={() =>
                    router.push(
                      `/?autoQuery=${encodeURIComponent(detail.name)}`,
                    )
                  }
                  className="btn-secondary mt-4"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Run to discover schema
                </button>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-[var(--bg-secondary)] sticky top-0">
                    <tr>
                      <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
                        Name
                      </th>
                      <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
                        Label
                      </th>
                      <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.columns.map((col, idx) => (
                      <tr
                        key={col.key}
                        className={`border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]/50 transition-colors ${idx === 0 ? "!border-t-0" : ""}`}
                      >
                        <td className="px-5 py-2.5 font-mono text-[12px] text-[var(--text-primary)]">
                          {col.key}
                        </td>
                        <td className="px-5 py-2.5 text-[var(--text-secondary)]">
                          {col.label}
                        </td>
                        <td className="px-5 py-2.5">
                          <span className="chip !py-0.5 !px-2 !text-[10px] font-mono">
                            {col.type || "string"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right rail */}
          <aside className="flex flex-col gap-3">
            {/* Metadata card */}
            <div className="surface overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span className="eyebrow !text-[10px]">Activity</span>
              </div>
              <div className="px-4 py-4 space-y-3">
                {detail.owner && (
                  <div>
                    <div className="eyebrow !text-[9.5px]">Owner</div>
                    <div className="text-[12.5px] font-medium text-[var(--text-primary)] mt-0.5 truncate">
                      {detail.owner}
                    </div>
                  </div>
                )}
                <div>
                  <div className="eyebrow !text-[9.5px]">Usage · 7d</div>
                  <div className="mt-1">
                    <UsageBadge
                      trending={detail.trending}
                      usageCount7d={detail.usageCount7d}
                    />
                  </div>
                </div>
                <div>
                  <div className="eyebrow !text-[9.5px]">Lifetime runs</div>
                  {detail.usageCountTotal > 0 ? (
                    <div className="numerals text-[20px] font-bold text-[var(--text-primary)] mt-0.5 leading-none">
                      {detail.usageCountTotal.toLocaleString()}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="text-[11.5px] text-[var(--text-muted)] italic">
                        Not yet aggregated
                      </span>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-snug">
                        Counts are summarised hourly. Recent runs may take a few
                        minutes to appear.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document context — synthesis hub style */}
            <div className="surface overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span className="eyebrow !text-[10px]">Synthesis Ready</span>
              </div>
              <div className="px-4 py-4">
                <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                  This source is indexed and available to MITR AI&apos;s
                  multi-source synthesis engine. Ask follow-up questions in chat
                  to cross-reference data.
                </p>
                <button
                  onClick={() =>
                    router.push(
                      `/?autoQuery=${encodeURIComponent(detail.name)}`,
                    )
                  }
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] text-[11.5px] font-semibold hover:bg-[var(--brand)] hover:text-white transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Synthesize now
                </button>
              </div>
            </div>

            {/* You might also explore */}
            {detail.relatedQueries.length > 0 && (
              <div className="surface overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[var(--brand)]" />
                    <span className="eyebrow !text-[10px]">
                      You might also explore
                    </span>
                  </div>
                  <span
                    className="text-[10.5px] text-[var(--text-muted)] font-mono"
                    title="Suggested by usage adjacency in this group"
                  >
                    {detail.relatedQueries.length}
                  </span>
                </div>
                <ul className="py-1">
                  {detail.relatedQueries.map((rq) => (
                    <li key={rq}>
                      <button
                        onClick={() =>
                          router.push(`/catalog/${rq}?groupId=${groupId}`)
                        }
                        className="w-full text-left px-4 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate font-mono">{rq}</span>
                        <Eye className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--brand)] shrink-0 ml-2 transition-colors" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
