import { SequenceOfReturnsArticle } from "@/components/education/sequence-of-returns-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Sequence of Returns Risk Explained",
  description:
    "Why the order of market returns matters more than the average — and how to protect your retirement portfolio.",
  path: "/education/sequence-of-returns",
});

export default function SequenceOfReturnsPage() {
  return <SequenceOfReturnsArticle />;
}
