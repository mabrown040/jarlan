import { RothLadderArticle } from "@/components/education/roth-ladder-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "The Roth Conversion Ladder: Tax-Free Retirement Income Before 59½",
  description:
    "How to access your traditional 401(k) and IRA money before age 59½ without the 10% penalty — using a Roth conversion ladder.",
  path: "/education/roth-ladder",
});

export default function RothLadderPage() {
  return <RothLadderArticle />;
}
