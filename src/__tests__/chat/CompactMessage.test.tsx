/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { CompactMessage } from "@/components/chat/CompactMessage";

describe("CompactMessage", () => {
  it("renders user message right-aligned with brand bg", () => {
    render(<CompactMessage role="user" text="show me PNL" />);
    const msg = screen.getByText("show me PNL");
    expect(msg.closest("[data-role]")?.getAttribute("data-role")).toBe("user");
  });

  it("renders bot message with query name", () => {
    render(
      <CompactMessage
        role="bot"
        text="PNL Lineage"
        meta={{ queryName: "pnl-lineage", rowCount: 93, groupCount: 5 }}
      />,
    );
    expect(screen.getByText("PNL Lineage")).toBeInTheDocument();
    expect(screen.getByText(/5 groups/)).toBeInTheDocument();
    expect(screen.getByText(/93 rows/)).toBeInTheDocument();
  });

  it("renders 'View in panel' link for bot messages with data", () => {
    render(
      <CompactMessage
        role="bot"
        text="PNL Lineage"
        meta={{ queryName: "pnl-lineage", rowCount: 93 }}
        onViewInPanel={jest.fn()}
      />,
    );
    expect(screen.getByText(/View in panel/)).toBeInTheDocument();
  });

  it("does not render 'View in panel' without handler", () => {
    render(<CompactMessage role="bot" text="Hello there!" />);
    expect(screen.queryByText(/View in panel/)).not.toBeInTheDocument();
  });
});
