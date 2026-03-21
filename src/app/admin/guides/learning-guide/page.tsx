"use client";

import {
  Section,
  CmdBlock,
  Badge,
  Code,
  FileRef,
  GuideHeader,
  QuickNav,
  CardContainer,
  InfoBox,
  TroubleshootItem,
} from "../components";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "learning", label: "Auto-Learning" },
  { id: "review-queue", label: "Review Queue" },
  { id: "anomaly", label: "Anomaly Detection" },
  { id: "seasonal", label: "Seasonal Baselines" },
  { id: "business-rules", label: "Business Rules" },
  { id: "client-ml", label: "Client-Side ML" },
  { id: "multi-tenant", label: "Multi-Tenant" },
  { id: "checklist", label: "Tenant Checklist" },
  { id: "api", label: "Admin API" },
  { id: "trouble", label: "Troubleshooting" },
];

export default function LearningGuidePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <GuideHeader
        title="Learning & ML Features Guide"
        description="How auto-learning, anomaly detection, and ML features work — and what tenant teams need to configure"
        badgeColor="cyan"
        badgeText="Admins & Tenant Teams"
      />

      <QuickNav sections={SECTIONS} />

      <CardContainer>
        {/* ── Overview ── */}
        <Section id="overview" title="ML Features Overview">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            The Engine includes three ML-powered systems that improve
            automatically over time. Each operates per-tenant (group) with
            isolated data.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              {
                name: "Auto-Learning",
                desc: "Tracks user interactions, learns new intent patterns from positive feedback",
                icon: "brain",
                color: "bg-purple-50 border-purple-200 text-purple-700",
              },
              {
                name: "Anomaly Detection",
                desc: "Detects unusual values in query results using statistical baselines",
                icon: "alert",
                color: "bg-red-50 border-red-200 text-red-700",
              },
              {
                name: "Review Queue",
                desc: "Flags low-confidence classifications for admin review and correction",
                icon: "check",
                color: "bg-blue-50 border-blue-200 text-blue-700",
              },
            ].map((f) => (
              <div
                key={f.name}
                className={`p-3 rounded-lg border text-xs ${f.color}`}
              >
                <div className="font-semibold">{f.name}</div>
                <div className="mt-1 opacity-80">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {`User Message
    │
    ▼
┌─────────────────────────────────┐
│  NLP Classification Engine      │
│  (NLP + fuzzy + ensemble)       │
└──────┬──────────────────────────┘
       │
       ├── confidence ≥ 0.4 ─────▶ Normal response + log interaction
       │                            │
       │                            ▼
       │                     ┌──────────────────┐
       │                     │  Signal Tracking  │
       │                     │  (clicks, retries)│
       │                     └──────┬───────────┘
       │                            │ 3+ positive signals
       │                            ▼
       │                     ┌──────────────────┐
       │                     │  Auto-Learn       │
       │                     │  → add to corpus  │
       │                     └──────────────────┘
       │
       └── confidence < 0.4 ─────▶ Review Queue (admin review)

Query Results
    │
    ▼
┌─────────────────────────────────┐
│  Anomaly Detector               │
│  (z-score + seasonal + rules)   │
└──────┬──────────────────────────┘
       │
       ├── normal ──────▶ Store snapshot for baseline
       └── anomaly ─────▶ Alert (info / warning / critical)`}
            </pre>
          </div>
        </Section>

        {/* ── Auto-Learning ── */}
        <Section id="learning" title="Auto-Learning Pipeline">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Every user message is logged with its classification confidence,
            source, and extracted entities. The system tracks user feedback
            signals (clicks, retries, corrections) and automatically promotes
            high-confidence utterances to the NLP corpus.
          </p>

          <div className="space-y-2 mb-4">
            {[
              {
                step: "1",
                title: "Interaction Logging",
                desc: "Every message is logged with intent, confidence, source (NLP/fuzzy/ensemble), entities, and surface (chat/dashboard/widget).",
              },
              {
                step: "2",
                title: "Signal Tracking",
                desc: "Positive signals: user clicks a suggestion, accepts a result. Negative: user retries, skips, or corrects. Signals have a 7-day half-life decay.",
              },
              {
                step: "3",
                title: "Auto-Promotion",
                desc: "Every 50 interactions, the system checks signal aggregates. Utterances with 3+ positive signals and <20% negative ratio are auto-added to the corpus.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="flex gap-3 p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  {s.step}
                </div>
                <div>
                  <div
                    className="font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    {s.title}
                  </div>
                  <div style={{ color: "hsl(var(--muted-foreground))" }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="text-xs font-semibold mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Configuration Constants
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <th
                    className="text-left py-2 pr-3 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Constant
                  </th>
                  <th
                    className="text-left py-2 pr-3 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Default
                  </th>
                  <th
                    className="text-left py-2 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Description
                  </th>
                </tr>
              </thead>
              <tbody style={{ color: "hsl(var(--muted-foreground))" }}>
                {[
                  {
                    name: "LEARNING_CONFIDENCE_THRESHOLD",
                    val: "0.4",
                    desc: "Below this confidence, messages go to the review queue",
                  },
                  {
                    name: "AUTO_LEARN_PROCESS_INTERVAL",
                    val: "50",
                    desc: "Process signals every N interactions",
                  },
                  {
                    name: "AUTO_LEARN_MIN_POSITIVE",
                    val: "3",
                    desc: "Minimum positive signals to auto-promote",
                  },
                  {
                    name: "AUTO_LEARN_MAX_NEG_RATIO",
                    val: "0.2",
                    desc: "Maximum allowed negative signal ratio (20%)",
                  },
                ].map((row) => (
                  <tr
                    key={row.name}
                    className="border-b"
                    style={{ borderColor: "hsl(var(--border) / 0.5)" }}
                  >
                    <td className="py-2 pr-3 font-mono">{row.name}</td>
                    <td className="py-2 pr-3">
                      <Badge color="purple">{row.val}</Badge>
                    </td>
                    <td className="py-2">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InfoBox variant="info" title="File location">
            Constants are defined in{" "}
            <FileRef path="services/engine/src/core/constants.ts" />. Learning
            logic lives in <FileRef path="services/engine/src/core/learning/" />
            .
          </InfoBox>
        </Section>

        {/* ── Review Queue ── */}
        <Section id="review-queue" title="Review Queue">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            When the NLP classifies a message with confidence below{" "}
            <Code>0.4</Code>, it lands in the review queue. Admins can approve
            (correct the intent) or dismiss these entries. Approved corrections
            are added to the corpus, improving future classification.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              {
                action: "Approve & Correct",
                desc: "Assign the correct intent — the utterance is added to the NLP corpus under that intent",
                color: "bg-green-50 border-green-200 text-green-700",
              },
              {
                action: "Dismiss",
                desc: "Ignore the entry — it was noise, a typo, or not a valid query pattern",
                color: "bg-red-50 border-red-200 text-red-700",
              },
            ].map((a) => (
              <div
                key={a.action}
                className={`p-3 rounded-lg border text-xs ${a.color}`}
              >
                <div className="font-semibold">{a.action}</div>
                <div className="mt-1 opacity-80">{a.desc}</div>
              </div>
            ))}
          </div>

          <InfoBox variant="tip" title="Best practice">
            Review the queue weekly. High-volume tenants should lower the
            confidence threshold to <Code>0.3</Code> to reduce noise, while new
            deployments should keep it at <Code>0.4</Code> or raise it to{" "}
            <Code>0.5</Code> to capture more training data.
          </InfoBox>
        </Section>

        {/* ── Anomaly Detection ── */}
        <Section id="anomaly" title="Anomaly Detection">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            When a query returns numeric results, the anomaly detector compares
            each value against historical baselines using z-score analysis. If a
            value falls outside the expected range, it is flagged with a
            severity level.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              {
                level: "Info",
                range: "1.5 – 2.0 σ",
                desc: "Noteworthy but not alarming",
                color: "bg-blue-50 border-blue-200 text-blue-700",
              },
              {
                level: "Warning",
                range: "2.0 – 3.0 σ",
                desc: "Unusual — investigate",
                color: "bg-amber-50 border-amber-200 text-amber-700",
              },
              {
                level: "Critical",
                range: "> 3.0 σ",
                desc: "Highly unusual — action needed",
                color: "bg-red-50 border-red-200 text-red-700",
              },
            ].map((l) => (
              <div
                key={l.level}
                className={`p-3 rounded-lg border text-xs ${l.color}`}
              >
                <div className="font-semibold">{l.level}</div>
                <div className="font-mono mt-1">{l.range}</div>
                <div className="mt-1 opacity-80">{l.desc}</div>
              </div>
            ))}
          </div>

          <div
            className="text-xs font-semibold mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Detection Configuration
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <th
                    className="text-left py-2 pr-3 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Setting
                  </th>
                  <th
                    className="text-left py-2 pr-3 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Default
                  </th>
                  <th
                    className="text-left py-2 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Description
                  </th>
                </tr>
              </thead>
              <tbody style={{ color: "hsl(var(--muted-foreground))" }}>
                {[
                  {
                    name: "enabled",
                    val: "true",
                    desc: "Master switch for anomaly detection",
                  },
                  {
                    name: "zScoreWarning",
                    val: "2.0",
                    desc: "Standard deviations for warning alerts",
                  },
                  {
                    name: "zScoreCritical",
                    val: "3.0",
                    desc: "Standard deviations for critical alerts",
                  },
                  {
                    name: "minSamples",
                    val: "5",
                    desc: "Minimum data points before baselines activate",
                  },
                  {
                    name: "trackedColumns",
                    val: "[]",
                    desc: "Specific columns to monitor (empty = auto-detect numeric)",
                  },
                  {
                    name: "seasonalEnabled",
                    val: "false",
                    desc: "Enable day-of-week seasonal adjustment",
                  },
                ].map((row) => (
                  <tr
                    key={row.name}
                    className="border-b"
                    style={{ borderColor: "hsl(var(--border) / 0.5)" }}
                  >
                    <td className="py-2 pr-3 font-mono">{row.name}</td>
                    <td className="py-2 pr-3">
                      <Badge color="red">{row.val}</Badge>
                    </td>
                    <td className="py-2">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Seasonal Baselines ── */}
        <Section id="seasonal" title="Seasonal Baselines">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            When enabled, the detector maintains separate baselines for each day
            of the week. This prevents false alerts for expected variations
            (e.g., lower weekend traffic, Monday spikes).
          </p>

          <div
            className="p-3 rounded-lg border text-xs mb-3"
            style={{
              backgroundColor: "hsl(var(--muted) / 0.3)",
              borderColor: "hsl(var(--border))",
            }}
          >
            <div
              className="font-semibold mb-1"
              style={{ color: "hsl(var(--foreground))" }}
            >
              How it works
            </div>
            <ol
              className="list-decimal list-inside space-y-1"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <li>
                Each query result snapshot is tagged with its day of the week
              </li>
              <li>
                Baselines are computed per-day: Monday has its own mean/stdDev,
                Tuesday has its own, etc.
              </li>
              <li>
                Anomaly checks compare today{"\u2019"}s values against the
                same-day baseline
              </li>
              <li>
                If a day lacks enough samples (<Code>minSamples</Code>), the
                global baseline is used as fallback
              </li>
            </ol>
          </div>

          <InfoBox variant="tip" title="When to enable">
            Enable seasonal baselines if your data has day-of-week patterns
            (revenue, traffic, headcount). Most tenants benefit from enabling
            this after 2-3 weeks of data collection.
          </InfoBox>
        </Section>

        {/* ── Business Rules ── */}
        <Section id="business-rules" title="Custom Business Rules">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            In addition to statistical detection, admins can define
            domain-specific thresholds. Business rules fire independently of
            z-score analysis.
          </p>

          <CmdBlock label="Example: Alert if revenue drops below $100k">{`POST /api/admin/anomaly/rules
{
  "column": "total_revenue",
  "operator": "<",
  "value": 100000,
  "severity": "critical",
  "label": "Revenue below $100k threshold"
}`}</CmdBlock>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {["<", ">", "<=", ">=", "==", "!="].map((op) => (
              <div
                key={op}
                className="p-2 rounded-lg border text-xs text-center font-mono"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
              >
                {op}
              </div>
            ))}
          </div>

          <InfoBox variant="info">
            Business rules are stored per-group in{" "}
            <FileRef path="services/engine/data/anomaly/{groupId}/config.json" />
            . Rules trigger on every query that returns the monitored column.
          </InfoBox>
        </Section>

        {/* ── Client-Side ML ── */}
        <Section id="client-ml" title="Client-Side ML Analysis">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            In addition to server-side ML, the platform includes 16 client-side
            analysis features that run directly in the browser on query result
            data. These are available via follow-up commands in Chat or as
            toolbar actions in the Dashboard.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              {
                name: "Trend Analysis",
                desc: "Detect upward, downward, or stable trends across numeric columns",
                color: "bg-blue-50 border-blue-200 text-blue-700",
              },
              {
                name: "Outlier Detection",
                desc: "Identify statistical outliers using IQR or z-score methods",
                color: "bg-red-50 border-red-200 text-red-700",
              },
              {
                name: "Correlation Matrix",
                desc: "Compute pairwise correlations between numeric columns",
                color: "bg-purple-50 border-purple-200 text-purple-700",
              },
              {
                name: "Clustering (K-Means)",
                desc: "Group rows into clusters based on numeric features",
                color: "bg-green-50 border-green-200 text-green-700",
              },
              {
                name: "Linear Regression",
                desc: "Fit a line to predict one column from another",
                color: "bg-indigo-50 border-indigo-200 text-indigo-700",
              },
              {
                name: "Distribution Analysis",
                desc: "Histograms, skewness, kurtosis, and normality tests",
                color: "bg-cyan-50 border-cyan-200 text-cyan-700",
              },
              {
                name: "Time Series Decomposition",
                desc: "Separate trend, seasonal, and residual components",
                color: "bg-amber-50 border-amber-200 text-amber-700",
              },
              {
                name: "Forecast",
                desc: "Simple exponential smoothing forecast for numeric series",
                color: "bg-teal-50 border-teal-200 text-teal-700",
              },
              {
                name: "PCA",
                desc: "Principal Component Analysis for dimensionality reduction",
                color: "bg-orange-50 border-orange-200 text-orange-700",
              },
              {
                name: "Summary Statistics",
                desc: "Mean, median, mode, std dev, percentiles per column",
                color: "bg-blue-50 border-blue-200 text-blue-700",
              },
              {
                name: "Pareto Analysis",
                desc: "80/20 rule identification on categorical data",
                color: "bg-purple-50 border-purple-200 text-purple-700",
              },
              {
                name: "Anomaly Scoring",
                desc: "Per-row anomaly scores using Isolation Forest approach",
                color: "bg-red-50 border-red-200 text-red-700",
              },
              {
                name: "Variance Analysis",
                desc: "Compare actual vs expected values with variance breakdown",
                color: "bg-green-50 border-green-200 text-green-700",
              },
              {
                name: "Moving Averages",
                desc: "SMA, EMA, and weighted moving averages for smoothing",
                color: "bg-cyan-50 border-cyan-200 text-cyan-700",
              },
              {
                name: "Percentile Ranking",
                desc: "Rank rows by percentile within each column",
                color: "bg-indigo-50 border-indigo-200 text-indigo-700",
              },
              {
                name: "Cross-Tabulation",
                desc: "Contingency tables with chi-square test for independence",
                color: "bg-amber-50 border-amber-200 text-amber-700",
              },
            ].map((f) => (
              <div
                key={f.name}
                className={`p-3 rounded-lg border text-xs ${f.color}`}
              >
                <div className="font-semibold">{f.name}</div>
                <div className="mt-1 opacity-80">{f.desc}</div>
              </div>
            ))}
          </div>

          <InfoBox variant="tip" title="How to use">
            After running a query in Chat, type a follow-up like &quot;show
            trends&quot;, &quot;find outliers&quot;, or &quot;run
            correlation&quot;. The ML analysis runs in the browser with zero
            server load. Results include both data tables and visualizations.
          </InfoBox>

          <InfoBox variant="info" title="No configuration needed">
            Client-side ML features work automatically on any query result with
            numeric data. They are implemented in pure TypeScript with no
            external dependencies.
          </InfoBox>
        </Section>

        {/* ── Multi-Tenant ── */}
        <Section id="multi-tenant" title="Multi-Tenant Data Isolation">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            All ML features operate in complete isolation per tenant group.
            There is no cross-tenant data leakage — each group has its own
            learning data, anomaly baselines, corpus, and user clusters.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {`data/
├── learning/
│   ├── default/              ← Default tenant
│   │   ├── interactions.jsonl
│   │   ├── review-queue.jsonl
│   │   ├── auto-learned.jsonl
│   │   ├── signal-aggregates.json
│   │   └── co-occurrence.json
│   ├── mitr-ai/              ← Tenant: mitr-ai
│   │   └── ...
│   └── finance/              ← Tenant: finance
│       └── ...
├── anomaly/
│   ├── default/
│   │   ├── snapshots.jsonl
│   │   ├── baselines.json
│   │   ├── seasonal-baselines.json
│   │   ├── history.jsonl
│   │   └── config.json
│   └── mitr-ai/
│       └── ...
└── logs/
    └── conversations.jsonl`}
            </pre>
          </div>

          <InfoBox variant="warning" title="Multi-instance deployments">
            If running multiple Engine instances behind a load balancer, mount
            the <Code>data/</Code> directory on shared storage (NAS/NFS) so all
            instances see the same learning and anomaly data.
          </InfoBox>
        </Section>

        {/* ── Tenant Checklist ── */}
        <Section id="checklist" title="Tenant Team Onboarding Checklist">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            When onboarding a new tenant, work through this checklist to ensure
            ML features are properly configured.
          </p>

          <div className="space-y-2">
            {[
              {
                num: "1",
                title: "Confirm group ID",
                desc: "Each tenant needs a unique group ID (e.g., 'finance', 'hr_team'). This is set in groups.json and determines the data directory.",
              },
              {
                num: "2",
                title: "Seed the NLP corpus",
                desc: "Add initial training utterances for the tenant's domain-specific intents in the corpus.json file under their group.",
              },
              {
                num: "3",
                title: "Set anomaly thresholds",
                desc: "Configure zScoreWarning/Critical based on data variability. High-variance data (sales) may need 2.5/3.5; stable data (headcount) can use 1.5/2.5.",
              },
              {
                num: "4",
                title: "Define business rules",
                desc: "Work with the tenant to identify critical thresholds (e.g., revenue < $X, error rate > Y%). Add via the Admin API.",
              },
              {
                num: "5",
                title: "Enable seasonal baselines",
                desc: "If the tenant's data has day-of-week patterns, enable seasonalEnabled in anomaly config. Wait 2-3 weeks for baselines to build.",
              },
              {
                num: "6",
                title: "Review queue schedule",
                desc: "Designate who reviews the low-confidence queue. Recommend weekly reviews for the first month, then bi-weekly.",
              },
              {
                num: "7",
                title: "Monitor auto-learning",
                desc: "Check auto-learned.jsonl periodically. Verify promoted utterances are correct. Incorrect auto-learns can be removed from the corpus.",
              },
              {
                num: "8",
                title: "Tracked columns (optional)",
                desc: "By default, all numeric columns are monitored. If a tenant has many numeric columns, restrict to the most important ones via trackedColumns config.",
              },
            ].map((item) => (
              <div
                key={item.num}
                className="flex gap-3 p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">
                  {item.num}
                </div>
                <div>
                  <div
                    className="font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    {item.title}
                  </div>
                  <div style={{ color: "hsl(var(--muted-foreground))" }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Admin API ── */}
        <Section id="api" title="Admin API Reference">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            All anomaly and learning endpoints require the{" "}
            <Code>ENGINE_API_KEY</Code> header in production.
          </p>

          <div className="space-y-2">
            {[
              {
                method: "GET",
                path: "/api/admin/anomaly/config",
                desc: "Get current anomaly detection configuration",
              },
              {
                method: "PUT",
                path: "/api/admin/anomaly/config",
                desc: "Update anomaly detection settings",
              },
              {
                method: "GET",
                path: "/api/admin/anomaly/baselines",
                desc: "View computed statistical baselines",
              },
              {
                method: "POST",
                path: "/api/admin/anomaly/rebuild-baselines",
                desc: "Recalculate baselines from snapshot history",
              },
              {
                method: "GET",
                path: "/api/admin/anomaly/history",
                desc: "View detected anomaly events",
              },
              {
                method: "POST",
                path: "/api/admin/anomaly/rules",
                desc: "Create a new business rule",
              },
              {
                method: "DELETE",
                path: "/api/admin/anomaly/rules/:id",
                desc: "Remove a business rule",
              },
            ].map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="flex items-start gap-3 p-2.5 rounded-lg border text-xs"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <Badge
                  color={
                    ep.method === "GET"
                      ? "green"
                      : ep.method === "POST"
                        ? "blue"
                        : ep.method === "PUT"
                          ? "orange"
                          : "red"
                  }
                >
                  {ep.method}
                </Badge>
                <div>
                  <div
                    className="font-mono font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    {ep.path}
                  </div>
                  <div style={{ color: "hsl(var(--muted-foreground))" }}>
                    {ep.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Troubleshooting ── */}
        <Section id="trouble" title="Troubleshooting">
          <div className="space-y-2">
            <TroubleshootItem
              title="No anomalies detected even with unusual data"
              fix="Check minSamples — you need at least 5 historical snapshots before baselines activate. Run queries a few times to build history, then trigger 'rebuild-baselines'."
            />
            <TroubleshootItem
              title="Too many false positive anomaly alerts"
              fix="Increase zScoreWarning to 2.5 or 3.0. If data is seasonal, enable seasonalEnabled. For specific columns, add business rules instead of relying on z-score alone."
            />
            <TroubleshootItem
              title="Review queue is empty despite low-confidence messages"
              fix="Check that the learning service is enabled and that LEARNING_CONFIDENCE_THRESHOLD is set appropriately (default 0.4). Messages above the threshold bypass the queue."
            />
            <TroubleshootItem
              title="Auto-learned utterances are incorrect"
              fix="Remove the bad entry from auto-learned.jsonl and the NLP corpus. Lower AUTO_LEARN_MIN_POSITIVE to require more signals, or raise AUTO_LEARN_MAX_NEG_RATIO."
            />
            <TroubleshootItem
              title="Seasonal baselines not working"
              fix="Ensure seasonalEnabled is true in anomaly config. You need at least minSamples data points for each day of the week — it takes 2-3 weeks to build complete seasonal baselines."
            />
            <TroubleshootItem
              title="Learning data not shared across Engine instances"
              fix="Mount the data/ directory on shared NFS/NAS storage. Set the same DATA_DIR environment variable on all instances."
            />
          </div>
        </Section>
      </CardContainer>
    </div>
  );
}
