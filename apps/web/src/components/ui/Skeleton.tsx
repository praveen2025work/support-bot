"use client";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  const radiusMap = {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    full: "var(--radius-full)",
  };
  return (
    <div
      className={`animate-pulse bg-[var(--bg-tertiary)] ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius: radiusMap[rounded],
      }}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--bg-primary)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] ${className}`}
    >
      <Skeleton height={14} width="60%" className="mb-3" />
      <Skeleton height={10} width="40%" className="mb-4" />
      <Skeleton height={80} />
    </div>
  );
}
