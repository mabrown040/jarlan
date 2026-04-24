import { RealVsNominalReturnsArticle } from "@/components/education/real-vs-nominal-returns-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Real vs. Nominal Returns: Why Inflation Changes Everything",
  description:
    "Nominal returns are what you see in your account. Real returns are what you can actually buy. Understanding the difference is foundational to any FIRE plan.",
  path: "/education/real-vs-nominal-returns",
});

export default function RealVsNominalReturnsPage() {
  return <RealVsNominalReturnsArticle />;
}
