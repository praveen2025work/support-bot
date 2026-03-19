"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf";
import { EmbedCodeGenerator } from "./components/EmbedCodeGenerator";

interface GroupInfo {
  id: string;
  name: string;
  description: string;
  sources: string[];
  hasCorpus: boolean;
  hasFaq: boolean;
  hasTemplates: boolean;
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [embedId, setEmbedId] = useState<string | null>(null);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/admin/groups");
      const data = await res.json();
      setGroups(data.groups);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/groups/${id}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      if (res.ok) {
        setDeletingId(null);
        fetchGroups();
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading groups...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500">
            Manage chatbot groups and generate embed codes
          </p>
        </div>
        <Link
          href="/admin/onboard"
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
        >
          + Add Group
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sources
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                key={group.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{group.name}</div>
                  <div className="text-xs text-gray-400 font-mono">
                    {group.id}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{group.description}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {group.sources.map((s) => (
                      <span
                        key={s}
                        className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {s}
                      </span>
                    ))}
                    {group.sources.length === 0 && (
                      <span className="text-xs text-gray-400">all</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/groups/${group.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() =>
                        setEmbedId(embedId === group.id ? null : group.id)
                      }
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Embed
                    </button>
                    {group.id !== "default" && (
                      <>
                        {deletingId === group.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(group.id)}
                              className="text-xs text-red-600 font-medium hover:underline"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeletingId(group.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline embed code panel */}
      {embedId && (
        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Embed Code for {groups.find((g) => g.id === embedId)?.name}
          </h3>
          <EmbedCodeGenerator groupId={embedId} />
        </div>
      )}
    </div>
  );
}
