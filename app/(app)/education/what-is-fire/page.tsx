import { WhatIsFireArticle } from "@/components/education/what-is-fire-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "What is FIRE? A Plain-English Primer on Financial Independence",
  description:
    "FIRE stands for Financial Independence, Retire Early. The acronym, the one idea behind it, and how this calculator approaches the math — without prescribing Lean or Fat.",
  path: "/education/what-is-fire",
});

export default function WhatIsFirePage() {
  return <WhatIsFireArticle />;
}
