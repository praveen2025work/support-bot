'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  resourceType: string;
  details?: string;
  ip?: string;
}

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const fetchAudit = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set('action', filterAction);
      if (filterUser) params.set('user', filterUser);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterUser, search]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  useEffect(() => {
    setPage(0);
  }, [filterAction, filterUser, search]);

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action))).sort();
  const uniqueUsers = Array.from(new Set(entries.map((e) => e.user))).sort();
  const todayStr = new Date().toISOString().slice(0, 10);
  const actionsToday = entries.filter((e) => e.timestamp.startsWith(todayStr)).length;
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const paged = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    login: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    export: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Audit Trail</h1>
          <p className="text-sm text-[var(--text-muted)]">Track all administrative actions and changes</p>
        </div>
        <button onClick={fetchAudit} className="text-xs text-[var(--text-link,#2563eb)] hover:underline">Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] p-4">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Total Actions</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{entries.length}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] p-4">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Unique Users</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{uniqueUsers.length}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] p-4">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Actions Today</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{actionsToday}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-sm border border-[var(--border-primary)] rounded-lg px-3 py-1.5 bg-[var(--bg-input)] text-[var(--text-primary)]"
        >
          <option value="">All actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="text-sm border border-[var(--border-primary)] rounded-lg px-3 py-1.5 bg-[var(--bg-input)] text-[var(--text-primary)]"
        >
          <option value="">All users</option>
          {uniqueUsers.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="flex-1 text-sm border border-[var(--border-primary)] rounded-lg px-3 py-1.5 bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading audit log...</p>
      ) : entries.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No audit entries yet. Actions will be logged as users interact with the admin panel.</p>
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                  <th className="text-left px-4 py-2 font-medium text-[var(--text-tertiary)] w-40">Timestamp</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--text-tertiary)] w-24">Action</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--text-tertiary)] w-28">User</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--text-tertiary)] w-24">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--text-tertiary)]">Resource</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--text-tertiary)]">Details</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--border-secondary)] hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-2 text-xs text-[var(--text-muted)]">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${actionColors[entry.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--text-secondary)] font-mono">{entry.user}</td>
                    <td className="px-4 py-2 text-xs text-[var(--text-muted)]">{entry.resourceType}</td>
                    <td className="px-4 py-2 text-xs text-[var(--text-primary)] font-mono">{entry.resource}</td>
                    <td className="px-4 py-2 text-xs text-[var(--text-muted)] truncate max-w-xs">{entry.details || '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-[var(--text-muted)]">
                Showing {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, entries.length)} of {entries.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-xs rounded border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
