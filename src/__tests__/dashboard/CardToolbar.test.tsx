/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { CardToolbar } from "@/components/dashboard/CardToolbar";

describe("CardToolbar", () => {
  it("renders action buttons", () => {
    render(
      <CardToolbar
        onRefresh={jest.fn()}
        onMaximize={jest.fn()}
        onSettings={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    expect(screen.getByTitle("Refresh")).toBeInTheDocument();
    expect(screen.getByTitle("Maximize")).toBeInTheDocument();
    expect(screen.getByTitle("Settings")).toBeInTheDocument();
    expect(screen.getByTitle("More")).toBeInTheDocument();
  });
  it("calls onRefresh when clicked", () => {
    const onRefresh = jest.fn();
    render(
      <CardToolbar
        onRefresh={onRefresh}
        onMaximize={jest.fn()}
        onSettings={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTitle("Refresh"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
