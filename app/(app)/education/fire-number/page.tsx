import { FireNumberArticle } from "@/components/education/fire-number-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "How Your FIRE Number Is Calculated",
  description:
    "The formula behind your FIRE number, where 25× comes from, how withdrawal rate and expenses interact, and why your number is a probability — not a guarantee.",
  path: "/education/fire-number",
});

export default function FireNumberPage() {
  return <FireNumberArticle />;
}
