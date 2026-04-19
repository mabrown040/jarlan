# QA Round 2 — Multi-Persona Walkthrough

**Date:** 2026-04-18
**Scope:** Three personas representing the doc's priority tiers (couple, pre-retiree, retiree). Desktop + mobile on every page. Console watched for errors. Expected values pinned before each walk so findings are pass/fail, not vibe checks.

## Personas under test

| Key | Source | Age | Retire | Income | Expenses | Portfolio | Why |
|-----|--------|-----|--------|--------|----------|-----------|-----|
| `dual-income` | QA fixture | 35 (P1) / 33 (P2) | 50 | $300K combined | $80K | $390K across 4 accts | Partner income, joint filing, household income logic |
| `almost-fire` | QA fixture | 48 | 50 | $150K | $50K | $1.8M across 3 accts | Pre-retiree stress-tests the Spend module |
| `retired` | QA fixture | 65 | 65 | $0 | $60K | $2.0M across 3 accts | Drawdown phase, retirement checkup, CAPE guidance |

## Expected values per persona (computed before walking)

### Dual Income
- **Household income:** $180K primary + $120K partner = $300K
- **FIRE number @ 4% WR:** $70K / 0.04 = $1.75M (uses retirementExpenses, not current)
- **Current portfolio:** $150K + $80K + $60K + $100K = **$390K** (22% of $1.75M)
- **Employer match (primary):** 50% up to 6% of $180K → 50% × min($23.5K, $10.8K) = $5.4K
- **Employer match (partner):** 100% up to 3% of $120K → 100% × min($23.5K, $3.6K) = $3.6K
- **Years to FI at current pace:** rough — contributions $68K/yr + match $9K = $77K/yr, plus 6% real return. Hand-check: 15 years (matches retireAge - age = 15).
- **Phase:** accumulation (portfolio < 50% of FIRE, net saving)

### Almost FIRE
- **FIRE number @ 4% WR:** $50K / 0.04 = **$1.25M**
- **Current portfolio:** $600K + $300K + $900K = **$1.8M (144% of FIRE)** — already past FI number
- **Phase:** withdrawal-ready (portfolio >> FIRE, 2 years out)
- **Expected verdict on "Can I retire?":** strong green — historical success should be 95%+ with $1.8M/$50K
- **Savings rate:** ~20% ($30K saved / $150K gross)

### Already Retired
- **FIRE number @ 4% WR:** $60K / 0.04 = **$1.5M**
- **Current portfolio:** $800K + $400K + $800K = **$2.0M (133% of FIRE)**
- **Current withdrawal rate:** $60K / $2M = **3.0%** — well under 4%, "Prosperity rule zone" territory
- **Phase:** withdrawal (no contributions, portfolio funded)
- **Expected:** "Can I retire?" shows high readiness; Checkup shows "watch" or "on track"; Income plan shows meaningful drawdown sequencing

---

## Format

Each persona section below has:
1. **Seeding confirmation** — actual values loaded
2. **Per-page findings** with severity tag `[BLOCKER]` / `[UX]` / `[COPY]` / `[POLISH]` / `[A11Y]`
3. **Desktop + mobile screenshots referenced**

Findings are appended as they're found, not re-organized at the end.

---

## Persona 1 — Dual Income (couple)

**Seeded via QA modal.** Loaded values match fixture: 35+33yo, $180K + $120K income, $80K expenses, $70K retirement expenses, 4 accounts totaling $390K, joint filing.

**Pill:** $2M · 11.3 yrs. (Expected ~$1.75M — see finding D1.)

### Findings

- **[UX] D1 — FIRE number diverges from user-entered retirement expense.** User enters $70K retirement expenses; pill + Traditional FIRE card show $2M. Hidden math: `$70K × (1 + expenseGrowthRate)^15 / 0.04 = $2.03M`. The 15 years of compounded 1% lifestyle creep is invisible to the user. A couple setting a "conservative $70K retirement budget" is surprised to see a $2M target instead of the $1.75M they expected. No tooltip or explanation. *Fix direction: add a "(includes 15 yrs of 1% lifestyle creep)" footnote under the FIRE number, or expose the creep rate in the stat card's hover.*

- **[BLOCKER] D2 — Coast FIRE card shows the Traditional FIRE number as "need today".** Card renders "Age 39 · 4 years from now · need $2M today". The $2M is traditionalTarget, not the coast amount ($856K at 6% × 15 yrs). `src/lib/calc/fire-types.ts` creates the Coast summary with `target: traditionalTarget`. `src/components/landing/quick-fire-workspace.tsx:585` displays `ft.target` as "need $X today" — structurally wrong. A Coast FIRE user could read "need $2M today" and think Coast doesn't apply to them when they actually only need $856K.

