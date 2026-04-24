import { CapeRatioArticle } from "@/components/education/cape-ratio-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "The CAPE Ratio: How Market Valuation Affects Safe Withdrawal Rates",
  description:
    "Shiller's cyclically adjusted P/E ratio predicts retirement outcomes better than any single-year metric. Here's how it works and why CAPE-based withdrawals beat the static 4% rule.",
  path: "/education/cape-ratio",
});

export default function CapeRatioPage() {
  return <CapeRatioArticle />;
}
