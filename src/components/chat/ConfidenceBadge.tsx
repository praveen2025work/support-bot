'use client';

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence >= 0.85) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-[10px] font-medium text-green-700">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        High confidence
      </span>
    );
  }
  if (confidence >= 0.65) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Moderate — verify
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-700">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Low — try rephrasing
    </span>
  );
}
