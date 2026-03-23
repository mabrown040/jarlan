import { Suspense } from "react";

import SaveWhatIfWorkspace from "@/components/save-what-if/save-what-if-workspace";

export default function SaveWhatIfPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading what-if analysis...</div>}>
      <SaveWhatIfWorkspace />
    </Suspense>
  );
}
