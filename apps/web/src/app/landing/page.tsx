"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  BarChart3,
  Shield,
  Zap,
  DollarSign,
  Users,
  Database,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Brain,
  Clock,
  Lock,
  Layers,
  AlertTriangle,
  Search,
} from "lucide-react";

/* ────────────────────────── data ────────────────────────── */

interface CostRow {
  label: string;
  powerbi: string;
  tableau: string;
  mitr: string;
}

const COST_TABLE: readonly CostRow[] = [
  {
    label: "Per-user license (monthly)",
    powerbi: "$10 – $20",
    tableau: "$35 – $75",
    mitr: "$0",
  },
  {
    label: "50-user annual cost",
    powerbi: "$6,000 – $12,000",
    tableau: "$21,000 – $45,000",
    mitr: "$0",
  },
  {
    label: "Training & onboarding",
    powerbi: "Weeks of training",
    tableau: "Weeks of training",
    mitr: "Minutes — just type",
  },
  {
    label: "Report creation time",
    powerbi: "Hours per report",
    tableau: "Hours per report",
    mitr: "Seconds — ask a question",
  },
  {
    label: "IT dependency",
    powerbi: "High — DAX, data models",
    tableau: "High — calculated fields",
    mitr: "None — self-service NLP",
  },
];

interface Feature {
  icon: React.ElementType;
  title: string;
  desc: string;
}

const FEATURES: readonly Feature[] = [
  {
    icon: MessageSquare,
    title: "Natural Language Queries",
    desc: 'Ask questions in plain English — no SQL, no DAX, no formulas. "Show me revenue by region for Q1" just works.',
  },
  {
    icon: Zap,
    title: "Instant Answers",
    desc: "Get charts, tables, and KPI stats in seconds. No waiting for report builds or dashboard refreshes.",
  },
  {
    icon: Brain,
    title: "AI-Powered Learning",
    desc: "The system learns from every interaction. Anomaly detection, smart suggestions, and follow-up chains get smarter over time.",
  },
  {
    icon: Database,
    title: "Connect Any Data Source",
    desc: "MSSQL, Oracle, REST APIs, CSV/XLSX — plug in your existing databases without migration or ETL pipelines.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Windows Auth, role-based access, full audit trails, and IP whitelisting. Your data never leaves your infrastructure.",
  },
  {
    icon: Layers,
    title: "Multiple Surfaces",
    desc: "Chat, dashboards, gridboard (spreadsheet), data explorer, and embeddable widgets — one platform, every workflow.",
  },
];

interface PainPoint {
  icon: React.ElementType;
  problem: string;
  solution: string;
}

const PAIN_POINTS: readonly PainPoint[] = [
  {
    icon: DollarSign,
    problem: "Licensing costs scale with every user",
    solution:
      "Zero per-seat licensing — deploy to your entire org at a fixed infrastructure cost.",
  },
  {
    icon: Clock,
    problem: "Weeks to build a single dashboard",
    solution:
      "Ask a question, get a visualization. New insights in seconds, not sprints.",
  },
  {
    icon: Users,
    problem: "Only trained analysts can create reports",
    solution:
      "Anyone who can type a question can get data. True self-service analytics.",
  },
  {
    icon: AlertTriangle,
    problem: "Stale reports — data is always from yesterday",
    solution:
      "Live queries against your databases. Always real-time, always current.",
  },
  {
    icon: Lock,
    problem: "Data sent to third-party cloud services",
    solution:
      "Runs on your infrastructure. Your data stays inside your network perimeter.",
  },
  {
    icon: Search,
    problem: "Finding the right report is harder than building one",
    solution:
      "Query catalog with semantic search — find any metric in seconds.",
  },
];

interface FaqItem {
  q: string;
  a: string;
}

const FAQ: readonly FaqItem[] = [
  {
    q: "Does MITR AI replace our existing database?",
    a: "No. MITR AI connects to your existing databases (MSSQL, Oracle, etc.) and queries them in real-time. There is no data migration or duplication.",
  },
  {
    q: "How long does setup take?",
    a: "A basic deployment connects to your first data source in under an hour. The admin panel lets you configure groups, users, and queries through a guided onboarding flow.",
  },
  {
    q: "Can non-technical users really use this?",
    a: "Yes. The entire interface is conversational. Users type questions like they would ask a colleague. The NLP engine handles intent recognition, entity extraction, and query mapping automatically.",
  },
  {
    q: "What about complex analytics Power BI handles?",
    a: "MITR AI supports scheduled queries, anomaly detection, drill-down analysis, pinned KPI dashboards, and workflow automation. For the 90% of daily queries your team runs, MITR AI is faster and easier.",
  },
  {
    q: "Is this secure enough for regulated industries?",
    a: "MITR AI runs entirely on your infrastructure with Windows Auth, role-based access control, full audit logging, and IP whitelisting. No data leaves your network.",
  },
];

/* ────────────────────────── shared styles ────────────────────────── */

/** Solid card — opaque bg, proper contrast in both themes */
const CARD =
  "rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-[var(--shadow-sm)]";

/** Alternating section bg */
const SECTION_ALT = "bg-[var(--bg-secondary)]";

