import { FireTypeQuiz } from "@/components/quiz/fire-type-quiz";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "FIRE Quiz",
  description:
    "Answer a few quick questions and get a personalized FIRE type, target number, and a clear next step. Tax-aware, state-aware, takes two minutes.",
  path: "/quiz",
});

export default function FireTypeQuizPage() {
  return <FireTypeQuiz />;
}
