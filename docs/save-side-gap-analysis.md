# Save-Side Comprehensive Gap Analysis & Backlog

## Context

Comprehensive audit of the Save/accumulation calculation engine against industry standards (ProjectionLab, Pralana, cFIREsim) and financial planning best practices. **The engine is mathematically solid** (compounding, FIRE types, projections) but **tax modeling has critical gaps** that cause material inaccuracies in take-home pay, savings rate, and time-to-FI projections.

**Market opportunity:** Every free FIRE calculator (cFIREsim, FICalc, FIRECalc, Networthify) treats money as a single undifferentiated bucket with ZERO tax awareness. If Jarlan fixes these gaps, it becomes the only free, modern, tax-aware accumulation-phase FIRE calculator.

---

## Current State: What Works ✅

| Feature | Status | Notes |
|---------|--------|-------|
| FIRE Number (expense / WR) | ✅ | Bengen-based, golden tested |
| Monthly compounding | ✅ | Real returns, fee drag, income growth |
| Years to FI | ✅ | Month-by-month iteration |
| Federal tax brackets (2025) | ✅ | 7 brackets × 4 filing statuses |
| Employer match | ✅ | Standard % up to cap formula |
| Social Security analysis | ✅ | Mortality-adjusted, household-aware |
| Cash flow events | ✅ | Age-based, career breaks, life events |
| 5 FIRE types | ✅ | Traditional, Lean, Fat, Coast, Barista |
| Account types | ✅ | 12 types including Roth, HSA, 529 |
| Roth conversion planning | ✅ | Framework exists (retirement phase) |
| Enriched projections | ✅ | Income/expenses/savings per year |
| 82 accuracy tests | ✅ | Golden pinned values |

---

## Critical Gaps: Prioritized Backlog

### 🔴 P0: Accuracy-Critical (materially wrong results)

#### 1. FICA/Payroll Taxes — NOT MODELED
- **Impact:** Take-home overstated by 7.65% (W-2) or 15.3% (self-employed)
- **Example:** $300K earner: missing ~$17.7K in FICA ($10.5K SS + $4.35K Medicare + $2.9K additional Medicare)
- **What to build:**
  - Social Security tax: 6.2% up to wage base ($168,600 for 2025), employer pays matching 6.2%
  - Medicare: 1.45% on all wages, additional 0.9% on wages >$200K (single) / $250K (MFJ)
  - Self-employed toggle: pay both halves (15.3% up to wage base + 2.9% above)
  - Self-employment tax deduction (50% of SE tax is deductible)
- **Files:** `src/lib/tax/strategy.ts`, new `src/lib/tax/fica.ts`
- **Effort:** Medium (1-2 days)
- **Accuracy test:** Pin FICA for $128K W-2 single = $9,792; for $300K SE = $33,471

#### 2. Standard Deduction — NOT APPLIED
- **Impact:** Federal tax overestimated by $584-$1,168 (2-5% for middle income)
- **2025 values:** Single $14,600 / MFJ $29,200 / HOH $21,900 / 65+ additional $1,550-$1,950
- **What to build:** Subtract standard deduction from AGI before bracket calculation
- **Files:** `src/lib/tax/strategy.ts`
- **Effort:** Small (1 hour)
- **Accuracy test:** Pin federal tax for $128K single = current_value - bracket_delta

#### 3. State Tax Brackets — FLAT 5% IS WRONG
- **Impact:** TX/FL/WA/NV/NH residents overtaxed by 5%; CA residents undertaxed by 4-8%
- **Current:** Hardcoded 5% flat rate for ALL states
- **What to build:**
  - Full 50-state tax rate data (effective marginal rates or simplified brackets)
  - 9 states with 0% income tax: AK, FL, NV, NH, SD, TN, TX, WA, WY
  - Progressive brackets for top 10 states by population (CA, TX, FL, NY, PA, IL, OH, GA, NC, MI)
  - Flat rate fallback for remaining states
  - State standard deduction where applicable
- **Files:** `src/lib/data/state-taxes.ts` (expand from 5 → 50 states), `src/lib/tax/strategy.ts`
- **Effort:** Large (2-3 days) — data collection + bracket implementation
- **Accuracy test:** Pin state tax for CA $300K MFJ, TX $300K single, NY $128K HOH

