'use client';

interface GroupInfo {
  id: string;
  name: string;
  description: string;
}

export function DashboardHeader({
  userName,
  groupId,
  groups,
  onGroupChange,
  onAddFavorite,
}: {
  userName?: string;
  groupId: string;
  groups: GroupInfo[];
  onGroupChange: (id: string) => void;
  onAddFavorite: () => void;
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            M
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">MITR AI</h1>
            {userName && (
              <p className="text-xs text-gray-500">Welcome, {userName}</p>
            )}
          </div>
        </div>

        {groups.length > 1 && (
          <select
            value={groupId}
            onChange={(e) => onGroupChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onAddFavorite}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            + Add Favorite
          </button>
          <a
            href="/"
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Open Chat
          </a>
          <a
            href="/admin"
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Admin
          </a>
        </div>
      </div>
    </header>
  );
}
