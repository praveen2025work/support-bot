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
  const autoQuery = searchParams.get("autoQuery") || null;
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
        {/* Query-name chip removed: the same info already lives in the
            Active Dataset card and the inline result banner. The Table /
            Chart toggle stays because it's the only action surface for
            switching the active result's view mode. */}
        {activeResult && (
          <div className="inline-flex items-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full p-0.5">
            {(["table", "chart"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-[11.5px] font-semibold rounded-full capitalize transition-colors ${
                  viewMode === mode
                    ? "bg-[var(--bg-elevated)] text-[var(--brand)] shadow-[var(--shadow-xs)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {mode === "table" ? "Table" : "Chart"}
              </button>
            ))}
          </div>
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
            initialMessage={autoQuery}
          />
        }
        dataPanel={
          <DataPanel
            activeResult={activeResult}
            pinnedQueries={pinnedQueries}
            onPinnedQueryClick={handlePinnedQueryClick}
            onPin={handlePin}
            viewMode={viewMode}
            kpiStats={kpiStats}
            onSendChat={(text) =>
              window.dispatchEvent(
                new CustomEvent("mitr:send-chat", { detail: text }),
              )
            }
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
