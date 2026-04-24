/**
 * Pick the first scenario name in the `Base`, `Base (2)`, `Base (3)`, …
 * sequence that doesn't collide with an existing name. Used wherever
 * we suggest a default name for a new plan ("Save a copy", "Start a
 * blank plan", "Save as new plan from what-if"). Users can still type
 * whatever they want and accept duplicates if they really want to —
 * we only de-duplicate the *suggested* default.
 *
 * The suffix style matches macOS Finder's duplicate-rename convention,
 * which we found least surprising in user testing of the switcher
 * dropdown's autofill.
 */
export function suggestUniqueScenarioName(
  base: string,
  existingNames: Iterable<string>,
): string {
  const taken = new Set<string>();
  for (const n of existingNames) {
    if (n) taken.add(n);
  }
  const trimmed = base.trim() || "New plan";
  if (!taken.has(trimmed)) return trimmed;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${trimmed} (${i})`;
    if (!taken.has(candidate)) return candidate;
  }
  // If the user has 998 collisions they have bigger problems —
  // append a random suffix so we never return a name we already gave
  // out earlier in the same session.
  return `${trimmed} (${Math.floor(Math.random() * 100_000)})`;
}
