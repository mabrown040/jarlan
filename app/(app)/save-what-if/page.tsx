import { Suspense } from "react";

import SaveWhatIfWorkspace from "@/components/save-what-if/save-what-if-workspace";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "What If?",
  description:
    "Stack life decisions — career break, lifestyle change, promotion, market downturn — and see how each one shifts your FIRE timeline.",
  path: "/save-what-if",
});

export default function SaveWhatIfPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading what-if analysis...</div>}>
      <SaveWhatIfWorkspace />
    </Suspense>
  );
}
