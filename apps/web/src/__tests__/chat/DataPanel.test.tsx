/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { DataPanel } from "@/components/chat/DataPanel";

// jsdom doesn't expose fetch; SystemHealthRail polls /api/health and
// /api/watch/alerts on mount. A no-op mock keeps the rail happy
// without making real network calls.
beforeAll(() => {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ alerts: [] }),
    }),
  ) as unknown as typeof fetch;
});

afterAll(() => {
  (global.fetch as jest.Mock | undefined)?.mockRestore?.();
});

describe("DataPanel", () => {
  it("shows the empty pinned card when there is no active result", () => {
    render(<DataPanel activeResult={null} />);
    // The redesigned empty state surfaces a Pinned card and the
    // System Health rail. Assert the pinned empty hint is rendered.
    expect(screen.getByText(/No pinned queries yet/i)).toBeInTheDocument();
  });

  it("renders the active result's query name and row count in the rail header", () => {
    render(
      <DataPanel
        activeResult={{
          queryName: "pnl-lineage",
          title: "PNL Lineage",
          subtitle: "5 groups · 93 rows",
          data: [{ Name: "PNL-FX-001", Value: 1200000 }],
          columns: ["Name", "Value"],
        }}
      />,
    );
    // Active Dataset card now uses the query name as its heading; the
    // "Active Dataset" eyebrow was dropped because the heading is the
    // query name itself.
    expect(screen.getByText("pnl-lineage")).toBeInTheDocument();
    // Row count + meta sits inline next to the name. The same row count
    // also renders in the DataPanel pagination footer, so use getAllByText.
    expect(screen.getAllByText(/1 row/i).length).toBeGreaterThan(0);
  });

  it("renders the Quick Synthesis Actions tiles when a result is active", () => {
    render(
      <DataPanel
        activeResult={{
          queryName: "test",
          title: "Test Query",
          subtitle: "10 rows",
          data: [{ A: 1 }],
          columns: ["A"],
        }}
      />,
    );
    // The "Quick Synthesis Actions" section header was dropped — the
    // tiles themselves are the heading-less affordance. Assert two of
    // the always-available actions render.
    expect(screen.getByText(/Generate summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Detect anomalies/i)).toBeInTheDocument();
  });
});
