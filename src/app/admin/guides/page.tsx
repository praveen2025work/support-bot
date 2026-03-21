"use client";

import Link from "next/link";

const guides = [
  {
    id: "user-guide",
    title: "User Guide",
    audience: "Viewers & Admins",
    description:
      "How to use the chatbot — running queries, semantic search, smart recommendations, anomaly alerts, filters, and the embedded widget.",
    color: "blue",
    category: "reference",
  },
  {
    id: "config-guide",
    title: "Configuration Guide",
    audience: "Developers & Admins",
    description:
      "How to configure groups, intents, entities, templates, filters, ML features (semantic search, recommendations, anomaly detection), and connect data sources.",
    color: "purple",
    category: "reference",
  },
  {
    id: "learning-guide",
    title: "Learning & ML Features",
    audience: "Admins & Tenant Teams",
    description:
      "How auto-learning, anomaly detection, review queues, and seasonal baselines work — plus a tenant team onboarding checklist.",
    color: "cyan",
    category: "reference",
  },
  {
    id: "windows-setup",
    title: "Windows Host Setup",
    audience: "Admins & DevOps",
    description:
      "Deploy on Windows Server — IIS reverse proxy (no managed code), NSSM services, SSL certificates, firewall rules.",
    color: "orange",
    category: "deployment",
  },
  {
    id: "linux-setup",
    title: "Linux / Unix Setup",
    audience: "Admins & DevOps",
    description:
      "Deploy on Linux — systemd services, Nginx reverse proxy, SSL with Let\u2019s Encrypt, firewall (ufw/firewalld).",
    color: "teal",
    category: "deployment",
  },
  {
    id: "docker-setup",
    title: "Docker Setup",
    audience: "Developers & DevOps",
    description:
      "Run with Docker Compose — Demo (mock data), Dev (real APIs), and Production environments. Includes SQL connector setup.",
    color: "indigo",
    category: "deployment",
  },
];

const colorMap: Record<
  string,
  { bg: string; border: string; badge: string; text: string }
> = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    text: "text-blue-700",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    text: "text-purple-700",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-700",
    text: "text-green-700",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    text: "text-red-700",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
    text: "text-orange-700",
  },
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-700",
    text: "text-teal-700",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700",
    text: "text-indigo-700",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    badge: "bg-cyan-100 text-cyan-700",
    text: "text-cyan-700",
  },
};

const referenceGuides = guides.filter((g) => g.category === "reference");
const deploymentGuides = guides.filter((g) => g.category === "deployment");

function GuideCard({ guide }: { guide: (typeof guides)[0] }) {
  const c = colorMap[guide.color];
  return (
    <Link
      href={`/admin/guides/${guide.id}`}
      className={`block rounded-lg border ${c.border} ${c.bg} p-5 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${c.text}`}>{guide.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{guide.description}</p>
        </div>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.badge} shrink-0 ml-4`}
        >
          {guide.audience}
        </span>
      </div>
    </Link>
  );
}

export default function GuidesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-xl font-bold"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Guides
        </h1>
        <p
          className="text-sm"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Documentation and setup instructions for the Bot Platform
        </p>
      </div>

      <div className="mb-6">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Reference Guides
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {referenceGuides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      </div>

      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Deployment Guides
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {deploymentGuides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      </div>
    </div>
  );
}
