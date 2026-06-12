/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import IntentBuilderPage from "@/app/admin/intents/page";

let searchParamsValue = new URLSearchParams("");
jest.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsValue,
}));

beforeEach(() => {
  // fetchData() resolves to an empty intents/entities payload.
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ intents: [], entities: {} }),
  })) as unknown as typeof fetch;
});

describe("Intents editor prefill", () => {
  it("opens the New Intent form pre-seeded from ?prefill", async () => {
    searchParamsValue = new URLSearchParams("prefill=show me revenue");
    render(<IntentBuilderPage />);

    const textarea = await screen.findByDisplayValue("show me revenue");
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).tagName.toLowerCase()).toBe(
      "textarea",
    );
  });

  it("does not auto-open the New Intent form without a prefill", async () => {
    searchParamsValue = new URLSearchParams("");
    render(<IntentBuilderPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText("Training Phrases (one per line)")).toBeNull();
  });
});
