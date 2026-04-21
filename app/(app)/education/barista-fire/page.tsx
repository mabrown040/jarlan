import { BaristaFireArticle } from "@/components/education/barista-fire-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "What is Barista FIRE?",
  description:
    "Learn how Barista FIRE works — part-time income, healthcare benefits, and a smaller portfolio target, personalized with your numbers.",
  path: "/education/barista-fire",
});

export default function BaristaFirePage() {
  return <BaristaFireArticle />;
}
