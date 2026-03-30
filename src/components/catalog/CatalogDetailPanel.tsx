"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CatalogDetail } from "@/types/catalog";
import UsageBadge from "./UsageBadge";

const TYPE_LABELS: Record<string, string> = {
  api: "Database (API)",
  csv: "CSV File",
  xlsx: "Excel File",
  url: "URL",
  document: "Document",
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
    return <div className="p-6 text-[var(--text-muted)]">Loading...</div>;
  if (!detail)
    return <div className="p-6 text-[var(--text-muted)]">Query not found.</div>;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/catalog")}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{detail.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {detail.description}
          </p>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)]">
          {TYPE_LABELS[detail.type] || detail.type}
        </span>
        {detail.owner && (
          <span className="text-xs text-[var(--text-muted)]">
            Owner: {detail.owner}
          </span>
        )}
        <UsageBadge
          trending={detail.trending}
          usageCount7d={detail.usageCount7d}
        />
        <span className="text-xs text-[var(--text-muted)]">
          {detail.usageCountTotal} total runs
        </span>
      </div>

      {/* Tags */}
      {detail.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {detail.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            router.push(`/?query=${encodeURIComponent(detail.name)}`)
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Add to Dashboard
        </button>
      </div>

      {/* Column Schema */}
      <div>
        <h2 className="text-sm font-medium mb-2">
          Columns ({detail.columnCount})
        </h2>
        <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Name</th>
                <th className="text-left px-3 py-2 font-medium">Label</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {detail.columns.map((col) => (
                <tr
                  key={col.key}
                  className="border-t border-[var(--border-primary)]"
                >
                  <td className="px-3 py-2 font-mono text-xs">{col.key}</td>
                  <td className="px-3 py-2">{col.label}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {col.type || "string"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Related Queries */}
      {detail.relatedQueries.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-2">Related Queries</h2>
          <div className="flex flex-wrap gap-2">
            {detail.relatedQueries.map((rq) => (
              <button
                key={rq}
                onClick={() => router.push(`/catalog/${rq}?groupId=${groupId}`)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                {rq}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
