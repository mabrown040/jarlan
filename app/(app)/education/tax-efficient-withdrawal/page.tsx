import { TaxEfficientWithdrawalArticle } from "@/components/education/tax-efficient-withdrawal-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Tax-Efficient Withdrawal Sequencing for FIRE Retirees",
  description:
    "How to draw from taxable, traditional, and Roth accounts in the right order to minimize lifetime taxes — including bracket-filling, capital gains harvesting, and RMD management.",
  path: "/education/tax-efficient-withdrawal",
});

export default function TaxEfficientWithdrawalPage() {
  return <TaxEfficientWithdrawalArticle />;
}
