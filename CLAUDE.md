# CLAUDE.md — Working notes for AI collaborators

This file is for Claude / other AI agents contributing to FIRECALC. Read `README.md` first for human-facing setup and the product-level architecture map. This file adds the engineering context those docs skip: what matters most, the invariants that must hold, and the traps that will bite you.

## Mental model

FIRECALC is a research-backed FIRE (Financial Independence, Retire Early) planner. Three pillars, in order of non-negotiability:

1. **Every value shown to the user must be true.** Users make six- and seven-figure life decisions on these numbers. A bug that silently produces wrong math is worse than a crash — the user can't tell something went wrong. The accuracy suite exists because of this.
2. **Local-first, privacy-preserving.** The app must work with zero network and zero configured services. Supabase + Stripe are additive, not required. Every optional integration degrades gracefully to a disabled state, never to a broken one.
3. **Show your work.** Educational content links to primary research (Bengen 1994, Trinity 1998, Shiller, SSA). When the app simplifies, it says so. See the "Data vintage" callout in [four-percent-rule-article.tsx](src/components/education/four-percent-rule-article.tsx).

If a change would violate one of these, escalate — don't ship around it.

## Directory map

| Path | Purpose | Allowed to import from |
|---|---|---|
| `app/` | Next.js App Router routes. Server components by default; client only when needed. | `src/components/**`, `src/lib/**` |
| `app/(app)/` | Route group for the signed-in/workspace surface. Has its own `loading.tsx` + `error.tsx`. | same |
| `app/api/` | Route handlers. Stripe + Supabase + auth callback. Rate-limited where user-facing. | `src/lib/**` |
| `src/components/` | React components. One directory per feature/domain. Every interactive file starts with `"use client"`. | `src/components/**`, `src/lib/**` |
| `src/lib/calc/` | **Pure** calculation functions. No `Date.now()`, no `Math.random()`, no I/O. This is the math layer. | `src/lib/domain/**`, `src/lib/utils`, data |
| `src/lib/sim/` | Historical backtest + Monte Carlo + withdrawal strategies. MC accepts injected RNG for determinism. | `src/lib/calc/**`, `src/lib/data/**` |
| `src/lib/tax/` | Federal/state tax + FICA + ACA subsidy calc. | data, `src/lib/utils` |
| `src/lib/domain/` | Scenario type + Zod schema + versioned migrations. Single source of truth for the scenario shape. | — |
| `src/lib/store/` | Zustand stores. `use-scenario-store` is the monolith; display preferences + drawer are sliced. | `src/lib/**` |
| `src/lib/supabase/` | Cloud sync + auth helpers. Server and browser variants are separate files. | `src/lib/domain/**` |
| `src/lib/sim/__tests__/`, `src/lib/calc/__tests__/`, etc. | Unit tests (Vitest, jsdom). Run via `npm test`. | — |
| `src/lib/__tests__/accuracy/` | Golden-file + cross-validation + property tests. Run via `npm run test:accuracy`. | — |
| `data/` | Hand-curated datasets. Every file stamped with `year`, `source`, `methodology`. | — |
| `scripts/data/` | Data fetchers. Today: `fetch_shiller.mjs`. | — |
| `docs/` | Long-form design/history docs. Use for context, not for rules. | — |

**Layering rule:** a `src/lib/calc/` file can't import from `src/components/` or `src/lib/store/`. Calc is below UI and state. If you ever want to do this, the logic belongs somewhere else (a hook, the store, or a feature folder).

## The Scenario — central domain object

Everything revolves around `Scenario` (see [types.ts](src/lib/domain/types.ts) + [schema.ts](src/lib/domain/schema.ts)). It's the input to every calc function and the single thing Zustand/Dexie/Supabase persist.

- **Versioned.** Current is `schema_ver: 2`. Migrations live in [migrations.ts](src/lib/domain/migrations.ts). If you change the scenario shape, you MUST: bump the version, add a `vN_to_vN+1` migration, add a test in [migrations.test.ts](src/lib/domain/__tests__/migrations.test.ts).
- **Always parsed through `parseScenario`** when arriving from any external surface: URL params, localStorage, Supabase rows, Dexie reads, sharing links. Never cast `as Scenario` on untrusted data. Cloud sync does this ([sync.ts](src/lib/supabase/sync.ts)) — copy the pattern.
- **Invariants are testable.** See `assertScenarioInvariants` in [scenario-invariants.accuracy.ts](src/lib/__tests__/accuracy/scenario-invariants.accuracy.ts). When adding a scenario-mutating code path (quiz builder, life decision, what-if rescale), add a test that runs its output through `assertScenarioInvariants`. The "quiz showed $80K save / $150K spend but take-home was $259K" bug lived exactly in this seam — don't let it grow back.

