"use client";

import { useMemo } from "react";

/* ───────────────────────── Types ──────────────────────────────────── */
export interface LineageRow {
  NamedPnlName: string;
  NamedPnLID?: string;
  MasterBookID: string;
  MasterBookName: string;
  FeedName: string;
  Avg_CompletedOnTime?: string;
  Avg_DelTimePCLocationTime?: string;
  DurationAvg: number;
  DurationMax?: number;
  DurationMin?: number;
  [key: string]: unknown;
}

interface LineageFlowDiagramProps {
  data: LineageRow[];
  selectedPnl: string | null;
  compact?: boolean;
  onSelectPnl?: (name: string) => void;
}

/* ───────────────────────── Helpers ─────────────────────────────────── */
const SLA_THRESHOLD = 5;

function isBreach(dur: number) {
  return dur > SLA_THRESHOLD;
}

/* ───────────────────────── Component ──────────────────────────────── */
export function LineageFlowDiagram({
  data,
  selectedPnl,
  compact = false,
}: LineageFlowDiagramProps) {
  const pnlData = useMemo(
    () => data.filter((d) => d.NamedPnlName === selectedPnl),
    [data, selectedPnl],
  );

  const { masterBooks, allFeeds, hasBreach, pnlId } = useMemo(() => {
    const mb: Record<
      string,
      {
        name: string;
        flagged: boolean;
        feeds: Record<
          string,
          {
            durationAvg: number;
            bofcAvg: string;
            delAvg: string;
            flagged: boolean;
          }
        >;
      }
    > = {};

    let _hasBreach = false;
    let _pnlId = "";

    for (const d of pnlData) {
      if (!_pnlId && d.NamedPnLID) _pnlId = String(d.NamedPnLID);
      const mbId = d.MasterBookID;
      if (!mb[mbId])
        mb[mbId] = { name: d.MasterBookName, feeds: {}, flagged: false };

      const dur =
        typeof d.DurationAvg === "number"
          ? d.DurationAvg
          : parseFloat(String(d.DurationAvg));
      const flagged = isBreach(dur);
      if (flagged) {
        _hasBreach = true;
        mb[mbId].flagged = true;
      }

      mb[mbId].feeds[d.FeedName] = {
        durationAvg: dur,
        bofcAvg: String(d.Avg_CompletedOnTime ?? ""),
        delAvg: String(d.Avg_DelTimePCLocationTime ?? ""),
        flagged,
      };
    }

    const feeds = Object.entries(mb).flatMap(([mbId, m]) =>
      Object.entries(m.feeds).map(([feedName, fi]) => ({
        mbId,
        mbName: m.name,
        feedName,
        ...fi,
      })),
    );

    return {
      masterBooks: mb,
      allFeeds: feeds,
      hasBreach: _hasBreach,
      pnlId: _pnlId,
    };
  }, [pnlData]);

  if (!selectedPnl || pnlData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center shadow-sm">
        <div className="text-3xl mb-2">⛓️</div>
        <div className="text-sm text-gray-400 font-medium">
          Select a Named P&L to view its data lineage
        </div>
      </div>
    );
  }

  const pad = compact ? "px-3 py-2" : "px-3.5 py-2.5";
  const nodeText = compact ? "text-[11px]" : "text-xs";
  const monoText = compact ? "text-[11px]" : "text-sm";
  const colLabelCls =
    "text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5 pl-0.5";

  const nodeBase = (flagged: boolean) =>
    `${pad} rounded-lg border-[1.5px] transition-all ${
      flagged
        ? "border-red-400/60 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
        : ""
    }`;

  const mbCount = Object.keys(masterBooks).length;

  /* ── Legend chips ──────────────────────────────────────────────── */
  const legend = [
    {
      label: "Named P&L",
      cls: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800",
    },
    {
      label: `1 → ${mbCount} Master Book${mbCount > 1 ? "s" : ""}`,
      cls: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800",
    },
    {
      label: `1 → ${allFeeds.length} Feed${allFeeds.length > 1 ? "s" : ""}`,
      cls: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800",
    },
    {
      label: "BOFC Completed (IST)",
      cls: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800",
    },
    {
      label: "Delivery PC (IST)",
      cls: "text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-900/20 dark:border-cyan-800",
    },
    {
      label: "Duration (Hours)",
      cls: "text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm overflow-x-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
          Data Lineage{selectedPnl ? ` — ${selectedPnl}` : ""}
        </div>
        <div className="text-[11px] text-gray-400">
          {selectedPnl} · {mbCount} Master Book{mbCount > 1 ? "s" : ""} ·{" "}
          {allFeeds.length} Feed Path{allFeeds.length > 1 ? "s" : ""}
          {hasBreach && (
            <span className="text-red-500 font-bold ml-2">
              ● SLA Breach Detected (&gt;5h)
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex gap-1.5 mb-3.5 flex-wrap">
          {legend.map((l) => (
            <span
              key={l.label}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${l.cls}`}
            >
              {l.label}
            </span>
          ))}
        </div>
      )}

      {/* Flow columns */}
      <div
        className="flex items-start"
        style={{ minWidth: compact ? 800 : 1050 }}
      >
        {/* Named P&L */}
        <div
          className="flex flex-col gap-1.5"
          style={{ minWidth: compact ? 140 : 175 }}
        >
          <div className={colLabelCls}>Named P&L</div>
          <div
            className={`${nodeBase(hasBreach)} ${
              !hasBreach
                ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : ""
            }`}
          >
            <div className={`${nodeText} font-bold`}>{selectedPnl}</div>
            {pnlId && (
              <div className="text-[10px] opacity-60 mt-0.5">{pnlId}</div>
            )}
          </div>
        </div>

        <Arrow />

        {/* Master Books */}
        <div
          className="flex flex-col gap-1.5"
          style={{ minWidth: compact ? 130 : 160 }}
        >
          <div className={colLabelCls}>Master Books</div>
          {Object.entries(masterBooks).map(([mbId, mb]) => (
            <div
              key={mbId}
              className={`${nodeBase(mb.flagged)} ${
                !mb.flagged
                  ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                  : ""
              }`}
            >
              <div className={`${nodeText} font-bold`}>{mb.name}</div>
              <div className="text-[10px] opacity-60">{mbId}</div>
              <div className="text-[9px] opacity-50 mt-0.5">
                {Object.keys(mb.feeds).length} feed
                {Object.keys(mb.feeds).length > 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>

        <Arrow />

        {/* Feeds */}
        <div
          className="flex flex-col gap-1.5"
          style={{ minWidth: compact ? 110 : 145 }}
        >
          <div className={colLabelCls}>Feeds</div>
          {allFeeds.map((fi) => (
            <div
              key={`${fi.mbId}-${fi.feedName}`}
              className={`${nodeBase(fi.flagged)} ${
                !fi.flagged
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  : ""
              }`}
            >
              <div className={`${nodeText} font-bold`}>{fi.feedName}</div>
              <div className="text-[10px] opacity-60">via {fi.mbId}</div>
            </div>
          ))}
        </div>

        <Arrow />

        {/* BOFC Completed */}
        <div
          className="flex flex-col gap-1.5"
          style={{ minWidth: compact ? 100 : 135 }}
        >
          <div className={colLabelCls}>BOFC Completed (IST)</div>
          {allFeeds.map((fi) => (
            <div
              key={`bofc-${fi.mbId}-${fi.feedName}`}
              className={`${nodeBase(fi.flagged)} ${
                !fi.flagged
                  ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                  : ""
              }`}
            >
              <div className={`${monoText} font-extrabold font-mono`}>
                {fi.bofcAvg || "—"}
              </div>
              <div className="text-[9px] opacity-60">Avg CompletedOn</div>
            </div>
          ))}
        </div>

        <Arrow />

        {/* Delivery PC */}
        <div
          className="flex flex-col gap-1.5"
          style={{ minWidth: compact ? 100 : 135 }}
        >
          <div className={colLabelCls}>Delivery PC (IST)</div>
          {allFeeds.map((fi) => (
            <div
              key={`del-${fi.mbId}-${fi.feedName}`}
              className={`${nodeBase(fi.flagged)} ${
                !fi.flagged
                  ? "border-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                  : ""
              }`}
            >
              <div className={`${monoText} font-extrabold font-mono`}>
                {fi.delAvg || "—"}
              </div>
              <div className="text-[9px] opacity-60">Avg DelTime</div>
            </div>
          ))}
        </div>

        <Arrow />

        {/* Duration */}
        <div
          className="flex flex-col gap-1.5"
          style={{ minWidth: compact ? 110 : 145 }}
        >
          <div className={colLabelCls}>Duration (BOFC→Del)</div>
          {allFeeds.map((fi) => (
            <div
              key={`dur-${fi.mbId}-${fi.feedName}`}
              className={`${pad} rounded-lg border-2 transition-all ${
                fi.flagged
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <div className="text-lg font-extrabold font-mono">
                {fi.durationAvg}h
              </div>
              <div className="text-[10px] font-bold mt-0.5">
                {fi.flagged ? "⚠ SLA BREACH (>5h)" : "✓ Within SLA"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Arrow separator */
function Arrow() {
  return (
    <div className="flex items-center justify-center w-10 shrink-0 pt-7 text-gray-300 dark:text-gray-600 text-base select-none">
      →
    </div>
  );
}
