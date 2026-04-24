import { MonteCarloArticle } from "@/components/education/monte-carlo-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Monte Carlo vs. Historical Backtest: How Retirement Simulations Work",
  description:
    "What 'Monte Carlo simulation' actually means for retirement planning, how it compares to historical backtesting, and how to read success rates.",
  path: "/education/monte-carlo",
});

export default function MonteCarloPage() {
  return <MonteCarloArticle />;
}
