/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";

describe("ContextualTopBar", () => {
  it("renders page title", () => {
    render(<ContextualTopBar title="Chat" />);
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("renders group selector when groups provided", () => {
    render(
      <ContextualTopBar
        title="Chat"
        groups={[
          { id: "default", name: "Default" },
          { id: "finance", name: "Finance" },
        ]}
        activeGroupId="default"
        onGroupChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("renders children as right-side actions", () => {
    render(
      <ContextualTopBar title="Dashboard">
        <button>Edit</button>
      </ContextualTopBar>,
    );
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });
});
