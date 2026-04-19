# QA Round 3 — Edge Personas (lean + fat + young)

**Date:** 2026-04-19
**Scope:** Three personas at the edges of the dollar spectrum not covered in Round 2. Round 2 caught phase-aware UX issues; Round 3 is looking for math edge cases ($5M+ display formatting, tight-budget withdrawal sensitivity, 22yo horizon).

Process refinements from Round 2 retro:
- Expected values pinned before each walk
- Findings logged inline with severity tags (no compile-at-the-end)
- Mobile done as a final consolidated pass rather than per-persona
- Console watched per persona

## Personas under test

| Key | Source | Age | Retire | Income | Expenses | Retirement expenses | Portfolio | Why |
|-----|--------|-----|--------|--------|----------|---------------------|-----------|-----|
| `teacher` | QA fixture | 42 | 58 | $65K | $45K | $40K (lean-ish) | $80K (403b + taxable) | Tight budget, small portfolio, long horizon |
| `high-earner` | QA fixture | 45 | 55 | $550K | $200K | $180K | $2.55M across 4 accts | $5M+ FIRE number, complex accounts, 3.5% WR |
| `young-starter` | QA fixture | 22 | 45 | ? | ? | ? | ? | 23-year horizon, starting-out edge |

## Expected values (computed before walking)

### Teacher (lean-ish, TX, single, household 1)
- **FIRE number @ 4%:** $40K × (1.005)^16 / 0.04 = $43.3K / 0.04 ≈ **$1.08M**
- **Current portfolio:** $80K (7.4% of target — accumulation phase)
- **Planned contribution:** $10K/yr (403b only), no employer match in fixture
- **Take-home est:** $65K − federal (~$7K) − FICA (~$5K) − TX no state = **~$53K**
- **Implied savings:** $53K − $45K = $8K (but actual contribution is $10K — slightly higher, interesting case)
- **Years to FI at current pace:** rough — $80K × 1.05^N + $10K × ((1.05^N − 1)/0.05) = $1.08M. Solve: ~30 years.
- **Projected FI age:** 42 + 30 = **72**. That's **14 years past retire age 58**. Round 2 Fix 5 warning SHOULD fire.
- **Phase:** accumulation (portfolio < 50% FIRE)
- **WR test (FIRE target mode):** $40K/yr from $1.08M = 4% on the nose

### High Earner (fat, CA, married-joint, household 3)
- **FIRE number @ 3.5%:** $180K × (1.01)^10 / 0.035 = $199K / 0.035 ≈ **$5.69M**
- **Current portfolio:** $2.55M (45% of target — still accumulation-ish, maybe transition per phase logic since < 50%)
- **Planned contribution:** $39.05K explicit + $16.5K employer match (1% × $550K up to 3%) = **~$55.6K/yr**
- **Take-home est:** $550K − federal/state/FICA at CA HCOL rates ≈ $330K-ish
- **Years to FI:** rough — $2.55M × 1.06^N + $55K × ((1.06^N−1)/0.06) = $5.69M. Solve: ~11 years.
- **Projected FI age:** 45 + 11 = **56**. Retire age is 55, so **1 year past** — small warning should fire
- **WR at 3.5%:** non-default, confirms aggressive/conservative-WR copy variant

### Young Starter
- 22yo, single, CO, $55K income, $5K saved, $40K current spending, $35K retirement spending
- Retire target age 45 (aggressive), 7% real return, 1% creep
- **FIRE number:** $35K × 1.01^23 / 0.04 ≈ $44K / 0.04 = **$1.1M**
- **Projected FI:** $5K + $5K/yr contribs at 7% → ~34 years (age 56)
- **Expected:** Fix 5 warning fires (target 45 vs. projected 56 = 11 yrs past)

---

## Persona 1 — Teacher

**Seeded via QA modal.** Pill: $1.1M · 29 yrs — matches expected $1.08M, ~30 yrs.

### Findings

- **[UX] R3-1 Home hero still renders fractional "X.Y yrs away"** while the pill and Save card show integer. Home hero reads `28.4 yrs away` for Teacher vs. pill `29 yrs`. Tier 3 Fix 8 threaded `displayYearsToFi` through the pill and Save/What-if header but missed this Home hero line at [src/components/landing/quick-fire-workspace.tsx:475](src/components/landing/quick-fire-workspace.tsx). Same `formatYears(summary.yearsToFi)` pattern.

- **[COPY] R3-2 Expense-growth-rate label rounds 0.5% to "1%"** in the Tier 2 Fix 7 projected-spending sub-line. Teacher has `expenseGrowthRate: 0.005` — `formatPercent(0.005, 0)` returns "1%" because Intl's integer rounding lands 0.5 on 1 (round-half-up). Display reads "$43.3K/yr ($40K × **1%** real growth × 16 yrs)" but the truth is 0.5%. Need 1-decimal precision on the growth rate label.

