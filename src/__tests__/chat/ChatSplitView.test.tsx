/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ChatSplitView } from "@/components/chat/ChatSplitView";

describe("ChatSplitView", () => {
  it("renders left and right panels", () => {
    render(
      <ChatSplitView
        chatPanel={<div data-testid="chat">Chat</div>}
        dataPanel={<div data-testid="data">Data</div>}
      />,
    );
    expect(screen.getByTestId("chat")).toBeInTheDocument();
    expect(screen.getByTestId("data")).toBeInTheDocument();
  });

  it("renders the divider", () => {
    render(
      <ChatSplitView chatPanel={<div>Chat</div>} dataPanel={<div>Data</div>} />,
    );
    expect(screen.getByTestId("split-divider")).toBeInTheDocument();
  });
});
