import { HsaTripleAdvantageArticle } from "@/components/education/hsa-triple-advantage-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "The HSA Triple Tax Advantage: The Best Account in FIRE",
  description:
    "Pre-tax contributions, tax-free growth, and tax-free withdrawals for medical costs. The HSA is the only account with all three — and most people massively underuse it.",
  path: "/education/hsa-triple-advantage",
});

export default function HsaTripleAdvantagePage() {
  return <HsaTripleAdvantageArticle />;
}
