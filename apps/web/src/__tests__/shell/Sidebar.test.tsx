/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/shell/Sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: mockPush }),
}));

function renderSidebar() {
  return render(
    <ThemeProvider>
      <Sidebar />
    </ThemeProvider>,
  );
}

describe("Sidebar", () => {
  it("renders nav buttons", () => {
    renderSidebar();
    expect(screen.getByTitle("Chat")).toBeInTheDocument();
    expect(screen.getByTitle("Dashboard")).toBeInTheDocument();
    expect(screen.getByTitle("Grid Board")).toBeInTheDocument();
    expect(screen.getByTitle("Data Explorer")).toBeInTheDocument();
  });

  it("highlights the active route with the brand-subtle background", () => {
    renderSidebar();
    const chatBtn = screen.getByTitle("Chat");
    expect(chatBtn.className).toContain("bg-[var(--brand-subtle)]");
  });

  it("renders labels alongside icons in the default pinned-open state", () => {
    renderSidebar();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Grid Board")).toBeInTheDocument();
  });

  it("keeps the expand/collapse toggle in the footer cluster", () => {
    renderSidebar();
    expect(screen.getByTitle("Collapse sidebar")).toBeInTheDocument();
  });

  it("collapses to icon-only mode when the user clicks Collapse", () => {
    renderSidebar();
    fireEvent.click(screen.getByTitle("Collapse sidebar"));
    expect(screen.getByTitle("Chat")).toBeInTheDocument();
  });
});
