"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useKeyboardShortcuts,
  ShortcutConfig,
} from "@/hooks/useKeyboardShortcuts";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { ChatSplitView } from "@/components/chat/ChatSplitView";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { DataPanel } from "@/components/chat/DataPanel";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

interface GroupInfo {
  id: string;
  name: string;
  description: string;
}

interface ActiveResult {
  queryName: string;
  title: string;
  subtitle: string;
  data: Record<string, unknown>[];
  columns: string[];
  executionMs?: number;
}

function ChatPage() {
  const searchParams = useSearchParams();
  const initialGroup = searchParams.get("group") || "default";
  const [groupId, setGroupId] = useState(initialGroup);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [sessionKey, setSessionKey] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeResult, setActiveResult] = useState<ActiveResult | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [pinnedQueryNames, setPinnedQueryNames] = useState<Set<string>>(
    new Set(),
  );
  const [pinnedQueries, setPinnedQueries] = useState<
    Array<{ name: string; label: string }>
  >([]);
  const { userInfo } = useUser();
  const { toggleTheme } = useTheme();

  const shortcuts = useMemo<ShortcutConfig[]>(
    () => [
      {
        key: "k",
        ctrl: true,
        description: "Focus chat input",
        action: () => {
          const input = document.querySelector<HTMLInputElement>(
            'input[placeholder="Type a message..."]',
          );
          input?.focus();
        },
      },
      {
        key: "/",
        ctrl: true,
        description: "Show keyboard shortcuts",
        action: () => setShowShortcuts((v) => !v),
      },
      {
        key: "\\",
        ctrl: true,
        description: "Toggle dark mode",
        action: () => toggleTheme(),
      },
      {
        key: "n",
        ctrl: true,
        shift: true,
        description: "New chat session",
        action: () => setSessionKey((k) => k + 1),
      },
      {
        key: "Escape",
        description: "Close modal",
        action: () => setShowShortcuts(false),
      },
    ],
    [toggleTheme],
  );

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.groups)) setGroups(data.groups);
      })
      .catch((err) => console.error("Failed to load groups:", err));
  }, []);

  useEffect(() => {
    if (!userInfo?.samAccountName) return;
    fetch(`/api/preferences?userId=${userInfo.samAccountName}`)
      .then((r) => r.json())
      .then((prefs: unknown) => {
        if (
          prefs &&
          typeof prefs === "object" &&
          "favorites" in prefs &&
          Array.isArray((prefs as { favorites: unknown }).favorites)
        ) {
          const favs = (
            prefs as { favorites: Array<{ queryName: string; label?: string }> }
          ).favorites.map((f) => ({
            name: f.queryName,
            label: f.label ?? f.queryName,
          }));
          setPinnedQueries(favs);
          setPinnedQueryNames(new Set(favs.map((f) => f.name)));
        }
      })
      .catch((err) => console.error("Failed to load preferences:", err));
  }, [userInfo?.samAccountName]);

  const handleGroupChange = useCallback((id: string) => {
    setGroupId(id);
    setSessionKey((k) => k + 1);
    setActiveResult(null);
  }, []);

  const handlePin = useCallback((queryName: string) => {
    setPinnedQueryNames((prev) => {
      const next = new Set(prev);
      if (next.has(queryName)) {
        next.delete(queryName);
        setPinnedQueries((pq) => pq.filter((q) => q.name !== queryName));
      } else {
        next.add(queryName);
        setPinnedQueries((pq) => [
          ...pq,
          { name: queryName, label: queryName },
        ]);
      }
      return next;
    });
  }, []);

  const handlePinnedQueryClick = useCallback((_queryName: string) => {
    // Placeholder: full integration requires ChatWindow to expose an executeQuery callback
  }, []);

  const handleQueryResult = useCallback((result: ActiveResult) => {
    setActiveResult(result);
    setViewMode("table");
  }, []);

  const kpiStats = useMemo(() => {
    if (!activeResult || activeResult.data.length === 0) return [];
    const numCols = activeResult.columns.filter((col) =>
      activeResult.data.some((row) => typeof row[col] === "number"),
    );
    return numCols.slice(0, 4).map((col) => {
      const values = activeResult.data
        .map((r) => Number(r[col]))
        .filter((v) => !isNaN(v));
      const avg =
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
      const max =
        values.length > 0
          ? values.reduce((a, b) => Math.max(a, b), -Infinity)
          : 0;
      const min =
        values.length > 0
          ? values.reduce((a, b) => Math.min(a, b), Infinity)
          : 0;
      return {
        col,
        avg: avg.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        max: max.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        min: min.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      };
    });
  }, [activeResult]);

  const handleShowInPanel = useCallback(
    (data: Record<string, unknown>[], columns: string[], title: string) => {
      setActiveResult({
        queryName: title,
        title,
        subtitle: `${data.length} rows`,
        data,
        columns,
      });
    },
    [],
  );

  return (
    <>
      <ContextualTopBar
        title="Chat"
        groups={groups}
        activeGroupId={groupId}
        onGroupChange={handleGroupChange}
      >
        {activeResult && (
          <>
            <div className="flex items-center gap-1.5 bg-[var(--brand-subtle)] px-2.5 py-1 rounded-[var(--radius-md)]">
              <div className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full" />
              <span className="text-[11px] text-[var(--brand)] font-medium">
                {activeResult.queryName}
              </span>
              <span className="text-[10px] text-[var(--brand)] opacity-70">
                {activeResult.data.length} rows
                {activeResult.executionMs != null &&
                  ` · ${activeResult.executionMs}ms`}
              </span>
            </div>

            {kpiStats.length > 0 && (
              <div className="flex items-center gap-2">
                {kpiStats.map((s) => (
                  <div
                    key={s.col}
                    className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-2 py-0.5"
                  >
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                      {s.col}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--text-primary)]">
                      {s.avg}
                    </span>
                    <span className="text-[9px] text-[var(--success)]">
                      ↑{s.max}
                    </span>
                    <span className="text-[9px] text-[var(--danger)]">
                      ↓{s.min}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="w-px h-4 bg-[var(--border)]" />

            <div className="flex gap-0.5">
              {(["table", "chart"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-0.5 rounded-[var(--radius-md)] text-[10px] font-medium capitalize transition-colors ${viewMode === mode ? "bg-[var(--brand-subtle)] text-[var(--brand)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
                >
                  {mode === "table" ? "Table" : "Chart"}
                </button>
              ))}
            </div>
          </>
        )}
      </ContextualTopBar>

      <ChatSplitView
        chatPanel={
          <ChatWindow
            key={`${groupId}-${sessionKey}`}
            platform="web"
            hideHeader
            groupId={groupId}
            userName={userInfo?.samAccountName}
            onQueryResult={handleQueryResult}
            onShowInPanel={handleShowInPanel}
            splitView
          />
        }
        dataPanel={
          <DataPanel
            activeResult={activeResult}
            pinnedQueries={pinnedQueries}
            onPinnedQueryClick={handlePinnedQueryClick}
            onPin={handlePin}
            viewMode={viewMode}
          />
        }
      />

      {showShortcuts && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
