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
    label: "Cloud sync across devices",
    description:
      "Sign in once — scenarios auto-sync to your account so a plan started on your laptop is ready on your phone. Included in the free tier.",
    tier: "free",
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
      "Advanced decision support and scenario comparisons for people actively making retirement calls.",
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
  "/compare": "pro",
};

export function getRoutePlanBoundary(route: string) {
  return routePlanBoundaries[route] ?? "free";
}
