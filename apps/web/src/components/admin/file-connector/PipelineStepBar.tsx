"use client";

export type PipelineStep =
  | "select"
  | "where"
  | "groupBy"
  | "having"
  | "orderBy"
  | "limit";

interface PipelineStepBarProps {
  activeStep: PipelineStep;
  onStepChange: (step: PipelineStep) => void;
  configuredSteps: Set<PipelineStep>;
}

const STEPS: readonly { key: PipelineStep; label: string }[] = [
  { key: "select", label: "SELECT" },
  { key: "where", label: "WHERE" },
  { key: "groupBy", label: "GROUP BY" },
  { key: "having", label: "HAVING" },
  { key: "orderBy", label: "ORDER BY" },
  { key: "limit", label: "LIMIT" },
] as const;

function getStepClassName(
  step: PipelineStep,
  activeStep: PipelineStep,
  configuredSteps: Set<PipelineStep>,
): string {
  const base =
    "px-3 py-1.5 rounded-full text-[12px] font-medium cursor-pointer transition-colors select-none";

  if (step === activeStep) {
    return `${base} bg-[var(--brand)] text-[var(--brand-text)]`;
  }

  if (configuredSteps.has(step)) {
    return `${base} bg-[var(--brand-subtle)] text-[var(--brand)]`;
  }

  return `${base} bg-[var(--bg-secondary)] text-[var(--text-muted)]`;
}

export function PipelineStepBar({
  activeStep,
  onStepChange,
  configuredSteps,
}: PipelineStepBarProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {STEPS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={getStepClassName(key, activeStep, configuredSteps)}
          onClick={() => onStepChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
