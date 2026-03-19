"use client";

import { useState, useEffect } from "react";
import { MessageSquare, RotateCcw, X } from "lucide-react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useUser } from "@/contexts/UserContext";

interface GroupInfo {
  id: string;
  name: string;
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [groupId, setGroupId] = useState("default");
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [sessionKey, setSessionKey] = useState(0);
  const { userInfo } = useUser();

  useEffect(() => {
    fetch("/api/admin/groups")
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
        <MessageSquare size={24} />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] max-h-[calc(100vh-100px)] max-w-[calc(100vw-48px)] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-600 text-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare size={18} />
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
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-blue-500 transition-colors"
            title="Close"
          >
            <X size={14} />
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
