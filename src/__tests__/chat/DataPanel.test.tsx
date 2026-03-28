/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { DataPanel } from "@/components/chat/DataPanel";

describe("DataPanel", () => {
  it("shows pinned dashboard when idle", () => {
    render(<DataPanel activeResult={null} />);
    expect(
      screen.getByText(/No pinned queries yet|Pinned Queries/),
    ).toBeInTheDocument();
  });

  it("shows result card when active", () => {
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
    expect(screen.getByText("PNL Lineage")).toBeInTheDocument();
    expect(screen.getByText("5 groups · 93 rows")).toBeInTheDocument();
  });

  it("shows table/chart toggle when active", () => {
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
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("Chart")).toBeInTheDocument();
  });
});
