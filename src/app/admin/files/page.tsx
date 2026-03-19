"use client";

import { useState, useEffect } from "react";
import { csrfHeaders } from "@/lib/csrf";

interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  modifiedAt: string;
  preview: string;
}

export default function FileManagerPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/admin/files");
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const loadFile = async (name: string) => {
    setSelectedFile(name);
    setShowNew(false);
    try {
      // Read full content via a simple fetch
      const res = await fetch(
        `/api/admin/files?content=true&name=${encodeURIComponent(name)}`,
      );
      // Since our GET doesn't support this, just use the preview for now.
      // We'll load via a dedicated endpoint
      const file = files.find((f) => f.name === name);
      if (file) {
        // Fetch full content by re-reading
        const contentRes = await fetch("/api/admin/files");
        const data = await contentRes.json();
        // For full content, we need a read endpoint. For now, we'll create one inline.
        setFileContent(file.preview); // Placeholder — will be full content
      }
    } catch {
      setFileContent("Error loading file");
    }
  };

  // Better approach: fetch individual file content
  useEffect(() => {
    if (selectedFile) {
      fetch(`/api/admin/files/read?name=${encodeURIComponent(selectedFile)}`)
        .then((r) => r.json())
        .then((d) => setFileContent(d.content || ""))
        .catch(() => setFileContent("Error loading file"));
    }
  }, [selectedFile]);

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await fetch("/api/admin/files", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ name: selectedFile, content: fileContent }),
      });
      await fetchFiles();
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newFileName.trim()) return;
    setSaving(true);
    try {
      const name = newFileName.endsWith(".md")
        ? newFileName
        : `${newFileName}.md`;
      await fetch("/api/admin/files", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          name,
          content: newFileContent || `# ${newFileName}\n\nContent here...`,
        }),
      });
      await fetchFiles();
      setShowNew(false);
      setNewFileName("");
      setNewFileContent("");
      setSelectedFile(name);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await fetch(`/api/admin/files?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      if (selectedFile === name) {
        setSelectedFile(null);
        setFileContent("");
      }
      setDeletingFile(null);
      await fetchFiles();
    } catch {
      // ignore
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (loading) return <p className="text-sm text-gray-500">Loading files...</p>;

  return (
    <div>
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">File Manager</h1>
          <p className="text-sm text-gray-500">
            Manage BRD, SOP, and knowledge documents for document search queries
          </p>
        </div>
        <button
          onClick={() => {
            setShowNew(true);
            setSelectedFile(null);
          }}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
        >
          + New Document
        </button>
      </div>

      <div className="flex gap-4">
        {/* File list */}
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Documents ({files.length})
              </span>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.name}
                  className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                    selectedFile === file.name
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className="px-4 py-3"
                    onClick={() => loadFile(file.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {file.name}
                      </div>
                      <span className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded uppercase">
                        {file.extension}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {formatSize(file.size)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(file.modifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {file.preview.substring(0, 80)}...
                    </div>
                  </div>
                  <div className="px-4 pb-2 flex gap-2">
                    {deletingFile === file.name ? (
                      <>
                        <button
                          onClick={() => handleDelete(file.name)}
                          className="text-[10px] text-red-600 font-medium hover:underline"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingFile(null)}
                          className="text-[10px] text-gray-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeletingFile(file.name)}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {files.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-gray-400">
                  No documents yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Editor panel */}
        <div className="flex-1 min-w-0">
          {showNew ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                New Document
              </h2>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  File Name
                </label>
                <input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. brd-payments-v2.md"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Content (Markdown)
                </label>
                <textarea
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  rows={16}
                  placeholder="# Document Title&#10;&#10;## Section 1&#10;Content here..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !newFileName.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Document"}
                </button>
                <button
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 font-mono">
                  {selectedFile}
                </h2>
                <span className="text-xs text-gray-400">
                  {files.find((f) => f.name === selectedFile)?.size
                    ? formatSize(
                        files.find((f) => f.name === selectedFile)!.size,
                      )
                    : ""}
                </span>
              </div>
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                rows={20}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono"
              />
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <p className="text-xs text-gray-400">
                  Changes are saved to data/knowledge/ and available for
                  document search queries
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">
                Select a document to edit or create a new one.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Documents in this directory are used by document-type queries
                for keyword search.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
