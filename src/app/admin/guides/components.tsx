"use client";

import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Shared guide UI components                                         */
/*  Used by deployment guides (windows, linux, docker) and reference   */
/*  guides (learning). Uses HSL CSS variables for theme support.       */
/* ------------------------------------------------------------------ */

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-8">
      <h2
        className="text-base font-semibold mb-3 pb-2 border-b"
        style={{
          color: "hsl(var(--foreground))",
          borderColor: "hsl(var(--border))",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CmdBlock({
  label,
  children,
}: {
  label?: string;
  children: string;
}) {
  return (
    <div className="mb-3">
      {label && (
        <div
          className="text-[10px] font-medium mb-1"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {label}
        </div>
      )}
      <div className="bg-gray-900 rounded-lg p-3">
        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
          {children}
        </pre>
      </div>
    </div>
  );
}

export function Badge({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    teal: "bg-teal-100 text-teal-700",
    indigo: "bg-indigo-100 text-indigo-700",
    cyan: "bg-cyan-100 text-cyan-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}
    >
      {children}
    </span>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded text-xs font-mono"
      style={{
        backgroundColor: "hsl(var(--muted))",
        color: "hsl(var(--foreground))",
      }}
    >
      {children}
    </code>
  );
}

export function FileRef({ path }: { path: string }) {
  return (
    <span className="font-mono text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
      {path}
    </span>
  );
}

export function GuideHeader({
  title,
  description,
  badgeColor,
  badgeText,
}: {
  title: string;
  description: string;
  badgeColor: string;
  badgeText: string;
}) {
  return (
    <div className="mb-6">
      <Link
        href="/admin/guides"
        className="text-xs text-blue-600 hover:underline"
      >
        &larr; All Guides
      </Link>
      <h1
        className="text-xl font-bold mt-2"
        style={{ color: "hsl(var(--foreground))" }}
      >
        {title}
      </h1>
      <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
        {description}
      </p>
      <Badge color={badgeColor}>{badgeText}</Badge>
    </div>
  );
}

export function QuickNav({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5 mb-6 p-3 rounded-lg border"
      style={{
        backgroundColor: "hsl(var(--muted) / 0.3)",
        borderColor: "hsl(var(--border))",
      }}
    >
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() =>
            document
              .getElementById(s.id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor =
              "hsl(var(--primary) / 0.1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "hsl(var(--background))")
          }
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border p-6"
      style={{
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
      }}
    >
      {children}
    </div>
  );
}

export function InfoBox({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warning" | "tip" | "optional";
  title?: string;
  children: React.ReactNode;
}) {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
    },
    tip: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
    },
    optional: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-800",
    },
  };
  const s = styles[variant];
  return (
    <div
      className={`p-3 ${s.bg} border ${s.border} rounded-lg text-xs ${s.text} my-3`}
    >
      {title && <span className="font-semibold">{title}:</span>} {children}
    </div>
  );
}

export function TroubleshootItem({
  title,
  fix,
}: {
  title: string;
  fix: string;
}) {
  return (
    <div
      className="p-2.5 rounded-lg border"
      style={{
        backgroundColor: "hsl(var(--muted) / 0.3)",
        borderColor: "hsl(var(--border))",
      }}
    >
      <div
        className="text-xs font-semibold"
        style={{ color: "hsl(var(--foreground))" }}
      >
        {title}
      </div>
      <div
        className="text-xs mt-0.5"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {fix}
      </div>
    </div>
  );
}
