import { LeanFireArticle } from "@/components/education/lean-fire-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "What Is Lean FIRE? Early Retirement on a Frugal Budget",
  description:
    "Lean FIRE means retiring early on $25,000–$40,000 a year. Here's how the math works, what you give up, and why many people choose it anyway.",
  path: "/education/lean-fire",
});

export default function LeanFirePage() {
  return <LeanFireArticle />;
}
