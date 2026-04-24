import { FatFireArticle } from "@/components/education/fat-fire-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "What Is Fat FIRE? High-Income Early Retirement Explained",
  description:
    "Fat FIRE means retiring early with enough to spend $100K+ a year — without cutting your lifestyle. Here's the math, the tradeoffs, and whether it's right for you.",
  path: "/education/fat-fire",
});

export default function FatFirePage() {
  return <FatFireArticle />;
}
