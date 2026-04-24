import { AcaEarlyRetirementArticle } from "@/components/education/aca-early-retirement-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "ACA Health Insurance for Early Retirees: What You Need to Know",
  description:
    "How to get affordable health insurance before Medicare at 65 — using ACA marketplace subsidies, MAGI management, and the income cliff strategy.",
  path: "/education/aca-early-retirement",
});

export default function AcaEarlyRetirementPage() {
  return <AcaEarlyRetirementArticle />;
}