- **[UX] D3 — Phantom savings.** Home + Save stat cards claim "Savings $147.5K/yr, 65% rate" — this is `takeHome − expenses` (implied). The "Save per year" slider and year-by-year table show $61K/yr (actual account contributions). For a $300K household, the $86K/yr gap is huge. Projection uses `max(annualSavings, plannedContribution)`, which means the projection itself picks $70K (with match) in this case — consistent with the slider but NOT with the 65% stat card. User sees $147K in one place, $61K in another, and can't reconcile.

- **[UX] D4 — Success rate visible during accumulation.** Can I retire? shows "Success 85.7%" with "Readiness —" side-by-side. Readiness is correctly hidden (accumulation phase), but the success rate is front and center and reads as "you're 86% good to retire." At 35yo with $390K, that framing is misleading. *Fix direction: either hide the success rate too, or label it as "Projected at your $1.8M FIRE target" so users know it's a simulation of the future state, not today.*

- **[UX] D5 — Inconsistent FIRE number between pages.** Can I retire? "Testing with $1.8M" (FIRE target mode) vs. header pill "$2M". Both valid (`retirementExpenses/WR` vs. `retirementExpenses × creep^years / WR`), but the same session showing two numbers for the same concept is confusing. Shows up in one moment on the page.

- **[COPY] D6 — Stale nav labels on Home "Explore your tools" section.** Internal link under "Spend" still reads "Your Plan → Historical backtests and Monte Carlo stress tests." The sub-nav was renamed to "Can I retire?" last session but this deep-link copy wasn't updated. `src/components/landing/quick-fire-workspace.tsx` "Explore your tools" section.

- **[UX] D7 — Save stat card integer years (12) vs. Save/What-if header fractional (11.3) vs. pill fractional (11.3).** Three displays of the same "years to FI" on the same module. Last session I intentionally used integer in Save's stat card (to match the FIRE milestone row); it's still fractional on the What-if header. Small inconsistency within the Save module.

### Mobile pass (375px)
- Sankey labels readable, no overlap (Round 1 fix holding).
- Cards stack cleanly.
- Coast FIRE card has the same "need $2M today" bug on mobile.
- No new mobile-specific issues surfaced.

---

## Persona 2 — Almost FIRE (pre-retiree, past FIRE number)

**Seeded via QA modal.** 48yo, $150K income, $50K expenses, $1.8M portfolio, 2 years to planned retirement.

**Pill:** $1.3M · 0 mo. Good — shows they're at FI today.

### Findings

- **[UX] A1 — "Years to FI: 1 yrs" when user is already past FIRE.** Save stat card shows `1 yrs · age 49` for a user with $1.8M vs. $1.25M target. Should be `0 yrs · age 48` ("you're already there"). Caused by the `idx > 0` filter I added in Round 1 Fix 4 — it correctly prevents "year 0" for accumulating users but overshoots for already-FI. *Fix: when currentPortfolio >= traditionalTarget, force displayYearsToFi = 0 and displayFireAge = currentAge.*

- **[BLOCKER] A2 — Coast FIRE card repeats D2 ("need $1.3M today").** Same structural bug as Dual Income. Card says "Age 48 · 0 years from now · need $1.3M today" — the $1.3M is traditionalTarget, not the coast target (~$1.13M for 2 years at 5%). For an Almost-FIRE user this is less harmful because they're past both numbers, but it's still wrong copy.

- **[UX] A3 — Phantom savings repeats D3.** Home shows "Savings $77.3K/yr, 61% rate". Account contributions in fixture: $23.5K + $7K = $30.5K. $46.8K/yr phantom.

