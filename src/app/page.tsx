'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useUser } from '@/contexts/UserContext';

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
  const { userInfo, isAdmin, loading: userLoading } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/groups')
      .then((res) => res.json())
      .then((data) => setGroups(data.groups))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <main className="h-screen max-w-2xl mx-auto border-x border-gray-200 flex flex-col">
      <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-3 bg-gray-50">
        {groups.length > 1 && (
          <>
            <label htmlFor="group-select" className="text-sm text-gray-600 font-medium">
              Group:
            </label>
            <select
              id="group-select"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {groups.find((g) => g.id === groupId)?.description && (
              <span className="text-xs text-gray-400">
                {groups.find((g) => g.id === groupId)?.description}
              </span>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-3">
          <a
            href="/dashboard"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Dashboard
          </a>
          {isAdmin && (
            <a
              href="/admin"
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
            >
              Admin
            </a>
          )}
          <a
            href="/onboard"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            + Add Group
          </a>
          {/* User avatar / dropdown */}
          <div className="relative" ref={menuRef}>
            {userLoading ? (
              <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
            ) : userInfo ? (
              <>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center hover:bg-blue-700 transition-colors"
                  title={userInfo.displayName}
                >
                  {userInfo.givenName?.[0]}{userInfo.surname?.[0]}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-9 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{userInfo.displayName}</p>
                      <p className="text-xs text-gray-500">{userInfo.emailAddress}</p>
                    </div>
                    <div className="px-4 py-2 space-y-1 text-xs text-gray-600">
                      {userInfo.department && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Department</span>
                          <span>{userInfo.department}</span>
                        </div>
                      )}
                      {userInfo.role && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Role</span>
                          <span>{userInfo.role}</span>
                        </div>
                      )}
                      {userInfo.location && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Location</span>
                          <span>{userInfo.location}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Employee ID</span>
                        <span>{userInfo.employeeId}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex-1">
        <ChatWindow key={groupId} platform="web" groupId={groupId} userName={userInfo?.samAccountName} />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
