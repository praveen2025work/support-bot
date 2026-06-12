/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminOnboardPage from "@/app/admin/onboard/page";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
  global.fetch = jest.fn(async (url: string) => {
    const u = String(url);
    if (u.includes("/api/admin/onboard/templates")) {
      return { ok: true, json: async () => ({ templates: [] }) };
    }
    if (u.includes("/api/admin/groups/create")) {
      return { ok: true, json: async () => ({ groupId: "newgrp" }) };
    }
    if (u.includes("/api/chat")) {
      return { ok: true, json: async () => ({ intent: "query.list" }) };
    }
    return { ok: true, json: async () => ({}) };
  }) as unknown as typeof fetch;
});

describe("Onboard wizard", () => {
  it("advances to the smoke-test step after creating a group, then routes on finish", async () => {
    render(<AdminOnboardPage />);

    fireEvent.change(screen.getByPlaceholderText("e.g. finance_team"), {
      target: { value: "newgrp" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Finance Bot"), {
      target: { value: "New Group" },
    });
    fireEvent.click(screen.getByText("Create Group"));

    expect(await screen.findByText(/Smoke test/)).toBeInTheDocument();

    fireEvent.click(await screen.findByText(/Finish/));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/admin/groups/newgrp"),
    );
  });
});
