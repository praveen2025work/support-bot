/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DisambiguationChips } from "@/components/chat/SuggestionChips";
import type { DisambiguationCandidate } from "@/hooks/useChat";

// next/link renders a plain anchor under test.
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const candidates: DisambiguationCandidate[] = [
  { intent: "query.execute", queryName: "budget_vs_actual", score: 0.58 },
  { intent: "query.execute", queryName: "pnl_lineage", score: 0.42 },
];

describe("DisambiguationChips", () => {
  it("renders a confidence-percent badge per candidate", () => {
    render(<DisambiguationChips candidates={candidates} onSelect={() => {}} />);
    const badges = screen.getAllByTestId("disambiguation-confidence");
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent("58% match");
    expect(badges[1]).toHaveTextContent("42% match");
  });

  it("omits the badge when a candidate has no finite score", () => {
    render(
      <DisambiguationChips
        candidates={[
          {
            intent: "query.execute",
            score: Number.NaN,
          } as DisambiguationCandidate,
        ]}
        onSelect={() => {}}
      />,
    );
    expect(screen.queryByTestId("disambiguation-confidence")).toBeNull();
  });

  it("renders a prefilled 'Create a new query' link when newQueryUtterance is set", () => {
    render(
      <DisambiguationChips
        candidates={candidates}
        onSelect={() => {}}
        newQueryUtterance="show me regional revenue"
      />,
    );
    const link = screen.getByTestId("disambiguation-new-query");
    expect(link).toHaveAttribute(
      "href",
      "/admin/intents?prefill=show%20me%20regional%20revenue",
    );
  });

  it("hides the new-query affordance when no utterance is provided", () => {
    render(<DisambiguationChips candidates={candidates} onSelect={() => {}} />);
    expect(screen.queryByTestId("disambiguation-new-query")).toBeNull();
  });

  it("still calls onSelect with the candidate when a chip is clicked", () => {
    const onSelect = jest.fn();
    render(<DisambiguationChips candidates={candidates} onSelect={onSelect} />);
    screen.getAllByTestId("disambiguation-chip")[0].click();
    expect(onSelect).toHaveBeenCalledWith(candidates[0]);
  });
});
