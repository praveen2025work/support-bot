"use client";

import Link from "next/link";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import {
  MessageSquare,
  LayoutDashboard,
  Table2,
  Shield,
  Brain,
  BarChart3,
  Filter,
  Users,
  Bell,
  Search,
  Database,
  FileText,
  Activity,
  Paintbrush,
  Globe,
  Lock,
  Zap,
  ArrowRight,
  ExternalLink,
  Share2,
  MessageCircle,
  AlertTriangle,
  Layers,
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
  href?: string;
}

function FeatureCard({
  icon,
  title,
  description,
  highlights,
  href,
}: FeatureCardProps) {
  return (
    <div
      className="rounded-xl border p-6 transition-all hover:shadow-lg"
      style={{
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: "hsl(var(--primary) / 0.1)",
            color: "hsl(var(--primary))",
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-semibold mb-1"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {title}
          </h3>
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {description}
          </p>
          <ul className="space-y-1">
            {highlights.map((h, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-xs"
                style={{ color: "hsl(var(--foreground) / 0.7)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "hsl(var(--primary))" }}
                />
                {h}
              </li>
            ))}
          </ul>
          {href && (
            <a
              href={href}
              className="inline-flex items-center gap-1 mt-3 text-xs font-medium transition-colors hover:underline"
              style={{ color: "hsl(var(--primary))" }}
            >
              Try it out <ArrowRight size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const features: FeatureCardProps[] = [
  {
    icon: <MessageSquare size={20} />,
    title: "AI-Powered Chat",
    description:
      "Natural language interface to query databases, get insights, and explore data without writing SQL.",
    highlights: [
      "Context-aware conversations with session memory",
      "Follow-up questions and drill-down analysis",
      "CSV file upload and inline data analysis",
      "Confidence scoring on every response",
      "Feedback collection (thumbs up/down)",
    ],
    href: "/",
  },
  {
    icon: <LayoutDashboard size={20} />,
    title: "Interactive Dashboard",
    description:
      "Customizable dashboard with pinned queries, favorites, real-time data cards, and advanced monitoring.",
    highlights: [
      "Pin frequently used queries as dashboard cards",
      "Compact Auto mode — tab toggle between table and chart views",
      "Drill-down sub-queries — click cell values to explore related data",
      "Auto-refresh with configurable intervals",
      "Chart and table visualization with 6+ chart types",
      "Card comments, notes, maximize, and duplicate",
      "Template gallery with pre-built dashboard layouts",
    ],
    href: "/dashboard",
  },
  {
    icon: <Table2 size={20} />,
    title: "Grid Board",
    description:
      "Spreadsheet-like data grid with inline editing, sorting, filtering, grouping, pivot tables, and advanced data tools.",
    highlights: [
      "Inline cell editing with change tracking and undo/redo",
      "Multi-column sort, filtering, and row grouping",
      "Pivot tables for cross-tabulation summaries",
      "Find & Replace across all cells",
      "Sparkline mini-charts in cells",
      "CSV/XLSX import and export",
      "Change history panel and validation indicators",
      "Keyboard shortcuts for power users",
    ],
    href: "/gridboard",
  },
  {
    icon: <Brain size={20} />,
    title: "Learning Engine & Client-Side ML",
    description:
      "Self-improving system with server-side learning and 16 client-side ML analysis features that run directly in the browser.",
    highlights: [
      "Co-occurrence and collaborative filtering models",
      "16 ML features: trends, outliers, clustering, regression, PCA, forecasting",
      "Correlation matrix, distribution analysis, and Pareto charts",
      "User clustering for personalized suggestions",
      "Signal aggregation with auto-promotion to NLP corpus",
      "Admin review queue for low-confidence classifications",
    ],
    href: "/admin/learning",
  },
  {
    icon: <Activity size={20} />,
    title: "Anomaly Detection",
    description:
      "Automated monitoring that detects unusual patterns in query results and data trends.",
    highlights: [
      "Baseline tracking per query and metric",
      "Snapshot comparison over time windows",
      "Anomaly badges on dashboard cards",
      "Configurable sensitivity thresholds",
    ],
    href: "/admin/anomaly",
  },
  {
    icon: <Filter size={20} />,
    title: "Dynamic Filters",
    description:
      "Server-driven filter system with date ranges, enums, and free-text parameters for every query.",
    highlights: [
      "Date range presets (Today, This Week, Last Month, etc.)",
      "Custom date pickers for flexible ranges",
      "Enum dropdowns populated from config",
      "Filter state persisted across sessions",
    ],
    href: "/admin/filters",
  },
  {
    icon: <Database size={20} />,
    title: "Multi-Database Connectors",
    description:
      "Connect to MSSQL, Oracle, and other databases through dedicated connector services.",
    highlights: [
      "MSSQL connector with connection pooling",
      "Oracle connector for enterprise databases",
      "Mock API for development and testing",
      "Configurable connection strings per environment",
    ],
    href: "/admin/connectors",
  },
  {
    icon: <Users size={20} />,
    title: "User & Group Management",
    description:
      "Role-based access control with user groups, permissions, and personalized preferences.",
    highlights: [
      "Admin, builder, and viewer roles",
      "Group-based query access scoping",
      "Per-user preference persistence",
      "Embeddable widget per group",
    ],
    href: "/admin/users",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Analytics & Insights",
    description:
      "Track usage patterns, popular queries, user engagement, and system performance.",
    highlights: [
      "Query frequency and popularity metrics",
      "User interaction tracking",
      "Response time monitoring",
      "Exportable analytics data",
    ],
    href: "/admin/analytics",
  },
  {
    icon: <Shield size={20} />,
    title: "Audit Trail",
    description:
      "Complete audit logging of all actions for compliance, debugging, and accountability.",
    highlights: [
      "Timestamped action logs",
      "User attribution on every event",
      "Filterable and searchable log viewer",
      "JSON-lines storage for easy processing",
    ],
    href: "/admin/audit",
  },
  {
    icon: <FileText size={20} />,
    title: "Intent & Template System",
    description:
      "NLP-driven intent recognition with configurable response templates for consistent answers.",
    highlights: [
      "Intent detection with confidence scoring",
      "Editable response templates per intent",
      "Follow-up suggestion generation",
      "Query parameter extraction from natural language",
    ],
    href: "/admin/intents",
  },
  {
    icon: <Paintbrush size={20} />,
    title: "Theming & Customization",
    description:
      "Light and dark mode with a comprehensive design token system for full visual customization.",
    highlights: [
      "One-click light/dark toggle",
      "HSL-based CSS custom properties",
      "Consistent design across all pages",
      "System preference detection",
    ],
  },
  {
    icon: <Bell size={20} />,
    title: "Scheduled Reports",
    description:
      "Automated query execution and email delivery on cron schedules for proactive monitoring.",
    highlights: [
      "Cron-based scheduling with flexible expressions",
      "Email delivery to multiple recipients",
      "Admin management interface with enable/disable",
      "Per-dashboard schedule configuration",
    ],
    href: "/admin/schedules",
  },
  {
    icon: <Search size={20} />,
    title: "Test Console",
    description:
      "Developer-friendly testing interface to try queries, inspect NLP parsing, and debug responses.",
    highlights: [
      "Raw query testing with parameter inspection",
      "NLP parse result visualization",
      "Response metadata display",
      "Quick iteration on query configurations",
    ],
    href: "/admin/test-console",
  },
  {
    icon: <Globe size={20} />,
    title: "Embeddable Widget",
    description:
      "Drop-in chat widget that can be embedded in any web application via a simple script tag.",
    highlights: [
      "Configurable per group",
      "Embed code generation in admin panel",
      "Floating chat bubble UI",
      "Full feature parity with main chat",
    ],
  },
  {
    icon: <ExternalLink size={20} />,
    title: "Action Panel",
    description:
      "Integrate external applications directly into the dashboard via a resizable iframe side panel.",
    highlights: [
      "Load any external app (React, Angular, Vue, vanilla JS) in an iframe",
      "Context passing via postMessage with versioned protocol",
      "Drag-to-resize panel width with persistence",
      "Bidirectional communication — external app can trigger card refreshes",
    ],
    href: "/dashboard",
  },
  {
    icon: <Share2 size={20} />,
    title: "Dashboard Sharing & Templates",
    description:
      "Share dashboards with read-only links and create new ones from pre-built templates.",
    highlights: [
      "Generate shareable read-only links",
      "Template gallery with industry-specific layouts",
      "Multi-tab dashboard management",
      "Dashboard duplication and cloning",
    ],
    href: "/dashboard",
  },
  {
    icon: <MessageCircle size={20} />,
    title: "Collaboration & Comments",
    description:
      "Add threaded comments to dashboard cards for team collaboration and knowledge sharing.",
    highlights: [
      "Per-card comment threads",
      "Timestamped and user-attributed messages",
      "Sticky notes for card-level annotations",
      "Comment count badges on cards",
    ],
    href: "/dashboard",
  },
  {
    icon: <AlertTriangle size={20} />,
    title: "Alert Monitoring",
    description:
      "Set threshold-based alerts on card metrics with configurable severity levels.",
    highlights: [
      "Column-level threshold conditions",
      "Info, warning, and critical severity levels",
      "Visual alert badges on card headers",
      "Works alongside anomaly detection",
    ],
    href: "/dashboard",
  },
  {
    icon: <Layers size={20} />,
    title: "Drill-Down Sub-Queries",
    description:
      "Click cell values to explore related data with pre-configured drill-down queries.",
    highlights: [
      "Click-through navigation from summary to detail",
      "Auto-filter target query with selected value",
      "Nested drill-down chains for deep exploration",
      "Configurable per query in admin panel",
    ],
    href: "/dashboard",
  },
  {
    icon: <Lock size={20} />,
    title: "Enterprise Ready",
    description:
      "Built for production with session management, environment configuration, and deployment guides.",
    highlights: [
      "Session management with persistence",
      "Environment-based configuration",
      "Docker support",
      "Production deployment guides",
      "Windows, Mac, and Linux compatibility",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <ContextualTopBar title="Features" />

      <main className="flex-1 overflow-auto">
        {/* Hero Section */}
        <div className="px-6 py-12 text-center max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{
              backgroundColor: "hsl(var(--primary) / 0.1)",
              color: "hsl(var(--primary))",
            }}
          >
            <Zap size={12} />
            Platform Capabilities
          </div>
          <h1
            className="text-3xl font-bold mb-3"
            style={{ color: "hsl(var(--foreground))" }}
          >
            MITR AI Features
          </h1>
          <p
            className="text-base max-w-2xl mx-auto"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            A comprehensive AI-powered data analytics platform with natural
            language querying, interactive dashboards, self-learning
            capabilities, and enterprise-grade security.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="px-6 pb-12 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>

        {/* Quick Start CTA */}
        <div
          className="border-t px-6 py-8 text-center"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Ready to explore?
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Start with a conversation or dive into the admin panel to configure
            your setup.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              Start Chatting
            </Link>
            <a
              href="/admin"
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
            >
              Open Admin Panel
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
