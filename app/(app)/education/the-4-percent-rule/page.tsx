import { FourPercentRuleArticle } from "@/components/education/four-percent-rule-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "The 4% Rule Explained: What It Is and When It Works",
  description:
    "The research behind the 4% safe withdrawal rate, where it comes from, and what the Trinity Study actually says about retirement spending.",
  path: "/education/the-4-percent-rule",
});

export default function FourPercentRulePage() {
  return <FourPercentRuleArticle />;
}
