import { SavingsRateArticle } from "@/components/education/savings-rate-article";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Savings Rate vs. Time to FI | Calcifer",
  description: "How your savings rate determines your path to financial independence — personalized with your numbers.",
};

export default function SavingsRatePage() {
  return <SavingsRateArticle />;
}
