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
  },
  {
    id: "demo-setup",
    title: "Demo Setup Guide",
    audience: "Developers",
    description:
      "Steps to run all 3 services locally (UI, Engine, Mock API) with ML features (semantic search, recommendations, anomaly detection) for demo and development.",
    color: "green",
  },
  {
    id: "prod-deploy",
    title: "Production Deployment",
    audience: "Admins & DevOps",
    description:
      "Deploy UI + Engine for production — Docker, PM2, Nginx, tenant API auth configuration.",
    color: "red",
  },
  {
    id: "config-guide",
    title: "Configuration Guide",
    audience: "Developers & Admins",
    description:
      "How to configure groups, intents, entities, templates, filters, ML features (semantic search, recommendations, anomaly detection), and connect data sources.",
    color: "purple",
  },
  {
    id: "windows-setup",
    title: "Windows Host Setup",
    audience: "Admins & DevOps",
    description:
      "Deploy on Windows Server — IIS reverse proxy, PM2/NSSM, SSL certificates, firewall rules.",
    color: "orange",
  },
  {
    id: "setup-guide",
    title: "Storybook & Dev Tools",
    audience: "Developers",
    description:
      "Component documentation with Storybook, bundle analysis, esbuild backend bundler, and performance tools.",
    color: "blue",
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
};

export default function GuidesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Guides</h1>
        <p className="text-sm text-gray-500">
          Documentation and setup instructions for the Bot Platform
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {guides.map((guide) => {
          const c = colorMap[guide.color];
          return (
            <Link
              key={guide.id}
              href={`/admin/guides/${guide.id}`}
              className={`block rounded-lg border ${c.border} ${c.bg} p-5 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${c.text}`}>
                    {guide.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {guide.description}
                  </p>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.badge} shrink-0 ml-4`}
                >
                  {guide.audience}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
