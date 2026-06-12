/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConfidenceBadge } from "@/components/chat/ConfidenceBadge";

describe("ConfidenceBadge", () => {
  it('renders "High confidence" for values >= 0.85', () => {
    render(<ConfidenceBadge confidence={0.9} />);
    expect(screen.getByText("High confidence")).toBeInTheDocument();
  });

  it('renders "High confidence" at exactly 0.85', () => {
    render(<ConfidenceBadge confidence={0.85} />);
    expect(screen.getByText("High confidence")).toBeInTheDocument();
  });

  it('renders "Moderate — verify" for values >= 0.65 and < 0.85', () => {
    render(<ConfidenceBadge confidence={0.7} />);
    expect(screen.getByText(/Moderate/)).toBeInTheDocument();
  });

  it('renders "Low — try rephrasing" for values < 0.65', () => {
    render(<ConfidenceBadge confidence={0.4} />);
    expect(screen.getByText(/Low/)).toBeInTheDocument();
  });

  it('renders "Low" for zero confidence', () => {
    render(<ConfidenceBadge confidence={0} />);
    expect(screen.getByText(/Low/)).toBeInTheDocument();
  });

  it('renders "High confidence" for confidence of 1', () => {
    render(<ConfidenceBadge confidence={1} />);
    expect(screen.getByText("High confidence")).toBeInTheDocument();
  });
});
