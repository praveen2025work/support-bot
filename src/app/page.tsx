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
      .catch(() => {});
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
      .catch(() => {});
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
  }, []);

  return (
    <>
      <ContextualTopBar
        title="Chat"
        groups={groups}
        activeGroupId={groupId}
        onGroupChange={handleGroupChange}
      >
        <span className="text-[11px] text-[var(--text-muted)]">
          Cmd+K to search
        </span>
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
            splitView
          />
        }
        dataPanel={
          <DataPanel
            activeResult={activeResult}
            pinnedQueries={pinnedQueries}
            onPinnedQueryClick={handlePinnedQueryClick}
            onPin={handlePin}
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
