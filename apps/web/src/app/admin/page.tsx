"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Shield,
  Users,
  Database,
  Code2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf";
import { EmbedCodeGenerator } from "./components/EmbedCodeGenerator";

interface GroupInfo {
  id: string;
  name: string;
  description: string;
  sources: string[];
  hasCorpus: boolean;
  hasFaq: boolean;
  hasTemplates: boolean;
}

const ACCENTS = [
  "var(--brand)",
  "var(--accent)",
  "var(--success)",
  "#a78bfa",
  "#ec4899",
  "#10b981",
];

function pickAccent(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ACCENTS[Math.abs(h) % ACCENTS.length];
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [embedId, setEmbedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/admin/groups");
      const data = await res.json();
      setGroups(data.groups);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/groups/${id}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      if (res.ok) {
        setDeletingId(null);
        fetchGroups();
      }
    } catch {
      /* ignore */
    }
  };

  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const totalSources = groups.reduce((sum, g) => sum + g.sources.length, 0);
    const enrichedGroups = groups.filter(
      (g) => g.hasCorpus || g.hasFaq || g.hasTemplates,
    ).length;
    const avgSources =
      totalGroups > 0 ? (totalSources / totalGroups).toFixed(1) : "0";
    return { totalGroups, totalSources, enrichedGroups, avgSources };
  }, [groups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q),
    );
  }, [groups, search]);

  if (loading) {
    return (
      <div className="text-[13px] text-[var(--text-muted)] py-16 text-center">
        Loading groups…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="eyebrow">Workspace governance</span>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Data Groups Management
          </h1>
        </div>
        <Link href="/admin/onboard" className="btn-primary">
          <Plus className="w-3.5 h-3.5" />
          Create New Group
        </Link>
      </div>

      {/* Search + Stats */}
      <div className="flex items-stretch gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search groups or sources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-subtle)] transition-all"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <KpiTile
          label="Total Groups"
          value={stats.totalGroups}
          sub={`${stats.enrichedGroups} enriched with corpus`}
          icon={Shield}
          tone="var(--brand)"
        />
        <KpiTile
          label="Connected Sources"
          value={stats.totalSources}
          sub={`${stats.avgSources} avg per group`}
          icon={Database}
          tone="var(--accent)"
        />
        <KpiTile
          label="Embed-Ready"
          value={stats.totalGroups}
          sub="Snippet generator available"
          icon={Code2}
          tone="var(--success)"
        />
      </div>

      {/* Group rows */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_1.5fr_140px_50px] items-center gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <span className="eyebrow !text-[10px]">Group</span>
          <span className="eyebrow !text-[10px]">Description</span>
          <span className="eyebrow !text-[10px]">Sources</span>
          <span className="eyebrow !text-[10px]">Capabilities</span>
          <span />
        </div>
        <ul>
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-[12.5px] text-[var(--text-muted)]">
              No groups match &ldquo;{search}&rdquo;
            </li>
          )}
          {filtered.map((group) => {
            const accent = pickAccent(group.id);
            return (
              <li
                key={group.id}
                className="grid grid-cols-[1.5fr_2fr_1.5fr_140px_50px] items-center gap-4 px-5 py-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-secondary)]/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
                      color: accent,
                    }}
                  >
                    <Users className="w-4 h-4" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate font-display tracking-tight">
                      {group.name}
                    </div>
                    <div className="text-[10.5px] text-[var(--text-muted)] font-mono truncate">
                      {group.id}
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {group.description || (
                    <span className="text-[var(--text-muted)] italic">
                      No description
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.sources.length === 0 ? (
                    <span className="chip !py-0.5 !px-2 !text-[10px]">
                      all sources
                    </span>
                  ) : (
                    <>
                      {group.sources.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="chip !py-0.5 !px-2 !text-[10px]"
                        >
                          {s}
                        </span>
                      ))}
                      {group.sources.length > 3 && (
                        <span className="chip !py-0.5 !px-2 !text-[10px] !text-[var(--text-muted)]">
                          +{group.sources.length - 3}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {group.hasCorpus && (
                    <span className="chip chip-brand !py-0.5 !px-1.5 !text-[9px] uppercase">
                      Corpus
                    </span>
                  )}
                  {group.hasFaq && (
                    <span className="chip chip-success !py-0.5 !px-1.5 !text-[9px] uppercase">
                      FAQ
                    </span>
                  )}
                  {group.hasTemplates && (
                    <span className="chip chip-warning !py-0.5 !px-1.5 !text-[9px] uppercase">
                      TPL
                    </span>
                  )}
                </div>
                <div className="relative flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === group.id ? null : group.id);
                    }}
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Group actions"
                  >
                    <MoreVertical className="w-4 h-4" strokeWidth={1.7} />
                  </button>
                  {menuOpen === group.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1 z-30">
                      <Link
                        href={`/admin/groups/${group.id}`}
                        className="block px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Edit group
                      </Link>
                      <button
                        onClick={() => {
                          setEmbedId(embedId === group.id ? null : group.id);
                          setMenuOpen(null);
                        }}
                        className="w-full text-left block px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Embed snippet
                      </button>
                      {group.id !== "default" && (
                        <button
                          onClick={() => {
                            setDeletingId(group.id);
                            setMenuOpen(null);
                          }}
                          className="w-full text-left block px-3 py-1.5 text-[12px] text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="inline w-3 h-3 mr-1.5" />
                          Delete group
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Delete confirm */}
      {deletingId && (
        <div className="rounded-[var(--radius-lg)] border border-rose-500/30 bg-rose-500/5 p-4 flex items-center gap-3">
          <span className="text-[12.5px] text-[var(--text-primary)]">
            Delete group{" "}
            <code className="font-mono text-rose-500">{deletingId}</code>? This
            cannot be undone.
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleDelete(deletingId)}
              className="px-3 py-1.5 text-[12px] font-semibold rounded-full bg-rose-500 text-white hover:bg-rose-600"
            >
              Confirm delete
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="btn-ghost !py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Embed snippet */}
      {embedId && (
        <div className="surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
              Embed Snippet · {groups.find((g) => g.id === embedId)?.name}
            </h3>
            <button
              onClick={() => setEmbedId(null)}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Close
            </button>
          </div>
          <EmbedCodeGenerator groupId={embedId} />
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: typeof Shield;
  tone: string;
}) {
  return (
    <div className="relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 overflow-hidden shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)] transition-all">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] opacity-80"
        style={{ backgroundColor: tone }}
      />
      <div className="flex items-start justify-between mb-2">
        <span className="eyebrow !text-[10px]">{label}</span>
        <span
          className="w-7 h-7 rounded-[8px] flex items-center justify-center"
          style={{
            backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
            color: tone,
          }}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="numerals text-[28px] font-bold leading-none text-[var(--text-primary)]">
        {value}
      </div>
      <div className="text-[11px] text-[var(--text-muted)] mt-1.5">{sub}</div>
    </div>
  );
}
