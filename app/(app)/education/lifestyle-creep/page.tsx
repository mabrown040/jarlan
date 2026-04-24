import { LifestyleCreepArticle } from "@/components/education/lifestyle-creep-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Lifestyle Creep: How Rising Expenses Move Your FIRE Target",
  description:
    "When spending grows faster than inflation, your FIRE number grows too. Here's how lifestyle creep compounds over time — and how to model it honestly in your plan.",
  path: "/education/lifestyle-creep",
});

export default function LifestyleCreepPage() {
  return <LifestyleCreepArticle />;
}
