import { SocialSecurityTimingArticle } from "@/components/education/social-security-timing-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "When to Claim Social Security: Age 62 vs 67 vs 70",
  description:
    "The claiming age decision is worth hundreds of thousands of dollars. Here's how to calculate your break-even, understand the tradeoffs, and make the right call for your situation.",
  path: "/education/social-security-timing",
});

export default function SocialSecurityTimingPage() {
  return <SocialSecurityTimingArticle />;
}