/* ────────────────────────── components ────────────────────────── */

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            MITR AI
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[var(--text-secondary)]">
          <a
            href="#features"
            className="hover:text-[var(--brand)] transition-colors"
          >
            Features
          </a>
          <a
            href="#comparison"
            className="hover:text-[var(--brand)] transition-colors"
          >
            Comparison
          </a>
          <a
            href="#why"
            className="hover:text-[var(--brand)] transition-colors"
          >
            Why MITR AI
          </a>
          <a
            href="#faq"
            className="hover:text-[var(--brand)] transition-colors"
          >
            FAQ
          </a>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-[var(--brand)] text-white text-sm font-medium hover:bg-[var(--brand-hover)] transition-colors"
        >
          Open App
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] text-xs font-medium mb-6">
          <Zap className="w-3.5 h-3.5" />
          Zero license fees. Instant insights. Your data stays yours.
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6 text-[var(--text-primary)]">
          Ask Your Data a Question.
          <br />
          <span className="text-[var(--brand)]">Get the Answer Instantly.</span>
        </h1>
        <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
          MITR AI is a conversational analytics platform that replaces expensive
          BI tools like Power BI and Tableau. No per-seat licenses. No training
          required. No data leaving your network.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg bg-[var(--brand)] text-white font-medium hover:bg-[var(--brand-hover)] transition-colors flex items-center gap-2"
          >
            Try It Now <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#comparison"
            className="px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            See Cost Comparison
          </a>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: "$0", label: "Per-user license cost" },
    { value: "<5s", label: "Average query response" },
    { value: "90%", label: "Less training needed" },
    { value: "100%", label: "On-premise data control" },
  ];

  return (
    <section className="py-12 border-y border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold text-[var(--brand)]">
              {s.value}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-[var(--text-primary)]">
            Everything Your Team Needs
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            A complete analytics platform that anyone can use — no specialized
            training, no complex report builders.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`${CARD} p-6 hover:shadow-[var(--shadow-md)] transition-shadow`}
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--brand-subtle)] flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <h3 className="font-semibold mb-2 text-[var(--text-primary)]">
                {f.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CostComparison() {
  return (
    <section id="comparison" className={`py-20 px-6 ${SECTION_ALT}`}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-[var(--text-primary)]">
            Cost Comparison: The Numbers Speak
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            See how MITR AI eliminates licensing costs while delivering faster
            results with zero training overhead.
          </p>
        </div>

        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] text-left text-sm">
                  <th className="p-4 font-semibold text-[var(--text-primary)]">
                    Metric
                  </th>
                  <th className="p-4 font-semibold text-[var(--text-primary)]">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[var(--text-secondary)]" />
                      Power BI
                    </span>
                  </th>
                  <th className="p-4 font-semibold text-[var(--text-primary)]">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
                      Tableau
                    </span>
                  </th>
                  <th className="p-4 font-semibold text-[var(--brand)]">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      MITR AI
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COST_TABLE.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-t border-[var(--border)] ${
                      i % 2 === 0
                        ? "bg-[var(--bg-primary)]"
                        : "bg-[var(--bg-secondary)]"
                    }`}
                  >
                    <td className="p-4 text-sm font-medium text-[var(--text-primary)]">
                      {row.label}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-secondary)]">
                      {row.powerbi}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-secondary)]">
                      {row.tableau}
                    </td>
                    <td className="p-4 text-sm font-semibold text-[var(--success)]">
                      {row.mitr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className={`mt-10 ${CARD} p-6 border-l-4 !border-l-[var(--brand)]`}
        >
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-[var(--brand)] mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold mb-1 text-[var(--text-primary)]">
                Bottom Line for Leadership
              </h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                A 50-person team using Tableau Creator costs{" "}
                <strong className="text-[var(--text-primary)]">
                  $45,000/year
                </strong>{" "}
                in licensing alone — before training, IT support, and
                report-building time. MITR AI runs on your existing
                infrastructure with{" "}
                <strong className="text-[var(--text-primary)]">
                  zero per-seat cost
                </strong>
                , saving your organization tens of thousands annually while
                making data accessible to everyone, not just trained analysts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyNotBI() {
  return (
    <section id="why" className="py-20 px-6 bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-[var(--text-primary)]">
            Why Not Just Use Power BI or Tableau?
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            Traditional BI tools were built for analysts. MITR AI was built for
            your entire team.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PAIN_POINTS.map((p) => (
            <div key={p.problem} className={`${CARD} p-6`}>
              <div className="w-8 h-8 rounded-full bg-[var(--danger-subtle)] flex items-center justify-center mb-3">
                <p.icon className="w-4 h-4 text-[var(--danger)]" />
              </div>
              <p className="text-sm font-medium text-[var(--danger)] mb-3">
                {p.problem}
              </p>
              <div className="flex items-start gap-2 pt-3 border-t border-[var(--border)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  {p.solution}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className={`py-20 px-6 ${SECTION_ALT}`}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-[var(--text-primary)]">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className={`${CARD} overflow-hidden`}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <span className="font-medium text-sm pr-4 text-[var(--text-primary)]">
                    {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="py-20 px-6 bg-[var(--bg-primary)]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4 text-[var(--text-primary)]">
          Ready to Cut BI Costs and Empower Your Team?
        </h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
          Give every team member instant access to data — no licenses, no
          training, no waiting for the analytics team.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--brand)] text-white font-medium hover:bg-[var(--brand-hover)] transition-colors"
        >
          Launch MITR AI <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-[var(--border)] bg-[var(--bg-primary)] text-center text-xs text-[var(--text-muted)]">
      &copy; {new Date().getFullYear()} MITR AI. Built for teams that move fast.
    </footer>
  );
}

/* ────────────────────────── page ────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <CostComparison />
      <WhyNotBI />
      <FaqSection />
      <CtaBanner />
      <Footer />
    </>
  );
}
