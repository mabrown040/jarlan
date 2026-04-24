import { InvestmentFeesArticle } from "@/components/education/investment-fees-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "How Investment Fees Erode Your Portfolio Over Time",
  description:
    "A 1% annual fee sounds small. Over 30 years, it can cost you 25% of your final portfolio value. Here's the math on fee drag — and why expense ratios matter.",
  path: "/education/investment-fees",
});

export default function InvestmentFeesPage() {
  return <InvestmentFeesArticle />;
}
