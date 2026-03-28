"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--brand)] text-[var(--brand-text)] hover:opacity-90",
  secondary:
    "bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
  link: "bg-transparent text-[var(--brand)] underline underline-offset-2 hover:opacity-80 p-0",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-[5px] text-[11px] rounded-[var(--radius-md)]",
  md: "px-4 py-2 text-[13px] rounded-[var(--radius-md)]",
  lg: "px-5 py-[10px] text-[14px] rounded-[var(--radius-md)]",
  icon: "w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 ${variantClasses[variant]} ${variant !== "link" ? sizeClasses[size] : ""} ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? null : children}
      </button>
    );
  },
);

Button.displayName = "Button";
