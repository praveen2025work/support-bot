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

  it("renders the active result's query name in the Contextual Insights rail", () => {
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
    // The Active Dataset card surfaces the raw query name.
    expect(screen.getByText("pnl-lineage")).toBeInTheDocument();
    // Active Dataset header (text content) is always present.
    expect(screen.getByText(/Active Dataset/i)).toBeInTheDocument();
  });

  it("renders the Quick Synthesis Actions panel when a result is active", () => {
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
    expect(screen.getByText(/Quick Synthesis Actions/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate summary/i)).toBeInTheDocument();
  });
});
