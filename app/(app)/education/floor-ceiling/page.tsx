import { FloorCeilingArticle } from "@/components/education/floor-ceiling-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Floor & Ceiling Withdrawal Strategy: Spend Flexibly With Guardrails",
  description:
    "The floor-ceiling rule lets you spend more in good markets and less in bad ones — without the volatility of pure percentage withdrawals or the rigidity of the 4% rule.",
  path: "/education/floor-ceiling",
});

export default function FloorCeilingPage() {
  return <FloorCeilingArticle />;
}
