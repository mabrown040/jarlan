import { GuytonKlingerArticle } from "@/components/education/guyton-klinger-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Guyton-Klinger Guardrails: A Flexible Withdrawal Strategy for Early Retirees",
  description:
    "How the Guyton-Klinger guardrail rules work, why they let you start with a higher withdrawal rate than 4%, and how to tune them for your situation.",
  path: "/education/guyton-klinger",
});

export default function GuytonKlingerPage() {
  return <GuytonKlingerArticle />;
}
