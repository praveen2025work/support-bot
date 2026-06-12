import type { LucideIcon } from "lucide-react";
import { Database, Sparkles, Search, HelpCircle } from "lucide-react";

export type LandingChip = {
  label: string;
  command: string;
  description: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for the static landing-page starter chips, shared by
 * ChatWelcome (Quick actions) and MessageList (empty-state starter cards).
 *
 * Kept deliberately generic — no group-specific query names — so it stays
 * correct across every group's catalog. A hardcoded query name (the old
 * "run monthly_revenue") is a drift orphan for any group whose registry
 * doesn't contain it.
 */
export const LANDING_CHIPS: LandingChip[] = [
  {
    label: "List queries",
    command: "list queries",
    description: "See all available queries you can run",
    icon: Database,
  },
  {
    label: "Run a query",
    command: "run a query",
    description: "Execute a saved query and see live results",
    icon: Sparkles,
  },
  {
    label: "Search docs",
    command: "search docs for...",
    description: "Search for relevant links and docs",
    icon: Search,
  },
  {
    label: "Get help",
    command: "help",
    description: "Learn what I can do and see examples",
    icon: HelpCircle,
  },
];
