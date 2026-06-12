"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, type ReactNode } from "react";
import {
  MessageSquare,
  Compass,
  LayoutDashboard,
  Table2,
  Eye,
  Shield,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────
   Small primitives — kept inline so the guide is a single self-
   contained page that other admin sub-routes can mirror.
   ──────────────────────────────────────────────────────────────────── */

function Cmd({ children }: { children: ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-[var(--brand-subtle)] text-[var(--brand)] rounded font-mono text-[11px]">
      {children}
    </code>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[10.5px] font-mono text-[var(--text-secondary)]">
      {children}
    </kbd>
  );
}

function Term({ children }: { children: ReactNode }) {
  return (
    <span className="font-display font-semibold text-[var(--text-primary)]">
      {children}
    </span>
  );
}

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-4 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-xs)]">
      <Image
        src={src}
        alt={alt}
        width={1280}
        height={800}
        className="w-full h-auto"
        unoptimized
      />
      <figcaption className="px-3 py-1.5 text-[10.5px] text-[var(--text-muted)] italic border-t border-[var(--border-subtle)]">
        {alt}
      </figcaption>
    </figure>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 px-3.5 py-2.5 bg-[var(--brand-subtle)] border-l-[3px] border-[var(--brand)] rounded-r-[var(--radius-md)] text-[12.5px] text-[var(--text-primary)] leading-relaxed">
      <span className="eyebrow !text-[var(--brand)] !text-[9.5px] mr-2">
        Tip
      </span>
      {children}
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-1.5">
      <span
        className="w-5 h-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
        style={{ background: "var(--brand-gradient)" }}
      >
        {n}
      </span>
      <span className="text-[13px] text-[var(--text-secondary)] leading-relaxed pt-0.5 min-w-0">
        {children}
      </span>
    </li>
  );
}

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}

function Section({ id, eyebrow, title, intro, children }: SectionProps) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="font-display text-[22px] font-bold tracking-tight text-[var(--text-primary)] mt-0.5 mb-2 leading-tight">
        {title}
      </h2>
      {intro && (
        <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed mb-4 max-w-3xl">
          {intro}
        </p>
      )}
      {children}
    </section>
  );
}

interface UseCaseProps {
  title: string;
  audience: string;
  children: ReactNode;
}

