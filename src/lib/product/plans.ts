export type SubscriptionPlan = "free" | "pro";
export type BillingCycle = "monthly" | "yearly";

export interface ProductFeature {
  id: string;
  label: string;
  description: string;
  tier: SubscriptionPlan;
}

export const productFeatures: ProductFeature[] = [
  {
    id: "quick_fire",
    label: "Quick FIRE calculator and quiz",
    description:
      "Landing calculator, FIRE type quiz, accumulation basics, and shareable URLs stay free so the top of the funnel remains useful.",
    tier: "free",
  },
  {
    id: "withdrawal_lab",
    label: "Withdrawal lab and retirement readiness",
    description:
      "Historical backtesting, Monte Carlo, and the unified retirement-readiness snapshot remain in the generous free tier.",
    tier: "free",
  },
  {
    id: "education",
    label: "Education hub and source-linked defaults",
    description:
      "Glossary, defaults, and research explanations remain open so the app keeps earning trust before asking for an upgrade.",
    tier: "free",
  },
  {
    id: "tax_strategy",
    label: "Tax strategy workspace",
    description:
      "Roth ladders, ACA coordination, and drawdown sequencing are packaged as Pro decision-support tools.",
    tier: "pro",
  },
  {
    id: "scenario_lab",
    label: "Scenario lab and comparative planning",
    description:
      "Multi-scenario what-if analysis, sensitivity views, and one-more-year comparisons are positioned as Pro workflow accelerators.",
    tier: "pro",
  },
  {
    id: "cloud_sync",
    label: "Account-backed cloud sync",
    description:
      "Signed-in Pro accounts can queue scenarios for remote sync while the local-first browser draft continues to work offline.",
    tier: "pro",
  },
  {
    id: "print_reports",
    label: "Printable decision snapshots",
    description:
      "Polished, partner-shareable review snapshots are part of the Pro handoff layer for advisors, partners, and influencers.",
    tier: "pro",
  },
];

export const planSummaries = {
  free: {
    name: "Free",
    headline: "Generous by design",
    priceMonthly: 0,
    priceYearly: 0,
    description:
      "Fast answers, transparent defaults, and the core retirement-readiness workflow stay accessible without creating an account.",
  },
  pro: {
    name: "Pro",
    headline: "For serious planning and annual reviews",
    priceMonthly: 12,
    priceYearly: 96,
    description:
      "Advanced decision support, scenario comparisons, and cloud-backed scenario continuity for people actively making retirement calls.",
  },
} as const;

export const routePlanBoundaries: Record<string, SubscriptionPlan> = {
  "/": "free",
  "/quiz": "free",
  "/accumulation": "free",
  "/withdrawal": "free",
  "/education": "free",
  "/pricing": "free",
  "/account": "free",
  "/tax-strategy": "pro",
  "/scenario-lab": "pro",
};

export function getRoutePlanBoundary(route: string) {
  return routePlanBoundaries[route] ?? "free";
}
