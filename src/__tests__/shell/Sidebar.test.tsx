/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/shell/Sidebar";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: mockPush }),
}));

describe("Sidebar", () => {
  it("renders nav icons", () => {
    render(<Sidebar />);
    expect(screen.getByTitle("Chat")).toBeInTheDocument();
    expect(screen.getByTitle("Dashboard")).toBeInTheDocument();
    expect(screen.getByTitle("Grid Board")).toBeInTheDocument();
    expect(screen.getByTitle("Data Explorer")).toBeInTheDocument();
  });

  it("highlights active route", () => {
    render(<Sidebar />);
    const chatBtn = screen.getByTitle("Chat");
    expect(chatBtn.className).toContain("bg-[var(--brand-subtle)]");
  });

  it("shows labels on hover", () => {
    render(<Sidebar />);
    const sidebar = screen.getByTestId("sidebar");
    fireEvent.mouseEnter(sidebar);
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("hides labels when not hovered", () => {
    render(<Sidebar />);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});
