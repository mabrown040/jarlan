import { SpendingSmileArticle } from "@/components/education/spending-smile-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "The Retirement Spending Smile: Why Expenses Aren't Flat",
  description:
    "Research shows retirement spending follows a U-shaped 'smile' pattern — higher in active early years, dipping in mid-retirement, then rising again for healthcare late in life.",
  path: "/education/spending-smile",
});

export default function SpendingSmilePage() {
  return <SpendingSmileArticle />;
}
