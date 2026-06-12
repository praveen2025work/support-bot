"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf";

interface Probe {
  text: string;
  status: "pending" | "running" | "pass" | "fail";
  intent?: string;
}

const FALLBACK_INTENTS = ["fallback", "unknown", "none", "None"];

/**
 * Post-create smoke test: fires up to 3 probe utterances at the freshly created
 * group via /api/chat and reports whether each classified to a real intent.
 * Non-blocking — the group already exists; this just validates it responds.
 */
export function SmokeTest({
  groupId,
  queries,
  onFinish,
}: {
  groupId: string;
  queries: { name: string }[];
  onFinish: () => void;
}) {
  const buildProbes = useCallback((): Probe[] => {
    const names = queries
      .map((q) => q.name.trim())
      .filter(Boolean)
      .slice(0, 2);
    const texts = names.map((n) => `run ${n.replace(/_/g, " ")}`);
    texts.push("what queries are available");
    return texts.slice(0, 3).map((text) => ({ text, status: "pending" }));
  }, [queries]);

  const [probes, setProbes] = useState<Probe[]>(buildProbes);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    const next = buildProbes();
    setProbes(next.map((p) => ({ ...p })));
    for (let i = 0; i < next.length; i++) {
      next[i] = { ...next[i], status: "running" };
      setProbes([...next]);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            text: next[i].text,
            sessionId: `onboard-smoke-${Date.now()}-${i}`,
            groupId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const intent = data?.intent ? String(data.intent) : undefined;
        const ok = res.ok && !!intent && !FALLBACK_INTENTS.includes(intent);
        next[i] = { ...next[i], status: ok ? "pass" : "fail", intent };
      } catch {
        next[i] = { ...next[i], status: "fail" };
      }
      setProbes([...next]);
    }
    setRunning(false);
  }, [buildProbes, groupId]);

  useEffect(() => {
    void run();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passCount = probes.filter((p) => p.status === "pass").length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">
        Smoke test · {groupId}
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        {running
          ? "Running probe queries against the new group…"
          : `${passCount}/${probes.length} probes classified to a real intent.`}
      </p>
      <ul className="space-y-2 mb-5">
        {probes.map((p, i) => (
          <li
            key={i}
            className="flex items-center gap-3 text-sm border border-gray-100 rounded-lg px-3 py-2"
          >
            {p.status === "pass" ? (
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            ) : p.status === "fail" ? (
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-gray-400 shrink-0 animate-spin" />
            )}
            <span className="font-mono text-xs text-gray-700 flex-1">
              {p.text}
            </span>
            {p.intent && (
              <span className="text-xs text-gray-400 font-mono">
                {p.intent}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onFinish()}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
        >
          Finish → view group
        </button>
        <button
          onClick={run}
          disabled={running}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {running ? "Running…" : "Re-run"}
        </button>
      </div>
    </div>
  );
}
