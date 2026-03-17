'use client';

import { useState, useEffect } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useUser } from '@/contexts/UserContext';

interface GroupInfo {
  id: string;
  name: string;
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [groupId, setGroupId] = useState('default');
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [sessionKey, setSessionKey] = useState(0);
  const { userInfo } = useUser();

  useEffect(() => {
    fetch('/api/admin/groups')
      .then((r) => r.json())
      .then((d) => {
        const list = d.groups || [];
        setGroups(list);
        if (list.length > 0 && !list.find((g: GroupInfo) => g.id === groupId)) {
          setGroupId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center"
        title="Test Chatbot"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] max-h-[calc(100vh-100px)] max-w-[calc(100vw-48px)] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-600 text-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <select
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setSessionKey((k) => k + 1);
            }}
            className="bg-blue-500 text-white text-xs rounded px-1.5 py-0.5 border border-blue-400 focus:outline-none focus:ring-1 focus:ring-white/50 max-w-[180px] truncate"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSessionKey((k) => k + 1)}
            className="p-1 rounded hover:bg-blue-500 transition-colors"
            title="New session"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-blue-500 transition-colors"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          key={`widget-${groupId}-${sessionKey}`}
          platform="widget"
          groupId={groupId}
          userName={userInfo?.samAccountName}
        />
      </div>
    </div>
  );
}
