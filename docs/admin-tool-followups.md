# Admin tool — follow-ups

Issues surfaced while testing `/admin/scenario-from-text` that **aren't** about the AI extraction itself. Tracked here so they don't get lost; will be split into focused PRs once the admin tool flow is stable.

Format: each item has enough context to act on cold. Add new items to **Open** as they surface. When fixed, move to **Fixed** with the PR/commit reference and date.

---

## Open

(none — pull from the recap doc as new ones surface)

---

## Fixed

### Stat-card vs. Sankey savings disagreement

**Originally diagnosed as:** The "Saving" stat card on `/accumulation` reads `scenario.annualSavings` directly while the Sankey computes `takeHome − annualExpenses`, so the two could disagree when `annualSavings` was a stale or default value.

**What it actually was** (after digging into the code): the stat card reads `plannedInvestmentContribution` — the sum of `accounts[*].annualContribution + employer match`. That's deliberately distinct from the Sankey's `takeHome − annualExpenses` ("theoretical-max savings"). The original stat card *was* `takeHome − annualExpenses` and was changed because that figure read as misleadingly high — the operator's intent was "actual flow into accounts", not "everything you could save."

The 42F test scenario showed `Saving: $0/yr` because the AI returned `annualSavings: null` and the mapper left `accounts[0].annualContribution` at zero. The Sankey's `takeHome − annualExpenses = $237K` was correct for the working-state model. Both views are valid views of different things; they just disagree visibly when extraction doesn't fill in account contributions.

**Fix landed:** in `src/lib/ai/scenario-from-extraction.ts`, when the AI returns `annualSavings: null`, the mapper now derives the value from `estimateScenarioTax(scenario).takeHome − annualExpenses` and propagates to both `scenario.annualSavings` and `accounts[0].annualContribution`. Result: stat card and Sankey agree on a single number for AI-generated scenarios. Explicit `annualSavings: 0` (user about to retire) is preserved — only `null` triggers derivation.

Three new unit tests cover: derived path on null savings, explicit savings preserved, explicit zero preserved.

**Out of scope of this fix:** the "soon-to-retire" UX issue where `takeHome − annualExpenses` overstates real savings (because the user isn't going to keep working). The current dashboard models the working phase; retirement-phase modeling is a different surface. If a Reddit OP about to RE produces a `takeHome − annualExpenses` figure that feels wrong, the operator should manually zero out the savings before sharing.

**Commit:** [TBD — fills in on merge]
