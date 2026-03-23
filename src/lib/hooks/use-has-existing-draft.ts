import { useEffect, useState } from "react";
import { loadScenarioDraft } from "@/lib/db/database";

export function useHasExistingDraft() {
  const [hasDraft, setHasDraft] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadScenarioDraft().then((draft) => {
      if (!cancelled) {
        setHasDraft(draft !== null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { hasDraft, isChecking: hasDraft === null };
}
