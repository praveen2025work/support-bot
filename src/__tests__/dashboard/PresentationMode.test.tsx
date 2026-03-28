/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { PresentationMode } from "@/components/dashboard/PresentationMode";

describe("PresentationMode", () => {
  it("renders with dashboard name", () => {
    render(
      <PresentationMode
        dashboardName="PNL Overview"
        groupName="finance"
        onExit={jest.fn()}
      >
        <div>Card content</div>
      </PresentationMode>,
    );
    expect(screen.getByText("PNL Overview")).toBeInTheDocument();
    expect(screen.getByText("finance")).toBeInTheDocument();
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });
  it("calls onExit when Escape pressed", () => {
    const onExit = jest.fn();
    render(
      <PresentationMode dashboardName="Test" groupName="test" onExit={onExit}>
        <div>Content</div>
      </PresentationMode>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