## Canonical helpers — use these, don't re-derive

Re-deriving core math in components is the #1 source of silent bugs. The drift risk is invisible until users complain.

| Instead of | Use |
|---|---|
| `fireNumber / (1 + r) ** years` | `calculateCoastTarget()` from `@/lib/calc` |
| `expected - feeDrag` | `getEffectiveRealReturn(scenario)` |
| `expenses / withdrawalRate` | `calculateFireNumber()` |
| `Math.round(yearsToFi)` or `yearsToFi.toFixed(1)` | `formatYearsToFi(value)` |
| `Math.round(fireAge)` | `formatFireAge(value)` |
| `(value * 100).toFixed(0)%` | `formatPercent(value)` |
| `Intl.NumberFormat(...).format(v)` for currency | `formatCurrency()` / `formatCompactCurrency()` |
| `JSON.parse(row.data) as Scenario` | `parseScenario(row.data)` (returns `Scenario \| null`) |

Every one of these has a regression test pinning the invariant. If you find you need a helper that doesn't exist, add it to `src/lib/calc/format.ts` or the relevant calc module — don't inline it.

## Testing

Two suites, two configs, different cadences:

- `npm test` → unit tests, jsdom env, **runs on every PR + main push via [.github/workflows/test.yml](.github/workflows/test.yml)**. Also runs `typecheck` + `lint`.
- `npm run test:accuracy` → golden-file + external cross-validation + scenario invariants. Runs weekly + on PRs touching `calc`/`sim`/`tax`/`data` via [.github/workflows/accuracy.yml](.github/workflows/accuracy.yml).

**Monte Carlo determinism.** `runMonteCarloSimulation` accepts `options.rng`. Production calls use `Math.random` (correct — users want fresh paths). **Every test MUST pass `createSeededRng(seed)`** from [seeded-rng.ts](src/lib/__tests__/accuracy/_fixtures/seeded-rng.ts). Unseeded tests are flaky by construction.

**Adding a test for a new user-visible number.** Use the `golden()` helper ([golden.ts](src/lib/__tests__/accuracy/_fixtures/golden.ts)):

```ts
golden("module.metric-id", {
  input: { /* scenario params */ },
  expected: 1_350_000,
  actual: calculateThing(...),
  tolerance: 0,
  methodology: "expenses / WR per Bengen (1994)",
});
```

The methodology field is not decorative — it explains *why* the number is right. Future-you will thank present-you.

## Data files — provenance is the product

Every file in `data/` must have: `year` (or `startDate`/`endDate`), `source` with URL, `methodology`, `refreshCadence`. If any of those are missing, the file doesn't ship. See [mortality.json](data/mortality.json) or [state_taxes.json](data/state_taxes.json) for the pattern.

**Known constraints (2026-04):**
- Shiller upstream is frozen at 2023-09. Yale hasn't published newer. Documented in [manifest.json](data/manifest.json). If this becomes user-facing staleness, the fix is either wait, write a FRED-based fetcher, or splice in a secondary source.
- State tax rates are effective-rate approximations for ~80-90th-percentile earners, not brackets. CA/NY/NJ high earners see materially higher. Documented in [state_taxes.json](data/state_taxes.json).
- ACA premium table is a six-state sample + national default. Fine for subsidy order-of-magnitude; not a replacement for healthcare.gov.

Don't remove the `year`/`source` fields to "simplify" the JSON. They're load-bearing.

## Traps that will bite you

