"use client";

import { useState } from "react";

interface ValidationIndicatorProps {
  errors: string[];
}

export function ValidationIndicator({ errors }: ValidationIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (errors.length === 0) return null;

  return (
    <div
      className="absolute top-0 right-0 w-0 h-0"
      style={{
        borderLeft: "6px solid transparent",
        borderTop: "6px solid #ef4444",
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showTooltip && (
        <div className="absolute top-2 right-0 z-50 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-[200px]">
          {errors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}
    </div>
  );
}
