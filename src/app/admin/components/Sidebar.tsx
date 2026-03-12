'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

const NAV_SECTIONS = [
  {
    label: 'Management',
    items: [
      { href: '/admin', label: 'Groups', match: (p: string) => p === '/admin' || p.startsWith('/admin/groups') },
      { href: '/admin/intents', label: 'Intents', match: (p: string) => p.startsWith('/admin/intents') },
      { href: '/admin/templates', label: 'Templates', match: (p: string) => p.startsWith('/admin/templates') },
      { href: '/admin/files', label: 'Files', match: (p: string) => p.startsWith('/admin/files') },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/admin/test-console', label: 'Test Console', match: (p: string) => p.startsWith('/admin/test-console') },
      { href: '/admin/analytics', label: 'Analytics', match: (p: string) => p.startsWith('/admin/analytics') },
      { href: '/admin/logs', label: 'Conversation Logs', match: (p: string) => p.startsWith('/admin/logs') },
      { href: '/admin/learning', label: 'Learning', match: (p: string) => p.startsWith('/admin/learning') },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/admin/filters', label: 'Filters', match: (p: string) => p.startsWith('/admin/filters') },
      { href: '/admin/users', label: 'Users', match: (p: string) => p.startsWith('/admin/users') },
      { href: '/admin/settings', label: 'Settings', match: (p: string) => p.startsWith('/admin/settings') },
    ],
  },
  {
    label: 'Guides',
    items: [
      { href: '/admin/guides/user-guide', label: 'User Guide', match: (p: string) => p === '/admin/guides/user-guide' },
      { href: '/admin/guides/demo-setup', label: 'Demo Setup', match: (p: string) => p === '/admin/guides/demo-setup' },
      { href: '/admin/guides/prod-deploy', label: 'Prod Deploy', match: (p: string) => p === '/admin/guides/prod-deploy' },
      { href: '/admin/guides/config-guide', label: 'Config Guide', match: (p: string) => p === '/admin/guides/config-guide' },
      { href: '/admin/guides/windows-setup', label: 'Windows Setup', match: (p: string) => p === '/admin/guides/windows-setup' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { userInfo, loading: userLoading } = useUser();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Admin</h1>
        <p className="text-xs text-gray-500">Bot Platform Dashboard</p>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200 space-y-2">
        {userLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : userInfo ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
              {userInfo.givenName?.[0]}{userInfo.surname?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{userInfo.displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{userInfo.department || userInfo.role}</p>
            </div>
          </div>
        ) : null}
        <Link
          href="/"
          className="text-xs text-gray-500 hover:text-blue-600 hover:underline block"
        >
          &larr; Back to Chat
        </Link>
      </div>
    </aside>
  );
}
