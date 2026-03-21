"use client";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
}

export function Tooltip({
  label,
  children,
  position = "bottom",
}: TooltipProps) {
  return (
    <div className="relative group/tip">
      {children}
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-[60] whitespace-nowrap rounded bg-gray-900 dark:bg-gray-100 px-2 py-1 text-[10px] font-medium text-white dark:text-gray-900 opacity-0 transition-opacity group-hover/tip:opacity-100 ${
          position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