- **Don't bypass `parseScenario` on external input.** A corrupt cloud row silently becomes client state, and the math lies. The pattern is in [sync.ts](src/lib/supabase/sync.ts).
- **Don't add `Date.now()` to calc code.** Tests become flaky and time-dependent. Pass the date as a parameter.
- **Don't `Math.random()` in calc or sim code.** Production: inject the default. Tests: pass a seeded RNG.
- **Don't silently swallow errors in cloud sync.** The existing pattern warns via `console.warn` and returns a status. If you're tempted to `.catch(() => null)` in a mutation path, that's probably a bug — the user needs to know.
- **Don't re-express the coast / FIRE number / effective return formulas inline.** See the canonical helpers table above. The accuracy suite has a regression test ([accumulation.accuracy.ts](src/lib/__tests__/accuracy/accumulation.accuracy.ts): "coast target from quick-fire summary matches coast target from fire types") to catch drift — it's there because it happened.
- **Don't add a feature flag or "backwards-compat shim" unless there's a real migration path in progress.** Dead flags accumulate.
- **Don't commit `.env.local`** (it's gitignored, but worth saying). Real keys go in the deploy env, not the repo.
- **Don't skip `"use client"` audits when adding a page.** A page with `"use client"` at the top drags every child to the client and inflates the bundle. The default is server; add `"use client"` at the lowest interactive boundary.

## Common tasks — quick recipes

**Adding a new FIRE type** (alongside Traditional/Lean/Fat/Coast/Barista):
1. Add the id to `FireTypeSummary['id']` union in [types.ts](src/lib/domain/types.ts).
2. Add the calc in [fire-types.ts](src/lib/calc/fire-types.ts). Use `calculateFireNumber` and (if discounting) `calculateCoastTarget`.
3. Add a golden test in [accumulation.accuracy.ts](src/lib/__tests__/accuracy/accumulation.accuracy.ts).
4. Update the UI (look at how existing Coast / Barista cards render).

**Adding a new education article** (under `/education/...`):
1. Copy an existing one — [four-percent-rule-article.tsx](src/components/education/four-percent-rule-article.tsx) is the exemplar.
2. Create the route at `app/(app)/education/<slug>/page.tsx` — server component wrapping the client article.
3. Add to the article index in [learn-content-audit.md](docs/learn-content-audit.md) if tracking.
4. If the article cites hardcoded stats, put them in a named const with a citation comment. Add a "Data vintage" callout if the research is >5 years old.

**Bumping the Scenario schema** (e.g., adding a new required field):
1. Add the field to `scenarioSchema` in [schema.ts](src/lib/domain/schema.ts) with a sensible default.
2. Bump `SCENARIO_SCHEMA_VERSION` and add a `v2_to_v3` migration in [migrations.ts](src/lib/domain/migrations.ts).
3. Add a round-trip test in [migrations.test.ts](src/lib/domain/__tests__/migrations.test.ts).
4. Remember: cloud scenarios stored as JSON will arrive as v2 until they're re-synced. Your migration is the gate.

**Refreshing a data file:**
1. If there's a fetcher (`scripts/data/fetch_shiller.mjs`), run it: `npm run data:fetch:shiller`.
2. Update `year` / `lastReviewed` / `endDate` on the file + `manifest.json`.
3. Re-run `npm run test:accuracy`. Pinned values may shift — review the deltas and update the golden expectations with a note in the methodology field explaining what changed.

## When in doubt — where to look

- "How should this calc behave on edge X?" → existing golden test or `scenario-invariants.accuracy.ts`.
- "What's the scenario shape?" → [schema.ts](src/lib/domain/schema.ts).
- "How does the store work?" → [use-scenario-store.ts](src/lib/store/use-scenario-store.ts). Monolithic; read top-down.
- "What are the invariants?" → `assertScenarioInvariants` in [scenario-invariants.accuracy.ts](src/lib/__tests__/accuracy/scenario-invariants.accuracy.ts).
- "How do I cite research?" → [four-percent-rule-article.tsx](src/components/education/four-percent-rule-article.tsx) "Data vintage" callout.
- "How does cloud sync work?" → [cloud-sync.md](docs/cloud-sync.md).
- "How does quiz → scenario mapping work?" → [quiz-input-mapping.md](docs/quiz-input-mapping.md).

## Session history (short)

Recent polish sweeps (2026-04):
- Security: rate limits on Stripe routes, webhook idempotency via `stripe_webhook_events` table, auth-callback open-redirect fix, CSP-adjacent headers, 512KB cap on scenario decompress.
- Correctness: Coast formula dedup, `parseScenario` on Supabase reads, `formatYearsToFi` / `formatFireAge` canonical helpers, accuracy regression test for coast-formula invariance, unit tests in CI on every push.
- Data: stamped every data file with year/source/methodology; Trinity article vintage disclosure; Shiller upstream freeze documented.
- Perf: dynamic import of home-page charts, `app/(app)/loading.tsx`, route-group error boundary.

The accuracy suite (119 golden tests) is your primary safety net. When in doubt, add a test.
