'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AppHeader } from '@/components/AppHeader';
import { useKeyboardShortcuts, ShortcutConfig } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';

interface GroupInfo {
  id: string;
  name: string;
  description: string;
}

function ChatPage() {
  const searchParams = useSearchParams();
  const initialGroup = searchParams.get('group') || 'default';
  const [groupId, setGroupId] = useState(initialGroup);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const { userInfo } = useUser();
  const { toggleTheme } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  const shortcuts = useMemo<ShortcutConfig[]>(() => [
    {
      key: 'k',
      ctrl: true,
      description: 'Focus chat input',
      action: () => {
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Type a message..."]');
        input?.focus();
      },
    },
    {
      key: '/',
      ctrl: true,
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcuts((v) => !v),
    },
    {
      key: '\\',
      ctrl: true,
      description: 'Toggle dark mode',
      action: () => toggleTheme(),
    },
    {
      key: 'n',
      ctrl: true,
      shift: true,
      description: 'New chat session',
      action: () => setSessionKey((k) => k + 1),
    },
    {
      key: 'Escape',
      description: 'Close modal',
      action: () => setShowShortcuts(false),
    },
  ], [toggleTheme]);

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    fetch('/api/groups')
      .then((res) => res.json())
      .then((data) => setGroups(data.groups))
      .catch(() => {});
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white">
      <AppHeader
        groupId={groupId}
        groups={groups}
        onGroupChange={setGroupId}
      />
      <main className="flex-1 max-w-2xl w-full mx-auto border-x border-gray-200 flex flex-col overflow-hidden">
        <ChatWindow key={`${groupId}-${sessionKey}`} platform="web" groupId={groupId} userName={userInfo?.samAccountName} />
      </main>
      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
