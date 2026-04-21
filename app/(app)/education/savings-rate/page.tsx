import { SavingsRateArticle } from "@/components/education/savings-rate-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Savings Rate vs. Time to FI",
  description:
    "How your savings rate determines your path to financial independence — personalized with your numbers.",
  path: "/education/savings-rate",
});

export default function SavingsRatePage() {
  return <SavingsRateArticle />;
}
