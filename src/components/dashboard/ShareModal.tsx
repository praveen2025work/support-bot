"use client";

import { useState } from "react";
import type { DashboardSharing, DashboardShareEntry } from "@/types/dashboard";
import { X, Globe, Users, Trash2, Plus } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharing: DashboardSharing | undefined;
  ownerId: string;
  onSave: (sharing: DashboardSharing) => void;
}

export function ShareModal({
  isOpen,
  onClose,
  sharing,
  ownerId,
  onSave,
}: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(sharing?.isPublic ?? false);
  const [sharedWith, setSharedWith] = useState<DashboardShareEntry[]>(
    sharing?.sharedWith ?? [],
  );
  const [newUserId, setNewUserId] = useState("");
  const [newPermission, setNewPermission] = useState<"view" | "edit">("view");
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = newUserId.trim();
    if (!trimmed || sharedWith.some((s) => s.userId === trimmed)) return;
    setSharedWith([
      ...sharedWith,
      { userId: trimmed, permission: newPermission },
    ]);
    setNewUserId("");
  };

  const handleRemove = (userId: string) => {
    setSharedWith(sharedWith.filter((s) => s.userId !== userId));
  };

  const handleSave = () => {
    onSave({
      isPublic,
      sharedWith,
      ownerId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Share Dashboard
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Public toggle */}
          <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750">
            <Globe
              size={20}
              className={isPublic ? "text-green-500" : "text-gray-400"}
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Public Dashboard
              </div>
              <div className="text-xs text-gray-500">
                Anyone with access can view
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-gray-300"
            />
          </label>

          {/* Shared users */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Share with users
              </span>
            </div>

            {sharedWith.length > 0 && (
              <div className="space-y-1 mb-3">
                {sharedWith.map((entry) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {entry.userId}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={entry.permission}
                        onChange={(e) => {
                          setSharedWith(
                            sharedWith.map((s) =>
                              s.userId === entry.userId
                                ? {
                                    ...s,
                                    permission: e.target.value as
                                      | "view"
                                      | "edit",
                                  }
                                : s,
                            ),
                          );
                        }}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5"
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                      </select>
                      <button
                        onClick={() => handleRemove(entry.userId)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="User ID..."
                className="flex-1 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={newPermission}
                onChange={(e) =>
                  setNewPermission(e.target.value as "view" | "edit")
                }
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5"
              >
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={!newUserId.trim()}
                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