- **[✓] Fix 5 warning fires correctly for lean-FIRE target mismatch.** "⚠ Target retirement age 58 is 13 yrs before projected FI (age 71). Raise savings or push the target." Exactly the signal a lean-FIRE user with an aspirational age needs.

- **[✓] Invested $10K / 18% of take-home** — honest against $55.4K take-home, "You invest 4× more than most Americans." Framing works at this income level.

- **[OBS] "Best" drawdown flagged on a $0-ending strategy.** All three drawdown strategies show `Ending balance: $0` for the Teacher's $80K portfolio vs. $40K spending — unavoidable given the gap — but "Best" is still flagged on the lowest-tax failure. Arguably misleading ("Best" implies the plan works). Low-priority: only surfaces for underfunded users who will also see the accumulation banner telling them they aren't retirement-ready.

---

## Persona 2 — High Earner HCOL

**Seeded via QA modal.** Pill: $5.7M · 9 yrs — matches expected $5.69M; years shorter (9 vs. estimated 11) because `annualSavings` auto-syncs to $130K (taxable brokerage absorbs the remainder) plus $16.5K match.

### Findings

- **[UX] R3-3 "Top 89%" peer comparison is confusing for bottom-half users.** Young Starter sees "Top 89% for age 22 · Median $39K" with only $5K saved. "Top X%" colloquially reads as "in the top X percent" → elite. The code does `Top {100 - percentile}%`, so `percentile = 11` becomes `Top 89%`. Mathematically correct but user-hostile at the low end. Suggest flipping to "Ahead of {percentile}%" which scales cleanly at both ends ("Ahead of 11%" vs. "Ahead of 91%"). Applies across all personas; flagged here because Young Starter is where it reads worst.

- **[✓] Roth ladder handles post-60 high-balance scenario correctly.** Total conversions $800K over ages 55-64, capped at the traditional balance. Description copy matches Tier 3 Fix 11.

- **[✓] Accumulation banner shows for mid-funded pre-retiree.** Portfolio at 45% of FIRE → phase classifier returns `accumulation` → "Still building" banner on Retirement Checkup. Correct per the phase threshold (<50% of FIRE). For a 45yo with $2.55M saved, arguably the app is being cautious; debatable whether 45% should read as "accumulation" or "transition", but the threshold is a load-bearing Tier 1 behavior — leave it.

- **[OBS] Social Security defaults unused for this persona.** Married-joint HCOL shows "Claim at 62: $22,800 annual benefit" — the same default as Single Teacher. Fixture doesn't customize SS benefits. Would need the user to enter their SSA statement. No spousal benefit modeling visible on Income plan. Out of scope for this QA round — a real feature gap, not a regression.

### Mobile pass
- $5.7M / $372.9K / $146.5K / $177.1K all fit within mobile tile width at 375px. No overflow.

---

## Persona 3 — Young Starter

**Seeded via QA modal.** Pill: $1.1M · 34 yrs — matches expected $1.1M, ~34 yrs at 7% real, $5K/yr contribs.

### Findings
- Fix 5 warning fires: "⚠ Target retirement age 45 is 11 yrs before projected FI (age 56). Raise savings or push the target." — correct signal for an aspirational 22yo.
- Fix 7 sub-line shows "$44K/yr ($35K × 1% real growth × 23 yrs)" — `expenseGrowthRate: 0.01` so the "1%" display is accurate here (unlike Teacher's 0.5% misdisplay).
- INVESTED 11.1% of take-home at $5K/yr — honest framing, no phantom inflation.
- Home hero "33.7 yrs away" — R3-1 repeats.
- "Top 89% for age 22" — R3-3 repeats (triggered here).

### Mobile pass
- Clean stacking at 375px.

---

## Console sweep

- `scroll-behavior` warnings absent after Tier 3 Fix 12 took effect.
- `DialogContent` a11y warnings still present (pre-existing, 26 repeats during a session). Adding `<DialogDescription>` to the drawer would clear these. Not a user-facing bug but clean-up fodder.

---

## Summary — what to ship next

Compact Tier 4 PR (3 findings):

| # | Fix | Severity | Scope |
|---|-----|----------|-------|
| R3-1 | Home hero uses integer years via `displayYearsToFi` | UX | 1 line in `quick-fire-workspace.tsx:475` |
| R3-2 | Expense growth rate label gets 1-decimal precision | Copy | `formatPercent(rate, 1)` in the projected-spending sub-line |
| R3-3 | "Top X%" → "Ahead of X%" for peer comparison | UX | 1 line in `quick-fire-workspace.tsx:587` |

All three are surface-level display fixes. Pure math is clean. No new bugs in any of the Tier 1/2/3 work (personas all render correctly; fixes hold).

## Backlog (unchanged from Round 2)

- Sankey "Savings" node vs "Invested" tile conflict (model-level fix, separate session)
- Social Security per-scenario customization (spousal benefits, SSA statement entry) — real feature
- "Best drawdown" flagged on $0-ending strategies for underfunded users — minor
- DialogContent a11y descriptions — small cleanup