function UseCase({ title, audience, children }: UseCaseProps) {
  return (
    <div className="surface p-5 mb-3">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="font-display text-[15px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          {title}
        </h3>
        <span className="chip chip-brand !py-0.5 !px-2 !text-[10px]">
          {audience}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Categorised navigation. Each entry groups related use cases.
   ──────────────────────────────────────────────────────────────────── */

interface CategoryDef {
  id: string;
  label: string;
  blurb: string;
  icon: typeof MessageSquare;
  tone: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "ask",
    label: "Ask",
    blurb: "Conversational queries, follow-ups, suggestions.",
    icon: MessageSquare,
    tone: "var(--brand)",
  },
  {
    id: "explore",
    label: "Explore",
    blurb: "Schema, distincts, charts, raw rows.",
    icon: Compass,
    tone: "var(--accent)",
  },
  {
    id: "build",
    label: "Build dashboards",
    blurb: "Pin KPIs, arrange cards, share views.",
    icon: LayoutDashboard,
    tone: "var(--success)",
  },
  {
    id: "shape",
    label: "Shape data",
    blurb: "Edit grids, pivot, formulas, save views.",
    icon: Table2,
    tone: "#a78bfa",
  },
  {
    id: "watch",
    label: "Watch",
    blurb: "Rules, alerts, anomaly detection.",
    icon: Eye,
    tone: "#ec4899",
  },
  {
    id: "admin",
    label: "Administer",
    blurb: "Groups, connectors, intents, learning.",
    icon: Shield,
    tone: "var(--text-muted)",
  },
];

/* ────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────── */

export default function UserGuidePage() {
  const [query, setQuery] = useState("");

  // Catalog of named use-cases keyed by category. Surfaces a glossary
  // entry the search box can match against.
  const USE_CASES = useMemo(
    () =>
      [
        // Ask
        {
          cat: "ask",
          title: "Run a saved query",
          terms: ["run", "execute", "list queries", "query"],
        },
        {
          cat: "ask",
          title: "Filter results conversationally",
          terms: ["filter", "where", "for"],
        },
        {
          cat: "ask",
          title: "Follow up on a result",
          terms: ["follow up", "drill", "sort", "top", "summarize"],
        },
        {
          cat: "ask",
          title: "Pin a result to dashboard",
          terms: ["pin", "favorite", "dashboard"],
        },
        // Explore
        {
          cat: "explore",
          title: "Pick a data source",
          terms: ["source", "csv", "xlsx", "api", "data explorer"],
        },
        {
          cat: "explore",
          title: "Read the schema",
          terms: ["schema", "columns", "types", "distinct"],
        },
        {
          cat: "explore",
          title: "Use Quick Synthesis Actions",
          terms: ["forecast", "anomaly", "summary", "ai", "synthesis"],
        },
        // Build
        {
          cat: "build",
          title: "Create a dashboard",
          terms: ["create", "dashboard", "new", "blank"],
        },
        {
          cat: "build",
          title: "Add a card",
          terms: ["add card", "kpi", "chart"],
        },
        {
          cat: "build",
          title: "Switch Simple ⇄ Interactive",
          terms: ["simple", "interactive", "lock", "mode"],
        },
        {
          cat: "build",
          title: "Share or present",
          terms: ["share", "present", "snapshot", "url"],
        },
        // Shape
        {
          cat: "shape",
          title: "Load a query into the grid",
          terms: ["grid", "gridboard", "load data"],
        },
        {
          cat: "shape",
          title: "Group, pivot, aggregate",
          terms: ["group by", "pivot", "aggregate", "sum"],
        },
        {
          cat: "shape",
          title: "Save a view",
          terms: ["view", "save view", "filters", "snapshot"],
        },
        {
          cat: "shape",
          title: "Export CSV / XLSX",
          terms: ["export", "csv", "xlsx", "download"],
        },
        // Watch
        {
          cat: "watch",
          title: "Create a watch rule",
          terms: ["watch", "rule", "alert", "threshold"],
        },
        {
          cat: "watch",
          title: "Read recent alerts",
          terms: ["alerts", "notifications", "bell"],
        },
        {
          cat: "watch",
          title: "Triage anomalies",
          terms: ["anomaly", "outlier", "z-score"],
        },
        // Admin
        {
          cat: "admin",
          title: "Manage groups",
          terms: ["group", "tenant", "embed"],
        },
        {
          cat: "admin",
          title: "Connect a data source",
          terms: ["connector", "csv", "mssql", "oracle", "api"],
        },
        {
          cat: "admin",
          title: "Train the NLP",
          terms: ["intent", "learning", "synonyms", "templates"],
        },
        {
          cat: "admin",
          title: "Review audit + logs",
          terms: ["audit", "logs", "analytics", "telemetry"],
        },
      ] as const,
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return USE_CASES.filter(
      (u) =>
        u.title.toLowerCase().includes(q) || u.terms.some((t) => t.includes(q)),
    );
  }, [query, USE_CASES]);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <header className="mb-6">
        <Link
          href="/admin/guides"
          className="text-[11.5px] text-[var(--brand)] hover:underline inline-flex items-center gap-1"
        >
          ← All Guides
        </Link>
        <span className="eyebrow mt-3 inline-block">Reference manual</span>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-[var(--text-primary)] leading-tight mt-1">
          User Guide
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mt-1 max-w-3xl">
          Pick the goal you have in mind. Each section explains the{" "}
          <Term>terminology</Term>, shows the relevant <Term>UI surface</Term>,
          and walks you through the steps to configure dashboards, find queries,
          and turn raw data into decisions.
        </p>
      </header>

      {/* Use-case search */}
      <div className="surface p-4 mb-6">
        <label className="block">
          <span className="eyebrow !text-[10px]">Find a use case</span>
          <div className="relative mt-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. forecast, pivot, watch alert…"
              className="w-full pl-10 pr-4 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-subtle)] transition-all"
            />
          </div>
        </label>
        {filtered && (
          <div className="mt-3">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)]">
                No use case matches &ldquo;{query}&rdquo;. Try a broader term
                like <Cmd>chart</Cmd> or <Cmd>filter</Cmd>.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {filtered.map((u) => (
                  <li key={u.title}>
                    <a
                      href={`#${u.cat}`}
                      className="chip inline-flex items-center gap-1 !text-[11px] hover:chip-brand"
                    >
                      <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                      {u.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Category quick-jump */}
      <nav
        aria-label="Categories"
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8"
      >
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="group relative flex items-start gap-3 p-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] opacity-80"
                style={{ backgroundColor: c.tone }}
              />
              <span
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${c.tone} 14%, transparent)`,
                  color: c.tone,
                }}
              >
                <Icon className="w-4 h-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <div className="font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                  {c.label}
                </div>
                <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5 leading-snug">
                  {c.blurb}
                </p>
              </div>
            </a>
          );
        })}
      </nav>

      {/* ============================================================ */}
      {/*  Glossary                                                    */}
      {/* ============================================================ */}
      <Section
        id="glossary"
        eyebrow="Terminology"
        title="Learn the vocabulary"
        intro={
          <>
            The UI uses precise terms. Knowing them makes the rest of this guide
            — and every error message — much easier to parse.
          </>
        }
      >
        <dl className="grid sm:grid-cols-2 gap-3">
          {[
            {
              term: "Query",
              def: "A named data fetch defined by an admin. Backed by an API endpoint, CSV/XLSX file, or SQL connector. Run by typing run <name> in chat.",
            },
            {
              term: "Source",
              def: "The underlying file or endpoint a query reads from. Shown in Data Explorer as a card.",
            },
            {
              term: "Group",
              def: "A workspace tenant (e.g. finance, hr_team). Queries, intents, and dashboards are scoped to a group.",
            },
            {
              term: "Dashboard",
              def: "A grid layout of KPI cards and chart cards backed by queries. Owned per-user; shareable.",
            },
            {
              term: "Grid Board",
              def: "A spreadsheet-style live view of a query — pivot, group, edit cells, save views.",
            },
            {
              term: "Watch rule",
              def: "A scheduled check (threshold, freshness, trend, anomaly) that emits alerts to the bell.",
            },
            {
              term: "Intent",
              def: "The classified meaning of a user utterance — query.execute, knowledge.search, etc.",
            },
            {
              term: "Insight",
              def: "Auto-generated narrative line (✨ Engineering has the highest salary…) computed from result data.",
            },
            {
              term: "Simple mode",
              def: "Read-only dashboard view that locks edits. Switch back to Interactive in the top bar.",
            },
            {
              term: "Context rail",
              def: "The right-side panel in Chat showing Active Dataset, Top Performer, and Quick Synthesis Actions for the loaded result.",
            },
          ].map((g) => (
            <div
              key={g.term}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 px-3.5 py-2.5"
            >
              <dt className="font-display text-[13px] font-bold text-[var(--text-primary)] tracking-tight">
                {g.term}
              </dt>
              <dd className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                {g.def}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ============================================================ */}
      {/*  Ask                                                         */}
      {/* ============================================================ */}
      <Section
        id="ask"
        eyebrow="Category · Ask"
        title="Ask your data in chat"
        intro={
          <>
            Chat is the fastest path from question to answer. Type plain
            English; the engine resolves it to a query, executes it, and renders
            a structured response. No SQL required.
          </>
        }
      >
        <Shot
          src="/images/guide/chat-landing.png"
          alt="Chat welcome — Quick Actions + Suggested for You + Available Queries"
        />

        <UseCase title="Run a saved query" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              Open <Term>Chat</Term> from the left sidebar.
            </Step>
            <Step n={2}>
              Type <Cmd>list queries</Cmd> to see every query available in your
              group, sorted alphabetically and grouped by category.
            </Step>
            <Step n={3}>
              Click any name, or type <Cmd>run monthly_revenue</Cmd> to execute
              directly.
            </Step>
          </ol>
          <Tip>
            The <Term>Available Queries</Term> drawer also accepts a filter box
            — type a partial name to narrow the list.
          </Tip>
        </UseCase>

        <UseCase title="Filter results conversationally" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              After running a query, the result appears in the right panel. Tell
              chat what to narrow: <Cmd>for region = EMEA</Cmd> or{" "}
              <Cmd>where status is open</Cmd>.
            </Step>
            <Step n={2}>
              Active filters show as removable chips above the table.
            </Step>
            <Step n={3}>
              Stack multiple constraints conversationally — each turn adds to
              the prior filter set.
            </Step>
          </ol>
          <Shot
            src="/images/guide/chat-filters.png"
            alt="Filter chips applied after a conversational refinement"
          />
        </UseCase>

        <UseCase title="Follow up on a result" audience="Viewer">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-2">
            The engine remembers the last result and answers follow-ups against
            it. Try any of:
          </p>
          <ul className="space-y-1.5 text-[12.5px] text-[var(--text-secondary)] list-disc pl-5">
            <li>
              <Cmd>top 5</Cmd> · <Cmd>bottom 3</Cmd>
            </li>
            <li>
              <Cmd>group by region</Cmd>
            </li>
            <li>
              <Cmd>sort by revenue desc</Cmd>
            </li>
            <li>
              <Cmd>summarize</Cmd>
            </li>
          </ul>
          <Shot
            src="/images/guide/chat-followup-chain.png"
            alt="Follow-up chain — original query, filter, group by, summary"
          />
        </UseCase>

        <UseCase title="Pin a result to your dashboard" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              Hover over a result in the right panel; click the <Term>Pin</Term>{" "}
              icon.
            </Step>
            <Step n={2}>
              The query appears in the <Term>Pinned</Term> card on the data
              panel and on your Dashboard&apos;s favorites strip.
            </Step>
            <Step n={3}>
              From Pinned, click the query name to re-run it in chat, or jump to
              Dashboard to size it as a card.
            </Step>
          </ol>
        </UseCase>
      </Section>

      {/* ============================================================ */}
      {/*  Explore                                                     */}
      {/* ============================================================ */}
      <Section
        id="explore"
        eyebrow="Category · Explore"
        title="Explore data sources visually"
        intro={
          <>
            Data Explorer is for browsing without typing — pick a source, scan
            its schema, build charts and tables right in place.
          </>
        }
      >
        <Shot
          src="/images/guide/data-explorer-overview.png"
          alt="Data Explorer — synthesis hero + 8 dataset cards"
        />

        <UseCase title="Pick a data source" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              Open <Term>Data Explorer</Term> from the sidebar.
            </Step>
            <Step n={2}>
              Browse the <Term>Choose a source</Term> grid. Cards show source
              type (CSV / API / XLSX), description, and a <Term>Recent</Term>{" "}
              chip if you&apos;ve used it before.
            </Step>
            <Step n={3}>
              Click a card to load its schema, sample data, and auto-generated
              cards.
            </Step>
          </ol>
        </UseCase>

        <UseCase title="Read the schema" audience="Viewer">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-2">
            Once a source is loaded, the header strip shows <Term>N cards</Term>{" "}
            · <Term>columns × rows</Term> · <Term>last saved</Term> + an inline{" "}
            <Term>insights summary pill</Term>. Click the pill to see the full
            insights list in one panel below.
          </p>
          <Tip>
            Numeric columns become KPI cards automatically. String columns with
            low cardinality become filter dropdowns. Date columns enable the
            Forecast action.
          </Tip>
        </UseCase>

        <UseCase title="Use Quick Synthesis Actions" audience="Viewer">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-2">
            Run a query in Chat — the right-side <Term>Context rail</Term> shows
            three actions:
          </p>
          <ul className="space-y-1.5 text-[12.5px] text-[var(--text-secondary)] list-disc pl-5">
            <li>
              <Term>Forecast next 3 periods</Term> — needs a date + numeric
              column.
            </li>
            <li>
              <Term>Detect anomalies</Term> — needs a numeric column.
            </li>
            <li>
              <Term>Generate summary</Term> — always available.
            </li>
          </ul>
          <Tip>
            If an action is greyed out, the rail explains which column type is
            missing. Pick a different source if you need that capability.
          </Tip>
        </UseCase>
      </Section>

      {/* ============================================================ */}
      {/*  Build dashboards                                            */}
      {/* ============================================================ */}
      <Section
        id="build"
        eyebrow="Category · Build dashboards"
        title="Build dashboards that update themselves"
        intro={
          <>
            A dashboard is a saved arrangement of KPI tiles and chart cards
            backed by queries. Once built, every card refreshes on its own; you
            don&apos;t need to re-run them.
          </>
        }
      >
        <Shot
          src="/images/guide/dashboard-overview.png"
          alt="Dashboard — KPI strip, charts, market breakdown"
        />

        <UseCase title="Create a new dashboard" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              Open <Term>Dashboard</Term> from the sidebar.
            </Step>
            <Step n={2}>
              Click the <Term>Select Dashboard</Term> pill in the top bar →{" "}
              <Term>Create new</Term>. Give it a name like <Cmd>Sales Q3</Cmd>.
            </Step>
            <Step n={3}>
              The grid opens empty. Switch to <Term>Interactive</Term> mode (top
              bar segmented toggle), then click <Term>Edit</Term>.
            </Step>
          </ol>
        </UseCase>

        <UseCase title="Add a card" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              In <Term>Edit</Term> mode, click <Term>Add Card</Term>.
            </Step>
            <Step n={2}>
              Pick a query from the catalog dropdown, give the card a label,
              optionally set default filters.
            </Step>
            <Step n={3}>
              Choose a display mode — <Term>Table</Term>, <Term>Chart</Term>{" "}
              (auto-detected line/bar/pie), or <Term>KPI</Term> (single number
              with delta).
            </Step>
            <Step n={4}>
              Drag the card to position; resize by the corner handle; click{" "}
              <Term>Done</Term> when finished.
            </Step>
          </ol>
          <Shot
            src="/images/guide/dashboard-add-card.png"
            alt="Add card modal — query picker + filters + display mode"
          />
        </UseCase>

        <UseCase title="Switch Simple ⇄ Interactive" audience="Viewer">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-1.5">
            The top bar segmented toggle decides whether the dashboard is
            editable.
          </p>
          <ul className="space-y-1 text-[12.5px] text-[var(--text-secondary)] list-disc pl-5">
            <li>
              <Term>Simple</Term> — locked, read-only. Use when sharing with
              stakeholders so layouts don&apos;t change.
            </li>
            <li>
              <Term>Interactive</Term> — filters apply globally; clicks
              cross-filter cards. Edit available.
            </li>
          </ul>
          <Tip>
            The <Term>Present</Term> button is always visible — fullscreen
            read-only viewer works in either mode.
          </Tip>
        </UseCase>

        <UseCase title="Share or present" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              In the <Term>Select Dashboard</Term> menu, click{" "}
              <Term>Share</Term> next to the dashboard name.
            </Step>
            <Step n={2}>
              Pick whether the link is <Term>public</Term> or shared with
              specific users (view / edit).
            </Step>
            <Step n={3}>
              Copy the URL. Recipients open it directly — no install needed.
            </Step>
          </ol>
        </UseCase>
      </Section>

      {/* ============================================================ */}
      {/*  Shape data                                                  */}
      {/* ============================================================ */}
      <Section
        id="shape"
        eyebrow="Category · Shape data"
        title="Reshape rows in the Grid Board"
        intro={
          <>
            Grid Board is a spreadsheet workspace — group, pivot, aggregate,
            write formulas, edit cells. Saved as a <Term>view</Term> so
            colleagues can open the same shape.
          </>
        }
      >
        <Shot
          src="/images/guide/gridboard-overview.png"
          alt="Grid Board — Tools row, quality chips, AG Grid with sortable columns"
        />

        <UseCase title="Load a query into the grid" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              Open <Term>Grid Board</Term>.
            </Step>
            <Step n={2}>
              Click the <Term>Select a query</Term> pill in the top bar → pick
              your query → press <Term>Load Data</Term>.
            </Step>
            <Step n={3}>
              The grid hydrates with rows. The <Term>Tools row</Term> above
              shows Group By / Aggregate / Pivot / Formula actions plus quality
              chips and the insights pill.
            </Step>
          </ol>
        </UseCase>

        <UseCase title="Group, pivot, aggregate" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              Right-click any column header → <Term>Group by this column</Term>.
            </Step>
            <Step n={2}>
              Use <Term>Aggregation</Term> in the AG Grid toolbar to sum/avg
              numeric columns within each group.
            </Step>
            <Step n={3}>
              Toggle <Term>Pivot</Term> mode to transpose rows into columns for
              cross-tab analysis.
            </Step>
          </ol>
        </UseCase>

        <UseCase title="Save a view" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              After arranging columns and filters, click <Term>Views</Term> in
              the grid toolbar → <Term>Save As</Term>.
            </Step>
            <Step n={2}>
              Name it (e.g. <Cmd>Q3 by region — open only</Cmd>). Tagged views
              surface in the <Term>Views</Term> picker next time you open the
              query.
            </Step>
          </ol>
        </UseCase>

        <UseCase title="Export CSV / XLSX" audience="Viewer">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Use the <Term>CSV</Term> / <Term>XLSX</Term> buttons in the grid
            toolbar. Exports respect the current view&apos;s filters, sort, and
            visible columns.
          </p>
        </UseCase>
      </Section>

      {/* ============================================================ */}
      {/*  Watch                                                       */}
      {/* ============================================================ */}
      <Section
        id="watch"
        eyebrow="Category · Watch"
        title="Watch the data and react"
        intro={
          <>
            Watch rules run on a schedule against any query. When they fire, the
            bell in the top bar lights up and the alert shows in{" "}
            <Term>Recent Activity</Term> on the chat rail.
          </>
        }
      >
        <UseCase title="Create a watch rule" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              Open <Term>Watch</Term> from the sidebar → <Term>New Rule</Term>.
            </Step>
            <Step n={2}>
              Pick a query + a rule type:
              <ul className="mt-1.5 space-y-0.5 ml-2 text-[12px]">
                <li>
                  <Term>Threshold</Term> — value crosses a boundary
                </li>
                <li>
                  <Term>Trend</Term> — direction change or reversal
                </li>
                <li>
                  <Term>Freshness</Term> — data hasn&apos;t arrived in N minutes
                </li>
                <li>
                  <Term>Anomaly</Term> — Z-score outlier on a column
                </li>
              </ul>
            </Step>
            <Step n={3}>
              Set the cron schedule (a preset like <Cmd>*/15 * * * *</Cmd> for
              every 15 minutes is a sensible default).
            </Step>
          </ol>
        </UseCase>

        <UseCase title="Read recent alerts" audience="Viewer">
          <ol className="mt-1">
            <Step n={1}>
              Click the bell in the top bar to see the last 20 alerts across all
              rules.
            </Step>
            <Step n={2}>
              On the Chat surface, <Term>Recent Activity</Term> in the right
              rail dedupes repeated firings — one row per rule with a{" "}
              <Cmd>×N</Cmd> badge showing fire count.
            </Step>
          </ol>
        </UseCase>

        <UseCase title="Triage anomalies" audience="Viewer">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-2">
            Run any numeric query, then ask Chat{" "}
            <Cmd>find outliers in &lt;query_name&gt;</Cmd>. The engine uses
            Z-score + IQR to flag rows with anomalous values and returns them as
            a table you can pin or export.
          </p>
        </UseCase>
      </Section>

      {/* ============================================================ */}
      {/*  Admin                                                       */}
      {/* ============================================================ */}
      <Section
        id="admin"
        eyebrow="Category · Administer"
        title="Power-user & admin tasks"
        intro={
          <>
            Admins govern groups, wire up data sources, train the NLP, and
            review what the engine is doing. Most users won&apos;t need this
            section — but every link below also routes non-admins to their own
            scoped view.
          </>
        }
      >
        <UseCase title="Manage groups" audience="Admin">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            <Term>Admin → Groups</Term> lists every workspace tenant with KPI
            tiles (Total Groups, Connected Sources, Embed-Ready). Each row shows
            the group&apos;s sources, capability chips (CORPUS, FAQ, TPL), and a
            kebab menu for edit / embed / delete.
          </p>
        </UseCase>

        <UseCase title="Connect a data source" audience="Admin">
          <ol className="mt-1">
            <Step n={1}>
              <Term>Admin → Connectors</Term> → pick a connector type (CSV /
              XLSX, MSSQL, Oracle, REST).
            </Step>
            <Step n={2}>
              Provide credentials or upload the file. The engine probes schema
              automatically.
            </Step>
            <Step n={3}>
              Map columns to roles (id / date / label / value) so auto-charting
              picks the right ones.
            </Step>
            <Step n={4}>
              Save — the new query immediately appears in everyone&apos;s
              <Cmd>list queries</Cmd> for that group.
            </Step>
          </ol>
          <Shot
            src="/images/guide/admin-connectors-query-builder.png"
            alt="Connector query builder — map columns, set filters, preview rows"
          />
        </UseCase>

        <UseCase title="Train the NLP" audience="Admin">
          <ul className="space-y-1.5 text-[12.5px] text-[var(--text-secondary)] list-disc pl-5">
            <li>
              <Term>Admin → Intents</Term> — see the canonical intent
              vocabulary, phrase counts, and edit/extend examples.
            </li>
            <li>
              <Term>Admin → Synonyms</Term> — register column-name aliases (e.g.{" "}
              <Cmd>revenue → sales</Cmd>).
            </li>
            <li>
              <Term>Admin → Learning</Term> — review low-confidence utterances
              pending labelling, watch the auto-learned stream grow.
            </li>
          </ul>
        </UseCase>

        <UseCase title="Review audit + logs" audience="Admin">
          <ul className="space-y-1.5 text-[12.5px] text-[var(--text-secondary)] list-disc pl-5">
            <li>
              <Term>Admin → Conversation Logs</Term> — live tail of every chat
              with intent + confidence + latency. Filter by date range (1h / 24h
              / 7d / 30d / All).
            </li>
            <li>
              <Term>Admin → Audit Trail</Term> — every write (create, update,
              delete) by actor and resource. Date-grouped breakdown bar chart
              underneath.
            </li>
            <li>
              <Term>Admin → Analytics</Term> — Query performance KPIs
              (executions, avg duration, failure rate) with execution-volume
              bars and a Recent Executions list.
            </li>
          </ul>
          <Shot
            src="/images/guide/admin-analytics.png"
            alt="Admin Analytics — KPI tiles, query performance table, execution volume bars"
          />
        </UseCase>
      </Section>

      {/* ============================================================ */}
      {/*  Keyboard shortcuts                                          */}
      {/* ============================================================ */}
      <Section id="shortcuts" eyebrow="Reference" title="Keyboard shortcuts">
        <div className="grid sm:grid-cols-2 gap-2.5">
          {[
            { keys: ["Ctrl", "K"], action: "Focus the chat input" },
            { keys: ["Ctrl", "/"], action: "Open the shortcuts help modal" },
            { keys: ["Ctrl", "\\"], action: "Toggle dark / light theme" },
            {
              keys: ["Ctrl", "Shift", "N"],
              action: "Start a fresh chat session",
            },
            { keys: ["Esc"], action: "Close the active modal or panel" },
          ].map((s) => (
            <div
              key={s.action}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40"
            >
              <span className="text-[12.5px] text-[var(--text-secondary)]">
                {s.action}
              </span>
              <span className="flex gap-1 shrink-0">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  Footer CTA                                                  */}
      {/* ============================================================ */}
      <div className="surface px-5 py-4 mt-8 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-[var(--brand)] shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-display text-[14px] font-bold text-[var(--text-primary)] tracking-tight">
            Still stuck?
          </h3>
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mt-1">
            Type <Cmd>help</Cmd> in Chat for context-aware suggestions, or visit
            the other guides — Config, Docker / Linux / Windows setup, and
            Learning loop — from the{" "}
            <Link
              href="/admin/guides"
              className="text-[var(--brand)] hover:underline"
            >
              guides index
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
