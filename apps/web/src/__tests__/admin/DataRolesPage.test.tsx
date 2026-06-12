/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DataRolesPage from "@/app/admin/data-roles/page";

beforeEach(() => {
  global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return {
        ok: true,
        json: async () => ({ id: "ops", label: "Ops", description: "" }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        roles: [
          { id: "finance", label: "Finance", description: "Finance rows" },
        ],
      }),
    };
  }) as unknown as typeof fetch;
});

describe("DataRolesPage", () => {
  it("renders data roles fetched from the proxy", async () => {
    render(<DataRolesPage />);
    expect(await screen.findByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("finance")).toBeInTheDocument();
  });

  it("creates a role via the modal (POST to the proxy)", async () => {
    render(<DataRolesPage />);
    await screen.findByText("Finance");

    fireEvent.click(screen.getByText("New role"));
    fireEvent.change(screen.getByPlaceholderText("e.g. finance_emea"), {
      target: { value: "ops" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Finance — EMEA"), {
      target: { value: "Ops" },
    });
    fireEvent.click(screen.getByText("Create role"));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/data-roles",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});