#### 4. Contribution Limit Enforcement — NOT ENFORCED
- **Impact:** Users can over-contribute (invalid scenarios), tax deductions not capped
- **Current:** Limits defined in quiz but not validated in drawer or calculation engine
- **What to build:**
  - Validation warnings in drawer when contribution exceeds limit
  - Cap pre-tax deductions in `estimateScenarioTax()` to legal limits
  - Show "exceeds limit" indicator on account cards
- **Files:** `src/lib/tax/strategy.ts`, `src/components/plan-drawer/plan-drawer-content.tsx`
- **Effort:** Medium (1 day)

### 🟡 P1: Important for Serious Users

#### 5. Capital Gains Tax (LTCG vs Ordinary)
- **Impact:** Taxable account withdrawals taxed at wrong rate (ordinary vs preferential)
- **What to build:**
  - LTCG brackets (0%/15%/20%) separate from ordinary income
  - Net Investment Income Tax (NIIT): 3.8% on investment income above $200K/$250K
  - Cost basis tracking for taxable accounts (already field exists, needs logic)
- **Files:** `src/lib/tax/strategy.ts`, `src/lib/domain/types.ts`
- **Effort:** Large (2-3 days)

#### 6. RMD Modeling (Age 73+)
- **Impact:** Post-73 projections miss forced withdrawals from Traditional accounts
- **What to build:**
  - RMD table (IRS Uniform Lifetime Table, already in withdrawal-strategies.ts)
  - Flag in accumulation projection when RMDs begin
  - Calculate forced taxable income from RMDs
- **Files:** `src/lib/calc/quick-fire.ts`, `src/lib/tax/strategy.ts`
- **Effort:** Medium (1-2 days)

#### 7. Employment Type Toggle (W-2 vs Self-Employed vs 1099)
- **Impact:** Self-employed users' FICA is 2x; 1099 workers have different deduction rules
- **What to build:**
  - Employment type field on profile: W-2 / Self-employed / 1099 contractor
  - FICA calculation adjusts based on type
  - SE tax deduction (50% of SE tax reduces AGI)
  - QBI deduction (20% for pass-through income under $170K single)
- **Files:** `src/lib/domain/types.ts`, `src/lib/tax/strategy.ts`
- **Effort:** Medium (1-2 days)

#### 8. Inflation Consistency (Bracket Creep)
- **Impact:** 30-year projections use fixed 2025 brackets while income grows
- **What to build:**
  - Option to inflation-adjust brackets by CPI (~2.5%/yr)
  - OR note clearly that projections use "real" dollars and brackets are approximate
- **Files:** `src/lib/tax/strategy.ts`
- **Effort:** Small-Medium (half day)

### 🟢 P2: Nice-to-Have / Competitive Edge

#### 9. ACA Subsidy Optimization
- Currently models "room before ACA cliff" but not subsidy value
- Build: MAGI → FPL % → premium tax credit calculation
- Effort: Large

#### 10. Medicare IRMAA
- Income-related monthly adjustment amounts for age 65+
- Creates tax cliffs that affect Roth conversion strategies
- Effort: Medium

#### 11. Phase-Out Modeling
- Roth IRA income phase-out ($146K-$161K single 2025)
- IRA deduction phase-out if covered by employer plan
- Child tax credit phase-outs
- Effort: Medium

#### 12. Tax Loss Harvesting
- Cost basis tracking (field exists, needs logic)
- Wash sale rules
- Harvesting opportunities flagging
- Effort: Large

#### 13. AMT (Alternative Minimum Tax)
- Only affects ultra-high earners (>$500K+)
- 26-28% parallel tax system
- Effort: Large, low priority

#### 14. 72(t)/SEPP Distributions
- Penalty-free early access to retirement accounts
- Useful for early retirees under 59.5
- Effort: Medium

---

## Data Gaps

| Data | Status | Action |
|------|--------|--------|
| Shiller CAPE data | Stale (ends Sept 2023) | Run fetch script, update to 2026 |
| Federal tax brackets | Current (2025) | ✅ |
| State tax data | 5 states, flat rates | Expand to 50 states with brackets |
| FICA wage base | Not present | Add $168,600 (2025) |
| Standard deduction data | Not present | Add per filing status + age |
| RMD table | In withdrawal module | Already available |
| ACA poverty levels | Current (2025) | ✅ |
| Monthly returns | Placeholder | Need real multi-asset data |

---

