"use client";

import { CheckCircle, AlertCircle, HelpCircle } from "lucide-react";

/** Minimum confidence to display the "High confidence" badge */
const HIGH_CONFIDENCE_THRESHOLD = 0.85;
/** Minimum confidence to display the "Moderate" badge (below this → "Low") */
const MODERATE_CONFIDENCE_THRESHOLD = 0.65;

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-[10px] font-medium text-green-700">
        <CheckCircle className="w-3 h-3" />
        High confidence
      </span>
    );
  }
  if (confidence >= MODERATE_CONFIDENCE_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
        <AlertCircle className="w-3 h-3" />
        Moderate — verify
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-700">
      <HelpCircle className="w-3 h-3" />
      Low — try rephrasing
    </span>
  );
}
