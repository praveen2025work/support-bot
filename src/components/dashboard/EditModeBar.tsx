"use client";

interface EditModeBarProps {
  dashboardName: string;
  onAddCard: () => void;
  onAddKpi: () => void;
  onDone: () => void;
}

export function EditModeBar({
  dashboardName,
  onAddCard,
  onAddKpi,
  onDone,
}: EditModeBarProps) {
  return (
    <div className="bg-[var(--brand)] px-4 py-2 flex items-center gap-3">
      <span className="text-[11px] text-white/90 font-medium">
        Editing: {dashboardName}
      </span>
      <div className="flex-1" />
      <button
        onClick={onAddCard}
        className="text-[10px] text-white/80 bg-white/15 hover:bg-white/25 px-2 py-[3px] rounded-[var(--radius-sm)] transition-colors"
      >
        + Add Card
      </button>
      <button
        onClick={onAddKpi}
        className="text-[10px] text-white/80 bg-white/15 hover:bg-white/25 px-2 py-[3px] rounded-[var(--radius-sm)] transition-colors"
      >
        + Add KPI
      </button>
      <button
        onClick={onDone}
        className="text-[10px] text-white font-medium bg-white/25 hover:bg-white/35 px-2.5 py-[3px] rounded-[var(--radius-sm)] transition-colors"
      >
        Done
      </button>
    </div>
  );
}
