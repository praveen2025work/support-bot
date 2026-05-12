"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RichContentRenderer } from "@/components/chat/RichContentRenderer";
import type { Message } from "@/hooks/useChat";

interface ViewSnapshot {
  id: string;
  createdAt: string;
  createdBy?: string;
  groupId: string;
  queryName?: string;
  followUpChain?: Array<{ operation: string; text: string }>;
  text: string;
  richContent?: NonNullable<Message["richContent"]>;
  intent?: string;
  confidence?: number;
}

export default function SharedViewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [snapshot, setSnapshot] = useState<ViewSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/views/${encodeURIComponent(id)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            setError(data?.error || `Failed to load (${res.status})`);
            setLoading(false);
          }
          return;
        }
        const data = (await res.json()) as ViewSnapshot;
        if (!cancelled) {
          setSnapshot(data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            `Network error: ${e instanceof Error ? e.message : String(e)}`,
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--text-muted)]">Loading shared view…</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Can&apos;t open this view
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {error || "The shared view doesn't exist or has been removed."}
          </p>
        </div>
      </div>
    );
  }

  const createdAt = new Date(snapshot.createdAt);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              Shared view
            </p>
            <h1 className="text-lg font-semibold text-gray-900 mt-0.5">
              {snapshot.queryName
                ? `"${snapshot.queryName}" — ${snapshot.groupId}`
                : `Shared from ${snapshot.groupId}`}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">
              {createdAt.toLocaleString()}
            </p>
            {snapshot.createdBy && (
              <p className="text-xs text-[var(--text-muted)]">
                by {snapshot.createdBy}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Follow-up trail — the journey the original user took to get here */}
        {snapshot.followUpChain && snapshot.followUpChain.length > 0 && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Steps applied
            </p>
            <ol className="flex flex-wrap gap-2 text-sm">
              {snapshot.followUpChain.map((step, i) => (
                <li
                  key={i}
                  className="px-3 py-1 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] border border-[var(--brand)] font-mono text-xs"
                >
                  {i + 1}. {step.text || step.operation}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* The frozen result text */}
        <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-900 mb-4 leading-relaxed">
            {snapshot.text}
          </p>

          {snapshot.richContent && (
            <RichContentRenderer richContent={snapshot.richContent} />
          )}
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-6 text-center">
          This is a snapshot. Data may have changed since it was captured.{" "}
          <a href="/" className="text-[var(--brand)] hover:underline">
            Open the live app
          </a>{" "}
          to run a fresh query.
        </p>
      </main>
    </div>
  );
}
