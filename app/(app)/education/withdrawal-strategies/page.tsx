import { WithdrawalStrategiesArticle } from "@/components/education/withdrawal-strategies-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "How to choose a withdrawal strategy",
  description:
    "Compare fixed real, guardrails, VPW, RMD, floor-and-ceiling, and spending-smile rules with an interactive guide built around your plan.",
  path: "/education/withdrawal-strategies",
});

export default function WithdrawalStrategiesPage() {
  return <WithdrawalStrategiesArticle />;
}
