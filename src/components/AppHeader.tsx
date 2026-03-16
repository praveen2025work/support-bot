'use client';

import { usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState, useEffect, useRef } from 'react';

interface GroupInfo {
  id: string;
  name: string;
  description: string;
}

export function AppHeader({
  groupId,
  groups,
  onGroupChange,
  extraActions,
}: {
  groupId?: string;
  groups?: GroupInfo[];
  onGroupChange?: (id: string) => void;
  /** Additional action buttons (e.g. + Add Favorite on dashboard) */
  extraActions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { userInfo, isAdmin, loading: userLoading } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      isActive(path)
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
    }`;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Branding */}
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
          <span className="text-sm font-semibold text-gray-900">MITR AI</span>
        </a>

        {/* Group dropdown */}
        {groups && groups.length > 1 && onGroupChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="app-group-select" className="text-xs text-gray-500 font-medium">
              Group:
            </label>
            <select
              id="app-group-select"
              value={groupId || ''}
              onChange={(e) => onGroupChange(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <a href="/" className={navLinkClass('/')}>
            Chat
          </a>
          <a href="/dashboard" className={navLinkClass('/dashboard')}>
            Dashboard
          </a>
          {isAdmin && (
            <a href="/admin" className={navLinkClass('/admin')}>
              Admin
            </a>
          )}
          <a href="/onboard" className={navLinkClass('/onboard')}>
            + Add Group
          </a>
        </nav>

        {/* Right side: extra actions + theme + user */}
        <div className="ml-auto flex items-center gap-2">
          {extraActions}
          <ThemeToggle />

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
                  {userInfo.givenName?.[0]}
                  {userInfo.surname?.[0]}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-9 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">
                        {userInfo.displayName}
                      </p>
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
    </header>
  );
}
