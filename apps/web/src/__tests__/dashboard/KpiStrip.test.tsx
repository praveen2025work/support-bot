/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { KpiStrip } from "@/components/dashboard/KpiStrip";

describe("KpiStrip", () => {
  it("renders KPI items", () => {
    render(
      <KpiStrip
        items={[
          {
            label: "Total PNL",
            value: "$4.2M",
            change: "+8.3%",
            changeType: "positive",
          },
          {
            label: "Positions",
            value: "1,247",
            change: "-3",
            changeType: "negative",
          },
        ]}
      />,
    );
    expect(screen.getByText("Total PNL")).toBeInTheDocument();
    expect(screen.getByText("$4.2M")).toBeInTheDocument();
    expect(screen.getByText("+8.3%")).toBeInTheDocument();
  });
  it("renders empty state gracefully", () => {
    const { container } = render(<KpiStrip items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
