import { EducationWorkspace } from "@/components/education/education-workspace";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Learn",
  description:
    "The math behind FIRE, explained clearly. Savings-rate dynamics, Coast FIRE vs. Barista FIRE, withdrawal strategies, and what the research actually says.",
  path: "/education",
});

export default function EducationPage() {
  return <EducationWorkspace />;
}
