import { CoastFireArticle } from "@/components/education/coast-fire-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "What is Coast FIRE?",
  description:
    "Learn how Coast FIRE works — and see when you could stop saving, personalized with your numbers.",
  path: "/education/coast-fire",
});

export default function CoastFirePage() {
  return <CoastFireArticle />;
}