## Requirements Doc Gap Analysis

The requirements doc (`fire-calc-requirements.md`) IS comprehensive — it specifies everything needed. Here's what the requirements call for that we HAVEN'T built yet on the Save side:

### Requirements Specified → Not Yet Built

| Requirement (from fire-calc-requirements.md) | Section | Status |
|----------------------------------------------|---------|--------|
| FICA/payroll taxes | §3.3 "Tax filing status and state" (implicit) | ❌ Not built |
| Standard deduction | §3.8 (implied by "Tax bracket visualizer") | ❌ Not built |
| State tax brackets (not flat 5%) | §3.3 + §3.8 "Tax filing status and state" | ❌ Oversimplified |
| Capital gains tax (LTCG vs ordinary) | §3.8 "Taxable Brokerage — capital gains treatment" | ❌ Not built |
| Cost basis tracking | §3.8 "cost basis tracking" | ❌ Field exists, no logic |
| RMD projection | §3.8 "RMD Projector" | ⚠️ Withdrawal only, not accumulation |
| 72(t)/SEPP distributions | §3.8 Roth ladder "vs. 72(t) SEPP" comparison | ❌ Not built |
| Geographic arbitrage calculator | §3.9 "Geographic Arbitrage Calculator" | ❌ Not built |
| Expense categorization | §3.3 "Expense Categorization" | ❌ Not built (single number) |
| Savings rate optimizer | §3.3 "Savings Rate Optimizer" | ⚠️ Table exists, no optimizer |
| "One More Year" analysis | §3.9 detailed spec | ❌ Not built |
| Tornado sensitivity chart | §3.9 "Tornado chart" | ❌ Basic ranking only |
| Tax bracket visualizer (year-by-year) | §3.8 spec | ❌ Not built |
| Roth ladder Gantt chart | §3.8 "5-year clock for each tranche" | ❌ Not built |
| Side-by-side 4 scenarios | §3.9 "up to 4 scenarios" | ⚠️ What-if exists, not full comparison |
| Mortgage payoff modeling | §3.3 "mortgage payoff date" | ❌ Not built |
| College cost planning (529) | §3.3 "college costs" | ❌ Not built |
| International equities data | §3.4 "MSCI EAFE, Emerging Markets" | ❌ Not built |
| Small Cap Value data | §3.4 "Fama-French" | ❌ Not built |
| TIPS/REITs/Gold asset classes | §3.4 "Gold, TIPS, REITs" | ❌ Not built |
| Block bootstrap Monte Carlo | §3.6 "Block Bootstrap" | ❌ Not built |
| Regime-switching Monte Carlo | §3.6 "Regime-Switching" | ❌ Not built |

### Requirements We HAVE Built (✅)