- **[✓] Save/What-if, Spend/Can I retire, Spend/Income plan all work well.** Readiness: 95/100 at current $1.8M portfolio. Roth ladder renders with meaningful conversions ($600K total, $97K/yr bracket fills). No accumulation banner (correct, they're not net-saving into big deficit). This persona is well-served.

- **[✓] "Financially independent" dedicated banner on Home.** When `currentPortfolio >= traditionalTarget`, Home shows a green-checkmark banner instead of the progress-bar view. Nice state design.

- **[UX] A4 — "Explore your tools" CTA switches contextually.** For Almost FIRE, the Spend block's CTA reads "You've reached your target. See if your plan will last. → Run historical backtests and Monte Carlo simulations." Great contextual swap. Keep.

### Mobile pass
- Financially-independent banner stacks fine.
- No new issues.

---

## Persona 3 — Already Retired

**Seeded via QA modal.** 65yo, $0 income, $60K expenses, $2.0M across 3 accounts (trad IRA $800K + Roth $400K + taxable $800K), married joint, FL.

**Pill:** $1.5M · 0 mo. Good.

### Findings

- **[BLOCKER] R1 — Retired user sees "Raise savings or push the target" warning on Save.** Save stat card renders the Round 1 Fix 5 warning: "⚠ Target retirement age 65 is 1 yr before projected FI (age 66). Raise savings or push the target." Told to a 65yo who is already retired with $2M. Two compounding bugs:
  1. `displayYearsToFi` is 1 instead of 0 (same as A1 — overshoots when already past FIRE).
  2. The warning doesn't check whether the user is past the portfolio target; it only compares fireAge vs. retireAge.
  *Fix: early-return the warning when currentPortfolio ≥ traditionalTarget, OR when age ≥ retireAge, OR when phase === "withdrawal".*

- **[UX] R2 — Home + Save show accumulator stat cards for a retiree.** "Take-home $0/yr", "Savings $0 at 0% rate", "Tax estimate $0 at 0% effective" — dead cards for someone living off their portfolio. A retiree needs different stat cards: current withdrawal rate, portfolio trajectory vs. target-age plan, year-over-year drift. The Spend module HAS these (RetirementCheckupSummary) but Home/Save don't mirror them.

- **[UX] R3 — Roth conversion ladder hardcoded to age 60 cutoff.** Income plan shows "Roth conversion ladder plan — from retirement until age 60, with bridge funding and 5-year availability timing." For a 65yo this just shows $0 conversions with no rows. Misses the genuinely useful "trad→Roth before RMDs at 73" optimization the retiree could still do.

- **[UX] R4 — "You vs peers: Top 9%" feels tone-deaf for retirees.** Light wrinkle — a "compare to median for your age" stat aimed at motivating accumulators. For a 65yo retiree, it's accurate but off-topic. Consider hiding or recontextualizing for phase === "withdrawal".

- **[✓] Spend/Can I retire? Decision Score 100, everything green.** For the target persona, the page renders beautifully.

- **[✓] Retirement Checkup** correctly shows 3% WR, Within plan, CAPE-guided spending $67.5K. This is where the retiree persona is best served.

### Mobile pass
- Same "Raise savings or push the target" bogus warning — user reads it on phone too.
- Dead cards ($0 take-home etc.) also render on mobile.

---

## Console + a11y sweep

### Console
- **`scroll-behavior: smooth`** — Next.js deprecation notice. Future version will require `data-scroll-behavior="smooth"` attribute on `<html>`. One-line fix.
- IndexedDB "Another connection wants to delete database 'firecalc'" — artefact of manual clearing during QA, not a production concern.
- **Zero React errors. Zero uncaught exceptions.** Good baseline.

### A11y
- `Skip to main content` link is first in tab order ✓
- Logo, primary nav, sub-nav, action buttons, stat cards (as buttons that open the drawer) all reachable via Tab ✓
- 37 focusable items on /accumulation — reasonable density
- Nothing glaringly broken. Deep a11y audit (WCAG 2.1 AA) is out of scope here; this is just "does keyboard navigation work at all" — it does.

---

## Prioritized plan for next work

Tagged by severity and by whether the fix is a quick source tweak vs. a design-level change.

### TIER 1 — Ship-blocker bugs (incorrect output reaching real users)

1. **Coast FIRE card shows Traditional FIRE number as "need today"** (D2, A2). Two lines changed: `src/lib/calc/fire-types.ts` — Coast summary should carry `coastBalance` (or the coastFiTarget from `quick-fire.ts`) as `target`, not `traditionalTarget`. Plus verify Round 1 progress-bar math still works after the swap (progress = currentPortfolio / coastTarget). Affects every user who has a valid Coast age.

2. **"Years to FI: 1 yrs" when already past FIRE** (A1, R1). The `idx > 0` findIndex filter overshoots when `currentPortfolio >= traditionalTarget`. Add an early-return in `quick-fire-workspace.tsx`: if already past FIRE, `displayYearsToFi = 0`, `displayFireAge = currentAge`.

3. **"Raise savings or push the target" fires on already-retired users** (R1). The Round 1 Fix 5 warning lacks a phase guard. Add `phase !== "withdrawal" && currentPortfolio < traditionalTarget` to the condition. Without this, a 65yo with $2M is told to save more.

### TIER 2 — Phase-aware UX (retiree and almost-FI personas are misframed)

4. **Home + Save show accumulator cards for retirees** (R2). "Take-home $0", "Savings 0%", "Tax estimate $0" are dead/confusing for a withdrawal-phase user. Two approaches, in order of effort:
   - *Minimum*: hide these cards when `phase === "withdrawal"` AND `annualIncome === 0`.
   - *Better*: swap to retiree-focused cards ("Current WR", "Portfolio trajectory", "Annual drift") — essentially a mini-checkup on Home/Save.

5. **Phantom savings vs. actual contributions inconsistency** (D3, A3). Stat cards report "savings" as `takeHome − expenses` (implied) while the "Save per year" slider and projection use account contributions. For Dual Income, the gap is $86K/yr. Three fixes, pick one:
   - Change stat cards to report actual contributions (aligns with slider).
   - Change slider/projection to use implied savings (aligns with stat cards).
   - Show BOTH with labels: "Invested (via accounts): $61K | Take-home minus spending: $147.5K" — most informative but denser.
   - Recommendation: option 1. Actual account contributions are what drives the FIRE timeline; "implied savings" is a motivational stat that overstates progress.

6. **Success rate visible during accumulation creates mixed signals** (D4). Spend/Can I retire? for accumulation-phase user shows "Success 85.7%" + "Readiness —" side by side. Either hide success rate too OR label it "Success if you retired today at your $1.8M target". Prefer labeling — the number is computed meaningfully against a simulated future portfolio.

7. **FIRE number diverges from user input with no explanation** (D1). User enters $70K retirement expenses, sees $2M target. The 15 years × 1% real lifestyle creep is invisible. Surface the delta in a tooltip on the FIRE Number card: "Based on $81K projected retirement spending ($70K today × 1% real growth × 15 yrs)." If the user never changes expense growth from 1% default, this is a silent but real gap between expectation and output.

### TIER 3 — Consistency, copy, small polish

8. **"Years to FI" mismatch between Save stat card (integer), Save/What-if header (fractional), header pill (fractional)** (D7). Pick one source of truth for the display — probably the integer `displayYearsToFi` from Round 1 — and thread it through the pill + What-if header. One-line fixes in two components.

9. **Stale "Your Plan" copy in Home → "Explore your tools" → Spend section** (D6). Round 1 renamed the Spend sub-tab to "Can I retire?". The Home deep-link copy still reads "Your Plan". One-line copy fix.

10. **Two different FIRE numbers on Spend page** (D5). `Can I retire?` "Testing with $1.8M" (retirementExpenses / WR) vs. header pill "$2M" (retirementExpenses × creep^years / WR). Either align, or label the Spend number "Testing with your today-dollars FIRE target" to explain.

11. **Roth conversion ladder hardcoded to "retirement until age 60"** (R3). A 65yo retiree could still benefit from trad→Roth before RMDs (age 73). The current logic skips them entirely. Medium-effort: extend the ladder planner to work for retirees past 60 by using `Math.max(age + 1, 60) → RMD age` as the conversion window.

12. **Next.js `scroll-behavior` deprecation.** Add `data-scroll-behavior="smooth"` to `<html>` in `app/layout.tsx`. One-liner.

### TIER 4 — Considered but de-prioritized

- "You vs peers" benchmark block for retirees (R4) — informational, not misleading. Optional reframe.
- "Top 26%" and "14× US average" celebratory copy — uses phantom savings, so technically inflated, but lands in the same bucket as #5 (fix at source). Don't double-fix.

---

## Round 2 retrospective (for Round 3)

**Worked well:**
- Seeding via QA modal was near-instant vs. driving the UI in Round 1. Saved ~30 minutes.
- Expected-values table upfront caught D1 (the $2M vs. $1.75M FIRE number mystery) immediately — Round 1 it would have felt "close enough" and been missed.
- Three personas surfaced bugs specific to each (Dual: phantom savings, Almost FIRE: off-by-one, Retired: wrong warnings). Single-persona Round 1 would have missed the retiree bugs entirely.
- Findings log written inline beat "compile at the end." Severity tags from the start made Tier 1/2/3 trivial to bucket.

**Didn't work:**
- Full mobile pass for each persona was lighter than desktop — I caught 1 mobile-specific finding (none, really) vs. 11 desktop findings. Mobile viewports mostly inherit desktop bugs; not clear it's worth the full pass per persona vs. one dedicated mobile sweep across all three at the end.
- "Drive state directly, not through the UI" worked for seeding via the QA button, but I still used synthetic keyboard events for sliders. That's fine for demonstration but flaky — next time, mutate Zustand directly via `preview_eval` for slider-driven state.
- Didn't check the console proactively; ran one sweep at the end and found only noise. Probably a per-page console check is overkill; end-of-walk check is enough.

**For Round 3 (next quarter?):**
- Add personas I didn't cover: Lean FIRE (spending-floor sensitivity), Fat FIRE (high-dollar UI edge cases at $5M+), International (currency/state), Spreadsheet Power User (methodology transparency).
- Run after each tier-1/2 fix lands to verify no new regressions in adjacent personas.

