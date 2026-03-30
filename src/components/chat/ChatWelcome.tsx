"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Clock,
  RotateCw,
  AlertTriangle,
  Bell,
  CheckCircle,
  Database,
  FileSpreadsheet,
  Globe,
  FileText,
  Layers,
  HelpCircle,
  Search,
} from "lucide-react";
import type { HomeFeedData } from "@/types/home-feed";
import type { CatalogEntry } from "@/types/catalog";

interface ChatWelcomeProps {
  groupId: string;
  userId: string;
  onSendQuery: (queryName: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const TYPE_ICONS: Record<string, typeof Database> = {
  api: Database,
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  url: Globe,
  document: FileText,
  combined: Layers,
};

const TYPE_COLORS: Record<string, string> = {
  api: "bg-blue-100 text-blue-700",
  csv: "bg-amber-100 text-amber-700",
  xlsx: "bg-emerald-100 text-emerald-700",
  url: "bg-green-100 text-green-700",
  document: "bg-purple-100 text-purple-700",
  combined: "bg-indigo-100 text-indigo-700",
};

const HELP_ITEMS = [
  { label: "List all queries", command: "list queries", icon: Database },
  { label: "Run a query", command: "run monthly_revenue", icon: Sparkles },
  {
    label: "Search knowledge base",
    command: "search docs for...",
    icon: Search,
  },
  { label: "Get help", command: "help", icon: HelpCircle },
];

export function ChatWelcome({
  groupId,
  userId,
  onSendQuery,
}: ChatWelcomeProps) {
  const [feedData, setFeedData] = useState<HomeFeedData | null>(null);
  const [queries, setQueries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryFilter, setQueryFilter] = useState("");

  useEffect(() => {
    async function fetchAll() {
      try {
        const [feedRes, catalogRes] = await Promise.allSettled([
          fetch(
            `/api/home-feed?${new URLSearchParams({ groupId, userId }).toString()}`,
          ),
          fetch(`/api/catalog?groupId=${encodeURIComponent(groupId)}`),
        ]);

        if (feedRes.status === "fulfilled" && feedRes.value.ok) {
          const json = await feedRes.value.json();
          if (json.success) setFeedData(json.data as HomeFeedData);
        }

        if (catalogRes.status === "fulfilled" && catalogRes.value.ok) {
          const json = await catalogRes.value.json();
          if (json.success) setQueries(json.data as CatalogEntry[]);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    void fetchAll();
  }, [groupId, userId]);

  const briefing = feedData?.briefing;
  const suggestions = feedData?.suggestedQueries ?? [];
  const recentActivity = feedData?.recentActivity ?? [];
  const hasIssues =
    briefing &&
    (briefing.anomaliesDetected > 0 || briefing.watchAlertsTriggered > 0);

  const filteredQueries = queryFilter
    ? queries.filter(
        (q) =>
          q.name.toLowerCase().includes(queryFilter.toLowerCase()) ||
          q.description?.toLowerCase().includes(queryFilter.toLowerCase()) ||
          q.tags.some((t) =>
            t.toLowerCase().includes(queryFilter.toLowerCase()),
          ),
      )
    : queries;

  return (
    <div className="flex-1 flex items-start justify-center overflow-auto px-4 py-6">
      <div className="w-full max-w-2xl flex flex-col gap-5">
        {/* Greeting */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {getGreeting()}
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Ask me about your data, run a query, or pick from below.
          </p>
        </div>

        {/* Briefing (compact) */}
        {!loading && briefing && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border text-[13px] ${
              hasIssues
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-[var(--border)] bg-[var(--bg-secondary)]"
            }`}
          >
            {hasIssues ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0" />
            )}
            <span className="text-[var(--text-secondary)] flex-1">
              {briefing.message}
            </span>
            {briefing.anomaliesDetected > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-red-500">
                <AlertTriangle className="w-3 h-3" />
                {briefing.anomaliesDetected}
              </span>
            )}
            {briefing.watchAlertsTriggered > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-amber-500">
                <Bell className="w-3 h-3" />
                {briefing.watchAlertsTriggered}
              </span>
            )}
          </div>
        )}

        {/* Quick Help */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Quick Actions
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {HELP_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.command}
                  onClick={() => onSendQuery(item.command)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <div>
                    <div className="text-[13px] font-medium text-[var(--text-primary)]">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono">
                      {item.command}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggested queries */}
        {!loading && suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Suggested for You
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.queryName}
                  onClick={() => onSendQuery(`run ${s.queryName}`)}
                  className="px-3 py-2 text-left rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {s.queryName}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {s.reason}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Available Queries */}
        {!loading && queries.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Available Queries
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  ({queries.length})
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={queryFilter}
                  onChange={(e) => setQueryFilter(e.target.value)}
                  placeholder="Filter..."
                  className="pl-7 pr-3 py-1 w-40 text-[12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[280px] overflow-auto pr-1">
              {filteredQueries.map((q) => {
                const Icon = TYPE_ICONS[q.type] ?? Database;
                const colorClass =
                  TYPE_COLORS[q.type] ?? "bg-gray-100 text-gray-700";
                return (
                  <button
                    key={q.name}
                    onClick={() => onSendQuery(`run ${q.name}`)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                          {q.name}
                        </span>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium ${colorClass}`}
                        >
                          {q.type}
                        </span>
                      </div>
                      {q.description && (
                        <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                          {q.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredQueries.length === 0 && (
                <div className="col-span-2 text-[12px] text-[var(--text-muted)] text-center py-3">
                  No queries match &ldquo;{queryFilter}&rdquo;
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {!loading && recentActivity.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Recent
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {recentActivity.map((item, i) => (
                <button
                  key={`${item.queryName}-${i}`}
                  onClick={() => onSendQuery(`run ${item.queryName}`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      {item.queryName}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] ml-2">
                      {item.userMessage}
                    </span>
                  </div>
                  <RotateCw className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            <div className="h-12 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] animate-pulse" />
            <div className="h-20 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] animate-pulse" />
            <div className="h-32 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
