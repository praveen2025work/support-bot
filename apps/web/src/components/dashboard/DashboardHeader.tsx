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
          aria-label="Add favorite"
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{
            color: "var(--brand)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--brand-subtle)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--brand-subtle)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {addLabel}
        </button>
      }
    />
  );
}