| Requirement | Section | Notes |
|-------------|---------|-------|
| Quick FIRE Number calculator | §3.1 | ✅ Complete |
| FIRE Type Quiz | §3.2 | ✅ Stage-aware, 10+ questions |
| All FIRE types (5 of 8 spec'd) | §3.2 | ✅ Lean/Fat/Coast/Barista + Traditional |
| Accumulation chart + milestones | §3.3 | ✅ Stacked bar + line, enriched data |
| Sensitivity table (±savings) | §3.3 | ✅ What-if page |
| "Shockingly Simple Math" table | §3.3 | ✅ Learn page |
| Historical backtesting | §3.4 | ✅ Rolling periods, Shiller data |
| All 8 withdrawal strategies | §3.5 | ✅ Fixed, CAPE, GK, VPW, RMD, etc. |
| Monte Carlo (parametric + bootstrap) | §3.6 | ✅ 3 modes |
| Rich/Broke/Dead dashboard | §3.7 | ✅ Mortality-aware, health-adjusted |
| Account types (12) | §3.8 | ✅ Full type system |
| Roth conversion planner | §3.8 | ✅ Framework, bracket-filling |
| Social Security optimizer | §3.8 | ✅ Claiming age, break-even, household |
| ACA subsidy awareness | §3.8 | ⚠️ Partial (cliff model, not full optimization) |
| Drawdown sequence | §3.8 | ✅ Basic ordering |
| Scenario comparison | §3.9 | ⚠️ What-if (life decisions), not full 4-scenario lab |
| Education hub | §3.10 | ✅ Personalized, savings rate article |
| Sankey cash flow | §2.1 gap analysis | ✅ Money flow chart |

---

## Requirements Doc Updates Recommended

The requirements doc should be updated to explicitly call out:

1. **FICA/payroll tax** as a first-class requirement (it's implied but not specified)
2. **Standard deduction** must be applied before bracket calculation
3. **Employment type** (W-2 vs self-employed vs 1099) — affects FICA dramatically
4. **State tax accuracy target** — "effective rate for all 50 states" vs "full brackets for top 10"
5. **Contribution limit enforcement** — validation, not just display
6. **Personalized Learn hub** — not in original spec, but a differentiator we've built
7. **Life decision what-if tool** — not in original spec, but built and valuable
8. **Quiz → Scenario mapping** — not in original spec, but critical for UX
9. **Accuracy testing framework** — not in spec, but we've built 82 golden tests

1. **Tax Engine Requirements**
   - Federal income tax (brackets, standard deduction, filing status)
   - FICA/payroll taxes (SS + Medicare, wage base, employment type)
   - State income tax (all 50 states, at least effective rates)
   - Capital gains tax (LTCG brackets, NIIT, cost basis)
   - Pre-tax deductions (401k, Traditional IRA, HSA, SE tax deduction)

2. **Account Requirements**
   - Supported types with contribution limits
   - Employer match formula
   - Roth vs Traditional tax treatment
   - RMD enforcement at 73+
   - Contribution limit validation

3. **Projection Engine Requirements**
   - Real vs nominal returns
   - Monthly compounding
   - Fee drag
   - Income/expense growth rates
   - Cash flow events
   - Tax-aware contribution growth

4. **Accuracy Requirements**
   - All calculations must have golden tests
   - Cross-validate against external tools (cFIREsim, ProjectionLab)
   - Every metric change requires accuracy test update
   - Tax calculations validated against IRS publications

---

## Recommended Sprint Order

### Sprint T1: Tax Foundation (P0 items — 3-4 days)
1. Add standard deduction to federal tax calc
2. Build FICA/payroll tax module
3. Expand state taxes to all 50 states (at least top 15 + no-income-tax states)
4. Add employment type toggle (W-2 / SE / 1099)
5. Enforce contribution limits
6. Update ALL accuracy tests
7. Update Sankey chart to show FICA as a flow

### Sprint T2: Capital Gains + RMDs (P1 items — 2-3 days)
1. Separate LTCG from ordinary income in tax calc
2. Add NIIT for high earners
3. Model RMDs at 73+ in projections
4. Cost basis tracking for taxable accounts

### Sprint T3: Data Refresh + Requirements Doc (1-2 days)
1. Update Shiller data to current
2. Create comprehensive requirements.md
3. Expand state tax data
4. Cross-validate against cFIREsim for backtest accuracy

### Sprint T4: Polish + Edge Cases (P2 items — ongoing)
1. ACA subsidy optimization
2. IRMAA for 65+
3. Phase-out modeling
4. Bracket creep / inflation adjustment

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/lib/tax/strategy.ts` | Standard deduction, FICA integration, state bracket lookup |
| `src/lib/tax/fica.ts` | **Create** — FICA/payroll tax calculator |
| `src/lib/data/state-taxes.ts` | Expand from 5 → 50 states with brackets |
| `src/lib/domain/types.ts` | Add employment type to profile |
| `src/lib/calc/quick-fire.ts` | Tax-aware projection enrichment |
| `src/components/plan-drawer/plan-drawer-content.tsx` | Employment type toggle, limit warnings |
| `src/components/charts/money-flow-sankey.tsx` | Add FICA flow |
| `docs/requirements.md` | **Create** — comprehensive spec |
| `src/lib/__tests__/accuracy/*.ts` | New golden tests for all tax changes |

## Verification

After Sprint T1:
1. $128K single W-2: federal tax includes standard deduction, FICA shows ~$9.8K
2. $300K MFJ in CA: state tax uses CA brackets (~9.3% effective), not flat 5%
3. $300K MFJ in TX: state tax = $0, not 5%
4. Self-employed $100K: FICA shows ~$15.3K (both halves)
5. 401(k) over-contribution flagged in drawer
6. Sankey shows: Income → FICA + Federal Tax + State Tax + Take-Home → Spending + Savings
7. All accuracy tests updated and passing
8. Years-to-FI changes by 1-3 years due to more accurate tax modeling
