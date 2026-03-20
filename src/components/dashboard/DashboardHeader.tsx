"use client";

import { AppHeader } from "@/components/AppHeader";

interface GroupInfo {
  id: string;
  name: string;
  description: string;
}

export function DashboardHeader({
  groupId,
  groups,
  onGroupChange,
  onAddFavorite,
  addLabel = "+ Add Favorite",
}: {
  userName?: string;
  groupId: string;
  groups: GroupInfo[];
  onGroupChange: (id: string) => void;
  onAddFavorite?: () => void;
  addLabel?: string;
}) {
  return (
    <AppHeader
      groupId={groupId}
      groups={groups}
      onGroupChange={onGroupChange}
      extraActions={
        <button
          onClick={onAddFavorite}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {addLabel}
        </button>
      }
    />
  );
}
