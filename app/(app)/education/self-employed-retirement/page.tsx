import { SelfEmployedRetirementArticle } from "@/components/education/self-employed-retirement-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "SEP-IRA and Solo 401(k) for Self-Employed FIRE Savers",
  description:
    "Self-employed workers can contribute far more to retirement accounts than W-2 employees. Here's how the SEP-IRA and Solo 401(k) work — and which is better for FIRE.",
  path: "/education/self-employed-retirement",
});

export default function SelfEmployedRetirementPage() {
  return <SelfEmployedRetirementArticle />;
}
