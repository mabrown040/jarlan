# The Ultimate FIRE Calculator — Product Requirements & Build Plan

**Version:** 1.0  
**Date:** March 21, 2026  
**Purpose:** Complete specification for building the most exhaustive FIRE (Financial Independence, Retire Early) calculator web application in existence. This document synthesizes research from the FIRE community (r/financialindependence, r/leanfire, r/fatFIRE, r/CoastFIRE), academic literature (Trinity Study, Bengen's SAFEMAX, ERN's SWR Series, Guyton-Klinger, Kitces/Pfau research), and competitive analysis of every major existing tool (ProjectionLab, cFIREsim, FIRECalc, FI Calc, Engaging Data, WalletBurst, Networthify, theficalculator.com, BridgeToFI).

---

## 1. PRODUCT VISION

### 1.1 Core Mission

Build a freemium web-based FIRE planning application that combines the academic rigor of cFIREsim and ERN's SWR Toolbox with the visual polish and UX of ProjectionLab — while adding features that no single existing tool offers. A generous free tier serves as the viral growth engine (quick calculators, FIRE type quiz, basic projections), while a Pro tier ($8-12/month or $149-199 lifetime) unlocks the full analytical suite. The app should serve the full FIRE lifecycle: from a beginner calculating their first FIRE number, to an advanced planner stress-testing a CAPE-adjusted dynamic withdrawal strategy with Roth conversion ladder optimization.

### 1.1a Business Model

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0, no account required | Quick FIRE Number calculator, FIRE Type Quiz, basic accumulation projections (single account, fixed return), savings rate table, Coast FIRE calculator, one unsaved scenario, shareable URLs |
| **Pro** | $8-12/month | Historical backtesting (1871–present), Monte Carlo simulations, all 8 withdrawal strategies, CAPE-based dynamic withdrawals, unlimited saved scenarios, side-by-side comparison, Roth conversion ladder planner, ACA subsidy optimizer, Social Security optimizer, tax-aware drawdown, progress tracking, data export, Rich/Broke/Dead dashboard, all FIRE types |
| **Lifetime** | $149-199 one-time | Everything in Pro, forever. No subscription. This tier is critical — the FIRE community deeply values one-time purchases over recurring subscriptions. It also creates urgency ("lock in lifetime access before the price goes up"). |

**Why this model works:** ProjectionLab proved that the FIRE community will pay $80-120/year for a genuinely best-in-class tool. Our free tier is more generous than any competitor's (most don't have one), which drives organic growth and word-of-mouth. The Pro tier is where the deep analytical power lives — the features people can't get anywhere else for free. The lifetime option aligns with the FIRE mindset of "pay once, own forever" and generates upfront cash flow.

### 1.2 Design Principles

1. **Progressive disclosure** — A simple "Quick FIRE Number" calculator on the landing page. Complexity is opt-in. Advanced modules unlock as users indicate interest.
2. **Research-backed defaults** — Every default value (e.g., 7% real return, 3% inflation, 4% SWR) must cite its source. Tooltips link to the underlying research.
3. **Transparency of math** — Users can click "Show me the math" on any output to see the exact formula, data sources, and assumptions. No black boxes.
4. **No account linking required** — All data is entered manually or imported via CSV/JSON. Privacy-first architecture. Free tier requires no account at all. Pro tier requires account creation for saved scenarios and cloud sync, but never links to bank/brokerage accounts.
5. **Mobile-first responsive** — Full functionality on mobile. Charts/graphs are touch-interactive.
6. **International support** — Multi-currency, country-specific tax presets, localized inflation data.

### 1.3 Competitive Gap Analysis

| Feature | ProjectionLab | cFIREsim | FIRECalc | ERN Sheet | **Our App** |
|---|---|---|---|---|---|
| Historical backtesting | ✓ | ✓ | ✓ | ✓ | ✓ |
| Monte Carlo simulation | ✓ | ✗ | ✗ | ✗ | ✓ |
| CAPE-adjusted SWR | ✗ | ✗ | ✗ | ✓ | ✓ |
| Guyton-Klinger guardrails | ✗ | ✓ | ✗ | ✓ | ✓ |
| VPW / Amortization-based | ✗ | ✗ | ✗ | Partial | ✓ |
| All FIRE types (Lean/Fat/Coast/Barista/Flamingo) | Partial | ✗ | ✗ | ✗ | ✓ |
| Roth conversion ladder planner | Partial | ✗ | ✗ | ✗ | ✓ |
| ACA subsidy optimization | ✗ | ✗ | ✗ | ✗ | ✓ |
| Social Security optimization | ✗ | ✗ | Partial | Partial | ✓ |
| Tax-aware drawdown sequencing | ✓ | ✗ | ✗ | ✗ | ✓ |
| Mortality-adjusted probability | ✗ | ✗ | ✗ | ✓ | ✓ |
| Shareable URL scenarios | Partial | ✗ | ✗ | ✗ | ✓ |
| Generous free tier | ✗ | ✓ | ✓ | ✓ | ✓ (+ paid Pro tier) |
| Real-time interactive charts | ✓ | ✓ | ✗ | ✗ | ✓ |
| Sankey cash-flow visualization | ✓ | ✗ | ✗ | ✗ | ✓ |
| Guided "What type of FIRE am I?" wizard | ✗ | ✗ | ✗ | ✗ | ✓ |
| Side-by-side scenario comparison | ✓ | ✗ | ✗ | ✗ | ✓ |
| Progress tracking over time | ✓ | ✗ | ✗ | ✗ | ✓ |

---

## 2. INFORMATION ARCHITECTURE & USER FLOWS

### 2.1 Application Structure

```
HOME (Landing Page)
├── Quick FIRE Number Calculator (no login, instant)
├── FIRE Type Quiz ("What kind of FIRE is right for me?")
│
├── ACCUMULATION MODULE (Pre-retirement)
│   ├── Income & Savings Setup
│   ├── Expense Categorization
│   ├── Savings Rate Optimizer
│   ├── FIRE Number Calculator (all types)
│   ├── Time-to-FI Projections
│   ├── Coast FIRE / Flamingo FI Calculator
│   └── Accumulation Visualizer (chart + milestones)
│
├── WITHDRAWAL MODULE (Post-retirement / Decumulation)
│   ├── Safe Withdrawal Rate Analyzer
│   │   ├── Fixed SWR (Trinity Study / Bengen)
│   │   ├── CAPE-based Dynamic SWR (ERN methodology)
│   │   ├── Guyton-Klinger Guardrails
│   │   ├── Variable Percentage Withdrawal (VPW)
│   │   ├── RMD-based withdrawal
│   │   ├── Constant Percentage of Portfolio
│   │   └── Amortization-based (Mortality-weighted)
│   ├── Historical Backtesting Engine
│   ├── Monte Carlo Simulation Engine
│   ├── Sequence-of-Returns Risk Visualizer
│   └── "Rich, Broke, or Dead" Probability Dashboard
│
├── TAX & ACCOUNT STRATEGY MODULE
│   ├── Account Type Manager (401k, IRA, Roth, Taxable, HSA, 529, etc.)
│   ├── Roth Conversion Ladder Planner
│   ├── Tax Bracket Visualizer (year-by-year)
│   ├── ACA Subsidy Optimizer
│   ├── Social Security Optimizer (claiming age)
│   ├── RMD Projector
│   └── Drawdown Sequence Optimizer
│
├── SCENARIO LAB
│   ├── Side-by-side scenario comparison
│   ├── Sensitivity analysis ("what breaks my plan?")
│   ├── Lifestyle change modeling
│   ├── Geographic arbitrage calculator
│   └── "One More Year" analysis
│
├── DASHBOARD & TRACKING
│   ├── Net Worth Tracker
│   ├── Savings Rate Tracker
│   ├── FI Progress Bar (% to each FIRE type)
│   ├── Monthly/Annual Review Snapshots
│   └── Milestone Timeline
│
└── EDUCATION HUB
    ├── FIRE Glossary
    ├── Interactive explainers (4% rule, sequence risk, etc.)
    ├── Research library (Trinity Study, ERN Series, etc.)
    └── Community links
```

### 2.2 Primary User Flows

**Flow 1: "I'm brand new — What is my FIRE number?"**
Landing page → Enter annual expenses → See FIRE number (25x) with explanation → Prompted to add income/savings for timeline → See "Years to FI" chart → Invited to create profile for tracking.

**Flow 2: "I'm 70% to FI — Should I Coast?"**
Dashboard → Coast FIRE calculator → Enter current portfolio, age, target retirement age → See if portfolio compounds to FIRE number without further contributions → Compare Coast vs. continuing accumulation → Model part-time income scenarios.

**Flow 3: "I'm about to pull the trigger — Will my money last?"**
Withdrawal module → Enter portfolio, allocation, expected spending → Run historical backtesting (all cycles since 1871) → See success rate → Toggle Monte Carlo → Compare withdrawal strategies (fixed 4% vs. GK guardrails vs. CAPE-based) → Model Social Security at different claiming ages → See tax-optimized drawdown plan.

**Flow 4: "I'm 3 years into retirement — Am I still on track?"**
Dashboard → Update current portfolio value → Run current-year withdrawal rate against CAPE → See if guardrails are triggered → Compare actual vs. projected → Get "course correction" recommendations.

---

## 3. DETAILED FEATURE SPECIFICATIONS

### 3.1 Quick FIRE Number Calculator (Landing Page)

**Inputs:**
- Annual spending (or monthly — auto-convert)
- Desired withdrawal rate (default 4%, slider 2.5%–6%, with risk label)
- Current savings/investments (optional, for timeline)
- Annual savings amount (optional, for timeline)
- Expected real return (default 5%, slider 0%–10%)

**Outputs:**
- FIRE Number = Annual Spending / Withdrawal Rate
- Years to FI (if savings provided) = calculated via future value formula
- Visual: animated counter + simple line chart showing portfolio growth to target
- Callout: "At a 3.5% withdrawal rate (safer for early retirees), you'd need $X instead"

**Research basis:** Trinity Study (Cooley, Hubbard, Walz, 1998; updated 2010 by Pfau). Bengen's original 1994 SAFEMAX research. ERN's 60-year horizon analysis showing 3.25-3.5% is safer for early retirees. Morningstar's 2025 report pegging prudent baseline at 3.7% for 30-year retirements.

### 3.2 FIRE Type System

The app must calculate and display all recognized FIRE variants simultaneously:

| FIRE Type | Definition | Calculation |
|---|---|---|
| **Lean FIRE** | FI on a bare-bones budget | Expenses ≤ $40k/yr × 25 |
| **Regular FIRE** | FI on a moderate budget | Expenses $40k–$100k/yr × 25 |
| **Fat FIRE** | FI on a generous/luxury budget | Expenses > $100k/yr × 25 |
| **Chubby FIRE** | Between Regular and Fat | Expenses $100k–$150k/yr × 25 |
| **Coast FIRE** | Enough saved that compound growth reaches FI by target age without further contributions | FV calculation: Current Portfolio × (1 + real return)^years = FIRE Number |
| **Barista FIRE** | Semi-retirement: portfolio covers partial expenses, part-time work covers the rest | (Annual Expenses − Part-time Income) / SWR |
| **Flamingo FI** | Reach 50% of FIRE number, then semi-retire; portfolio doubles in ~10 years at 7% real return | FIRE Number × 0.5 |
| **Slow FI** | Traditional savings rate, extended timeline, focus on lifestyle quality during accumulation | Standard FV with lower savings rate |

**FIRE Type Quiz:**
Interactive questionnaire (8-10 questions) about lifestyle preferences, risk tolerance, desired retirement age, willingness to work part-time, spending expectations. Outputs a recommended FIRE type with personalized target number. Questions include:
- What is your current age?
- At what age do you want full financial independence?
- Are you willing to work part-time in semi-retirement?
- What annual spending level feels comfortable to you?
- How much lifestyle flexibility do you have (can you cut 20% in a downturn)?
- Do you have dependents?
- What is your risk tolerance for running out of money? (slider: cautious → aggressive)

### 3.3 Accumulation Engine

**Core Inputs:**
- Current age
- Target retirement age (or "calculate for me")
- Current portfolio value (broken down by account type)
- Annual gross income (with expected growth rate)
- Annual savings by account type (401k, IRA, Roth IRA, Roth 401k, HSA, taxable brokerage, 529)
- Employer match details (match %, cap)
- Annual expenses (category-level optional)
- Expected annual spending in retirement
- Expected real investment return (stock/bond split with historical defaults)
- Inflation assumption (default 3%, historical average ~3.1%)
- Tax filing status and state

**Additional Cash Flows:**
- One-time events: inheritance, home sale, windfall, lawsuit settlement
- Recurring: rental income, side hustle, pension start/stop
- Recurring expenses: mortgage payoff date, kid expenses start/end, college costs
- Each event has a start date, end date, and optional inflation adjustment

**Outputs:**
- Years to FI (for each FIRE type)
- FI date projection
- Accumulation chart: portfolio growth over time with milestone markers
- Savings rate calculation and visualization
- Coast FI number and Coast FI age
- Flamingo FI number and age
- Sensitivity table: how changing savings rate by ±$500/month affects timeline
- "The Shockingly Simple Math" table (Networthify-style): savings rate → years to FI

**Chart: The FIRE Thermometer**
Visual progress bar showing current position relative to each FIRE type target. Animated fill on load. Shows percentage complete for Lean, Regular, Fat, Coast, Barista.

### 3.4 Historical Backtesting Engine

This is the core analytical engine. It must replicate and extend the methodology used by cFIREsim, FIRECalc, and ERN's SWR Toolbox.

**Data Sources:**
- Robert Shiller's dataset: S&P 500 monthly returns, dividends, earnings, CPI, interest rates, CAPE ratio (1871–present)
- US Treasury yields (10-year, 30-year) from FRED
- Gold prices (optional asset class)
- International equities (MSCI EAFE, Emerging Markets — data from 1970+)
- TIPS (from 1997)
- REITs (from 1972)
- Small Cap Value (Fama-French, from 1926)

**Methodology:**
For a given retirement start month, initial portfolio, asset allocation, withdrawal rate, and retirement duration:
1. Apply that month's real return (stock return × allocation + bond return × allocation)
2. Subtract the inflation-adjusted withdrawal amount
3. Rebalance to target allocation (monthly or annually, configurable)
4. Repeat for each month of the retirement duration
5. Record whether the portfolio survived (balance > $0 at end)
6. Repeat for every possible starting month in the dataset (rolling periods)

**Success Rate** = (Number of surviving periods) / (Total periods tested)

**Configurable Parameters:**
- Retirement duration: 10–60 years (default 40 for early retirees; ERN recommends modeling 60 years)
- Asset allocation: stocks/bonds/gold/international/TIPS/REITs/small cap value (with glidepath support — allocation changes over time)
- Withdrawal strategies (see Section 3.5)
- Rebalancing frequency: monthly, quarterly, annually, or threshold-based
- Fees: annual expense ratio drag (default 0.1% for index funds)
- Final value target: $0 (survival), 25% of initial (partial preservation), 100% (full preservation)
- Supplemental cash flows: Social Security, pensions, part-time income (with start/end dates)

**Outputs:**
- Success rate percentage with confidence intervals
- Fan chart: all historical portfolio paths overlaid (10th/25th/50th/75th/90th percentiles)
- Worst-case scenario detail: which starting year, how long it lasted, terminal balance
- Best-case scenario detail
- Histogram: distribution of terminal portfolio values
- Histogram: distribution of years-to-depletion for failed scenarios
- Average, median, min, max ending portfolio values
- Table: success rates across a matrix of withdrawal rates × asset allocations
- Heat map: success rate by starting CAPE ratio and withdrawal rate

### 3.5 Withdrawal Strategy Engine

The app must support and compare all major withdrawal strategies. Each strategy produces a year-by-year withdrawal schedule that feeds into the backtesting and Monte Carlo engines.

**Strategy 1: Fixed Real Withdrawal (The "4% Rule")**
- Year 1 withdrawal = Initial Portfolio × SWR
- Subsequent years: adjust for CPI inflation
- Parameters: Initial SWR (slider 2%–8%)
- Source: Bengen (1994), Trinity Study (1998)

**Strategy 2: CAPE-Based Dynamic Withdrawal (ERN Methodology)**
- Withdrawal = Portfolio × (a + b / CAPE)
- Default parameters: a = 0.0175, b = 0.5 (from ERN's research for 80/20 portfolio)
- Adjustable: a (intercept), b (CAPE coefficient)
- This inherently adjusts withdrawal rate based on market valuations
- Source: ERN SWR Series Part 11, Part 18, Part 54

**Strategy 3: Guyton-Klinger Guardrails**
- Start with initial withdrawal rate (default 5%)
- Annually adjust for CPI
- If current WR drops > 20% below initial → raise withdrawal by 10% (prosperity rule)
- If current WR rises > 20% above initial → cut withdrawal by 10% (capital preservation rule)
- Capital preservation rule suspended in final 15 years
- Parameters: initial WR, guardrail width (default ±20%), adjustment size (default 10%)
- Source: Guyton & Klinger (2006), FPA Journal

**Strategy 4: Variable Percentage Withdrawal (VPW)**
- Each year, withdraw a percentage of current portfolio based on remaining years and asset allocation
- Percentage derived from amortization formula incorporating expected returns and remaining horizon
- Naturally adjusts: spend more in good years, less in bad
- Source: Bogleheads VPW methodology

**Strategy 5: Constant Percentage of Portfolio**
- Withdraw X% of current portfolio value each year (not inflation-adjusted initial amount)
- Guarantees never running out of money but creates income volatility
- Parameter: withdrawal percentage

**Strategy 6: RMD-Based**
- Use IRS Uniform Lifetime Table divisors
- Withdrawal = Portfolio / RMD divisor for current age
- Works well for traditional retirement accounts

**Strategy 7: Floor-and-Ceiling**
- Set minimum ("floor") and maximum ("ceiling") annual withdrawal in real dollars
- Calculate withdrawal as percentage of portfolio, then clamp to floor/ceiling
- Prevents extreme austerity and excessive spending

**Strategy 8: Retirement Spending Smile**
- Models the empirically observed pattern that spending declines ~1-2% per year in real terms through retirement (the "go-go, slow-go, no-go" phases)
- Source: Blanchett (2014), Morningstar 2025 study
- Adjustable annual decline rate

**Comparison View:**
Side-by-side chart of withdrawal amounts over time for each strategy applied to the same historical period. Table showing: average annual withdrawal, minimum year, maximum year, standard deviation of withdrawals, success rate, median terminal balance.

### 3.6 Monte Carlo Simulation Engine

**Methodology Options:**

1. **Parametric Monte Carlo:** Draw annual returns from a normal (or log-normal) distribution with user-specified mean and standard deviation. Default: 10.2% nominal stock return, 16.5% standard deviation (historical US large cap). User can adjust for fat tails (kurtosis parameter).

2. **Historical Bootstrap:** Randomly sample actual annual returns (with replacement) from the historical dataset. Preserves non-normality and extreme events but breaks temporal autocorrelation.

3. **Block Bootstrap:** Sample multi-year blocks (e.g., 5-year sequences) to preserve some serial correlation in returns.

4. **Regime-Switching:** Model two regimes (bull and bear markets) with different return distributions and transition probabilities. More realistic but more complex.

**Parameters:**
- Number of simulations (default 10,000; max 100,000)
- Return distribution: parametric vs. historical bootstrap vs. block bootstrap
- Mean and standard deviation overrides (for forward-looking scenarios — e.g., Morningstar/Vanguard's lower-return forecasts)
- Correlation between stocks and bonds
- Inflation model: fixed, random (drawn from historical distribution), or correlated with returns

**Outputs:**
- Success rate (% of simulations where portfolio survived)
- Percentile fan chart (5th, 10th, 25th, 50th, 75th, 90th, 95th percentiles of portfolio value over time)
- Distribution histogram of terminal portfolio values
- Probability of ruin by year (cumulative failure curve)
- Expected shortfall: in failed scenarios, average magnitude of shortfall
- Confidence interval on success rate itself (binomial confidence interval)
- Ability to overlay Monte Carlo results with historical backtest results for comparison

### 3.7 "Rich, Broke, or Dead" Dashboard

Combines financial simulation with mortality data to provide a holistic probability picture.

**Mortality Data:**
- Social Security Actuarial Life Tables (2023 or latest)
- Adjustable for health status (above average, average, below average — shifts life expectancy ± 5 years)
- Joint mortality for couples

**Outputs:**
For each year of retirement:
- Probability of being alive
- Probability of being alive AND solvent (portfolio > $0)
- Probability of being alive AND broke
- Probability of having died (with or without remaining assets)

**Visualization: The Wedge Chart**
Area chart showing four stacked probabilities over time. The "wedge of death" typically grows to dominate, showing that for most reasonable withdrawal rates, you are far more likely to die with money remaining than to run out.

**Why this matters:** The FIRE community often fixates on 95%+ success rates, leading to excessive frugality. Incorporating mortality shows that a 90% success rate over 50 years may actually be a 97%+ success rate when accounting for the probability that you won't live that long. This is a feature no other free calculator offers in an integrated way.

### 3.8 Tax & Account Strategy Module

**Account Types Supported:**
- Traditional 401(k) / 403(b) / 457(b) — pre-tax contributions, taxed on withdrawal
- Roth 401(k) / Roth 403(b) — after-tax contributions, tax-free growth and withdrawal
- Traditional IRA — deductible or non-deductible
- Roth IRA — contributions always accessible, conversions accessible after 5 years
- Taxable Brokerage — capital gains treatment, qualified dividends, cost basis tracking
- HSA — triple tax advantage, can be used for medical or general expenses after 65
- 529 — education savings
- Pension / Defined Benefit — fixed income stream starting at specified age
- Social Security — estimator based on earnings record or manual entry
- Real Estate — rental income and property value
- Cash / Money Market / I-Bonds

**Roth Conversion Ladder Planner:**
This is a critical feature for early retirees accessing 401(k)/IRA funds before age 59½.

Inputs:
- Traditional IRA/401(k) balance
- Roth IRA balance (contributions vs. conversions with dates)
- Taxable brokerage balance
- Cash reserves
- Expected annual spending in early retirement
- Tax filing status and state
- Expected income from other sources (part-time work, dividends, etc.)

Engine:
1. For each year from retirement to age 59½ (and beyond):
2. Calculate optimal Roth conversion amount to fill a target tax bracket (default: top of 12% bracket)
3. Show the 5-year clock for each conversion tranche
4. Calculate the "bridge" funding needed from taxable/cash/Roth contributions during the 5-year wait
5. Show when each conversion tranche becomes penalty-free
6. Calculate total lifetime taxes under the conversion strategy vs. alternatives

Output:
- Year-by-year Roth conversion plan
- Tax bracket visualization per year
- Bridge funding requirements
- Side-by-side comparison: Roth ladder vs. 72(t) SEPP vs. taxable-only drawdown
- Running balance of each account type over time

**ACA Subsidy Optimizer:**
For early retirees between retirement and age 65 (Medicare eligibility).

Inputs:
- Household size
- State
- Expected healthcare needs (bronze/silver/gold preference)
- Income from all sources (must be coordinated with Roth conversion planner)

Engine:
- Calculate MAGI impact of each dollar of Roth conversion
- Model premium tax credits at various MAGI levels
- Find the MAGI level that maximizes the combined benefit of Roth conversion tax savings minus ACA subsidy reduction
- Show the "cliff" (400% FPL) if applicable, and the effective marginal tax rate including lost subsidies

Output:
- Optimal conversion amount that balances tax savings and ACA subsidies
- Health insurance cost at various MAGI levels
- Visual: effective marginal tax rate curve including subsidy phase-out
- Net benefit chart: conversion tax savings vs. subsidy loss

**Social Security Optimizer:**
Inputs:
- Estimated benefit at age 62, FRA (67), and 70 (from SSA statement or estimated)
- Spouse's benefits
- Other income in retirement
- Life expectancy estimate

Engine:
- Calculate break-even ages for claiming at 62 vs. FRA vs. 70
- Model spousal and survivor benefit strategies
- NPV analysis incorporating mortality probabilities
- Integrate with overall withdrawal plan — how does SS timing affect portfolio drawdown?

Output:
- Break-even chart: cumulative benefits by claiming age
- NPV comparison with mortality weighting
- Recommended claiming strategy with rationale
- Impact on portfolio longevity

**Drawdown Sequence Optimizer:**
Determine the optimal order to withdraw from different account types.

Common strategies:
1. Taxable first → Traditional → Roth (conventional wisdom)
2. Fill low tax brackets with Traditional, use Roth for excess
3. Roth bucket for large one-time expenses
4. HSA last (longest tax-free compounding)

Engine runs all permutations and shows which sequence produces the lowest lifetime tax bill and highest terminal portfolio value.

### 3.9 Scenario Lab

**Side-by-side comparison:**
Create up to 4 scenarios with different assumptions. Each scenario has its own set of inputs. Charts overlay or display in parallel.

Example scenarios:
- "Retire at 45 vs. 50 vs. 55"
- "3.5% SWR vs. 4% SWR vs. GK guardrails at 5%"
- "Sell the house and rent vs. pay off the mortgage"
- "Spouse keeps working 5 more years"

**Sensitivity Analysis ("What breaks my plan?"):**
Tornado chart showing which variables have the most impact on success rate:
- Withdrawal rate
- Sequence of returns (first-decade returns)
- Inflation
- Longevity
- Healthcare costs
- Tax rate changes
- Market returns

**"One More Year" Analysis:**
Show the marginal benefit of working one additional year:
- Additional savings accumulated
- One fewer year of withdrawals
- Higher Social Security benefit
- Portfolio growth during the extra year
- Change in success rate
- Compute "hourly rate" of the extra year (additional lifetime spending ÷ hours worked)

**Geographic Arbitrage Calculator:**
Compare cost of living across locations. Impact on FIRE number if you move. Integrate with state tax differences. Model international scenarios (tax treaties, foreign income exclusion, healthcare costs abroad).

### 3.10 Dashboard & Progress Tracking

**Net Worth Tracker:**
- Manual entry of account balances (monthly or when changed)
- Historical chart of net worth over time
- Overlay actual progress on top of projected accumulation curve
- Breakdown by account type (stacked area chart)
- Savings rate calculation: (Income − Spending) / Income

**FI Progress Dashboard:**
- Large, clear "% to FI" metric for each FIRE type
- Estimated FI date based on current trajectory
- "On track / Behind / Ahead" indicator with trend
- Milestone celebrations (25%, 50%, 75%, Coast FI reached, etc.)

**Data persistence:**
- Free tier: IndexedDB (local browser storage, no account needed). One scenario at a time. Data does not persist across devices.
- Pro tier: Cloud storage via authenticated account (Supabase or Firebase). Unlimited saved scenarios, synced across devices. Full data export (JSON, CSV).
- All tiers: Shareable URL encoding for any scenario (encodes all inputs in URL parameters, like Engaging Data)

---

## 4. DATA ARCHITECTURE

### 4.1 Historical Market Data

All data stored as static JSON files bundled with the app. Updated annually (or with a simple data-refresh script).

```
/data/
  shiller.json          — Monthly: date, S&P price, dividend, earnings, CPI, 
                           GS10 (10yr treasury), CAPE ratio (1871–present)
  returns_monthly.json  — Monthly total real returns for: US large cap, US small cap, 
                           US small cap value, 10yr Treasury, corporate bonds, 
                           TIPS, gold, international developed, emerging markets, REITs
  mortality.json        — SSA actuarial life tables by age and sex
  tax_brackets.json     — Federal tax brackets (current year + historical)
  state_taxes.json      — State income tax rates and rules
  aca_poverty_level.json — Federal poverty level by household size
  aca_premiums.json     — Benchmark silver plan costs by state/age (updated annually)
```

### 4.2 User Data Model

```typescript
interface UserProfile {
  id: string;
  name: string;
  age: number;
  retirementAge: number | null;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  state: string;
  householdSize: number;
  partner?: {
    name: string;
    age: number;
    retirementAge: number | null;
    socialSecurityBenefit: SocialSecurityInput;
  };
}

interface Account {
  id: string;
  name: string;
  type: AccountType; // '401k' | 'roth_401k' | 'traditional_ira' | 'roth_ira' | 'taxable' | 'hsa' | '529' | 'cash' | 'real_estate' | 'other'
  currentBalance: number;
  annualContribution: number;
  employerMatch?: { percentage: number; upTo: number };
  assetAllocation: { stocks: number; bonds: number; other: number };
  expenseRatio: number; // annual fee drag
  costBasis?: number; // for taxable accounts
  rothContributions?: number; // for Roth IRA — direct contributions (always accessible)
  rothConversions?: RothConversion[]; // for Roth IRA — each with date and amount
}

interface RothConversion {
  date: Date;
  amount: number;
  taxPaid: number;
}

interface CashFlowEvent {
  id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number; // annual
  startAge: number;
  endAge: number | null; // null = indefinite
  inflationAdjusted: boolean;
  taxable: boolean;
}

interface Scenario {
  id: string;
  name: string;
  profile: UserProfile;
  accounts: Account[];
  cashFlows: CashFlowEvent[];
  annualExpenses: number;
  retirementExpenses: number; // may differ from pre-retirement
  withdrawalStrategy: WithdrawalStrategy;
  assetAllocationGlidepath: GlidepathPoint[];
  simulationSettings: SimulationSettings;
  socialSecurity: SocialSecurityInput;
}

interface WithdrawalStrategy {
  type: 'fixed' | 'cape_dynamic' | 'guyton_klinger' | 'vpw' | 'constant_pct' | 'rmd' | 'floor_ceiling' | 'spending_smile';
  initialRate?: number;
  capeParams?: { a: number; b: number };
  gkParams?: { guardrailWidth: number; adjustmentSize: number; suspendCapPreservationYears: number };
  floorCeiling?: { floor: number; ceiling: number };
  spendingDeclineRate?: number;
}

interface SimulationSettings {
  retirementDuration: number; // years
  simulationType: 'historical' | 'monte_carlo_parametric' | 'monte_carlo_bootstrap' | 'monte_carlo_block';
  monteCarloTrials: number;
  rebalanceFrequency: 'monthly' | 'quarterly' | 'annually';
  finalValueTarget: number; // 0 = survival, 0.25 = 25% preservation, 1.0 = full
  inflationModel: 'fixed' | 'historical' | 'stochastic';
  fixedInflation: number;
  feeDrag: number;
}
```

---

## 5. SIMULATION ENGINE SPECIFICATIONS

### 5.1 Historical Backtesting Algorithm

```
For each starting month M in dataset (1871-01 to latest):
  portfolio = initial_balance
  withdrawal = initial_balance × SWR
  
  For each month i = 0 to (retirement_duration × 12):
    // Apply returns
    stock_return = shiller_data[M + i].real_stock_return_monthly
    bond_return = shiller_data[M + i].real_bond_return_monthly
    portfolio_return = stock_allocation × stock_return + bond_allocation × bond_return
    portfolio = portfolio × (1 + portfolio_return) - fees_monthly
    
    // Apply withdrawal (monthly)
    monthly_withdrawal = apply_withdrawal_strategy(strategy, portfolio, withdrawal, month_i, cape_at_M+i)
    portfolio = portfolio - monthly_withdrawal
    
    // Apply supplemental cash flows
    portfolio = portfolio + net_supplemental_cash_flows(month_i)
    
    // Rebalance if scheduled
    if rebalance_due(i, frequency):
      rebalance(portfolio, target_allocation_at_year(i/12))
    
    // Check for failure
    if portfolio <= 0:
      record_failure(starting_month=M, failed_at_month=i)
      break
  
  if portfolio > 0:
    record_success(starting_month=M, terminal_value=portfolio)

success_rate = successes / total_periods
```

### 5.2 Monte Carlo Algorithm

```
For trial = 1 to N:
  portfolio = initial_balance
  
  For year = 1 to retirement_duration:
    if mode == 'parametric':
      stock_return = random_normal(mean=stock_mean, sd=stock_sd)
      bond_return = random_normal(mean=bond_mean, sd=bond_sd)
      inflation = random_normal(mean=inflation_mean, sd=inflation_sd)
    
    elif mode == 'bootstrap':
      random_year = random_choice(historical_years)
      stock_return = historical_stock_return[random_year]
      bond_return = historical_bond_return[random_year]
      inflation = historical_inflation[random_year]
    
    elif mode == 'block_bootstrap':
      // Sample 5-year blocks, stitch together
      ...
    
    real_return = stock_alloc × stock_return + bond_alloc × bond_return - inflation
    portfolio = portfolio × (1 + real_return)
    
    withdrawal = apply_withdrawal_strategy(...)
    portfolio -= withdrawal
    portfolio += supplemental_cash_flows(year)
    
    if portfolio <= 0:
      record_failure(trial, year)
      break
  
  record_terminal_value(trial, portfolio)
```

### 5.3 CAPE-Based Dynamic Withdrawal

Implementation per ERN SWR Series Part 11/18/54:

```
withdrawal_rate = a + b × (1 / CAPE)

Where:
  a = baseline withdrawal rate component (default 0.0175 for 80/20 portfolio)
  b = CAPE sensitivity coefficient (default 0.5)
  CAPE = Shiller Cyclically Adjusted Price-to-Earnings ratio at current date

annual_withdrawal = portfolio_value × withdrawal_rate

// With supplemental cash flows:
net_withdrawal = max(0, annual_withdrawal - supplemental_income)

// With partial depletion target:
// Adjust 'a' upward based on amortization schedule incorporating final value target
```

### 5.4 Guyton-Klinger Implementation

```
year_1:
  withdrawal = portfolio × initial_rate
  base_rate = initial_rate

year_n (n > 1):
  proposed_withdrawal = previous_withdrawal × (1 + CPI_inflation)
  current_rate = proposed_withdrawal / current_portfolio
  
  // Modified Withdrawal Rule: skip inflation adjustment if returns were negative
  // AND current_rate > initial_rate
  if portfolio_return_last_year < 0 AND current_rate > initial_rate:
    proposed_withdrawal = previous_withdrawal  // no CPI adjustment
    current_rate = proposed_withdrawal / current_portfolio
  
  // Capital Preservation Rule (not in final 15 years)
  if years_remaining > 15 AND current_rate > initial_rate × (1 + guardrail_width):
    proposed_withdrawal = proposed_withdrawal × (1 - adjustment_size)
  
  // Prosperity Rule
  if current_rate < initial_rate × (1 - guardrail_width):
    proposed_withdrawal = proposed_withdrawal × (1 + adjustment_size)
  
  withdrawal = proposed_withdrawal
```

---

## 6. VISUALIZATION SPECIFICATIONS

### 6.1 Chart Types Required

1. **Portfolio Projection Line Chart** — Main accumulation/decumulation chart with fill bands for percentile ranges
2. **Fan Chart** — All historical paths overlaid, with percentile bands highlighted
3. **Success Rate Gauge** — Large circular gauge showing % success (with color: green >90%, yellow 80-90%, red <80%)
4. **Heat Map** — Withdrawal rate × CAPE ratio → success rate
5. **Sankey Diagram** — Annual cash flow visualization (income → taxes → expenses → savings → investments)
6. **Tornado Sensitivity Chart** — Horizontal bar chart showing impact of each variable on success rate
7. **Area Chart ("Wedge")** — Rich/Broke/Dead stacked probabilities over time
8. **Histogram** — Distribution of terminal portfolio values or years-to-depletion
9. **Tax Bracket Waterfall** — Year-by-year stacked bar showing income in each tax bracket
10. **FIRE Thermometer/Progress Bar** — Visual % to FI for each FIRE type
11. **Withdrawal Comparison Chart** — Overlaid line charts of annual withdrawal amounts under different strategies
12. **Social Security Break-even Chart** — Cumulative benefits by claiming age
13. **Roth Ladder Timeline** — Gantt-style chart showing conversion tranches and their 5-year clocks
14. **Net Worth Over Time** — Stacked area by account type

### 6.2 Chart Library

Recommended: **Recharts** (React) or **Chart.js** for standard charts, **D3.js** for the Sankey diagram and custom visualizations. All charts must be responsive, support dark mode, and export to PNG/PDF.

### 6.3 Interactive Features

- Drag sliders to change inputs → charts update in real-time (debounced at 100ms)
- Hover on any chart point to see exact values
- Click on a historical backtest path to see details for that starting year
- Pinch-to-zoom on mobile
- Toggle between nominal and real (inflation-adjusted) values

---

## 7. TECHNOLOGY STACK RECOMMENDATION

### 7.1 Frontend
- **Framework:** Next.js 15 (React, App Router) — SSR for SEO on educational pages, client-side for calculator
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui component library
- **Charts:** Recharts for standard, D3.js for custom (Sankey, heatmap)
- **State Management:** Zustand (lightweight, works well with persistence)
- **Data Persistence:** IndexedDB via Dexie.js (local-first)
- **URL Sharing:** Compressed JSON in URL parameters (using lz-string compression)

### 7.2 Computation
- **Simulation Engine:** Web Workers (offload to background thread so UI stays responsive during 10,000+ Monte Carlo trials)
- **Historical Data:** Static JSON bundled at build time, lazy-loaded
- **Math:** No external math library needed for core calculations; use native JS. Optional: math.js for matrix operations if adding correlation-based Monte Carlo

### 7.3 Backend (Required for Pro tier)
- **Serverless:** Vercel Edge Functions or Cloudflare Workers
- **Database:** Supabase (Postgres) or Firebase for user accounts and saved scenarios
- **Auth:** OAuth (Google, GitHub, email/password) for Pro accounts
- **Payments:** Stripe for subscription and lifetime deal processing
- **Free tier:** No backend needed — runs entirely client-side with local storage

### 7.4 Data Pipeline
- **Shiller Data Update:** Python script to fetch latest from http://www.econ.yale.edu/~shiller/data.htm, transform to JSON
- **Mortality Tables:** Python script to fetch from SSA, transform to JSON
- **Tax Brackets:** Manual update annually (or scrape from IRS)

---

## 8. DEVELOPMENT PHASES

### Phase 1: MVP — Free Tier Core Calculator (Weeks 1–4)

**Goal:** Ship the free tier — a working FIRE calculator that beats Networthify and the basic FIRE calculators. This is the viral growth engine.

Deliverables:
- Landing page with Quick FIRE Number calculator (no account required)
- FIRE Type Quiz
- Accumulation engine (basic — single account, single savings rate)
- Time-to-FI chart
- Savings rate table (Networthify-style)
- Coast FIRE calculator
- Basic mobile-responsive design
- Shareable URL for scenarios
- Educational tooltips on all inputs
- Clear but non-aggressive "Unlock more with Pro" upgrade prompts on gated features

### Phase 2: Historical Engine + Pro Tier Launch (Weeks 5–8)

**Goal:** Match cFIREsim/FIRECalc capabilities AND launch the Pro tier with payment infrastructure. This is the first monetization milestone.

Deliverables:
- **Pro tier infrastructure:** User authentication (OAuth + email), Stripe integration for monthly/annual/lifetime billing, account dashboard
- Historical backtesting engine (Shiller data, 1871–present) *[Pro]*
- Fixed withdrawal rate analysis *[Pro]*
- Success rate calculation and display *[Pro]*
- Fan chart of all historical paths *[Pro]*
- Multiple asset allocations (stocks/bonds) *[Pro]*
- Supplemental cash flows (pension, SS, part-time income) *[Pro]*
- Heat map (SWR × duration) *[Pro]*
- Glidepath support (changing allocation over time) *[Pro]*
- Pricing page with clear free vs. Pro comparison
- 14-day free trial of Pro (no credit card required) to drive conversion

### Phase 3: Advanced Withdrawal Strategies (Weeks 9–12)

**Goal:** Exceed any single existing tool in withdrawal analysis.

Deliverables:
- All 8 withdrawal strategies implemented
- CAPE-based dynamic withdrawal (ERN methodology)
- Guyton-Klinger guardrails
- VPW
- Strategy comparison view (side-by-side)
- Monte Carlo simulation engine (parametric + bootstrap)
- "Rich, Broke, or Dead" mortality-integrated dashboard
- Sequence-of-returns risk visualizer

### Phase 4: Tax & Account Intelligence (Weeks 13–18)

**Goal:** Tax-aware planning that rivals paid tools.

Deliverables:
- Multiple account type support (401k, IRA, Roth, taxable, HSA)
- Roth conversion ladder planner with 5-year clock visualization
- Tax bracket waterfall chart
- ACA subsidy optimizer
- Social Security claiming optimizer
- Drawdown sequence optimizer
- State tax handling
- Effective marginal rate calculator (including ACA subsidy phase-out)

### Phase 5: Scenario Lab & Tracking (Weeks 19–22)

**Goal:** Full planning and tracking capabilities.

Deliverables:
- Side-by-side scenario comparison (up to 4)
- Sensitivity analysis / tornado chart
- "One More Year" calculator
- Geographic arbitrage calculator
- Net worth tracker with historical entries
- Progress dashboard (% to FI for each type)
- Data export/import (JSON, CSV)
- Dark mode

### Phase 6: Polish & Community (Weeks 23–26)

**Goal:** Production-ready, community-tested.

Deliverables:
- Comprehensive educational content (glossary, explainers)
- Interactive tutorials for each module
- Performance optimization (Web Workers for simulations)
- Accessibility audit (WCAG 2.1 AA)
- SEO optimization
- Lifetime deal launch promotion
- Sankey cash-flow diagram
- International tax presets (Canada, UK, Australia, Germany)
- Print-friendly reports

---

## 9. RESEARCH REFERENCES

### 9.1 Academic / Foundational

- **Bengen, W.P. (1994)** — "Determining Withdrawal Rates Using Historical Data," Journal of Financial Planning. *Original SAFEMAX/4% rule research.*
- **Cooley, P.L., Hubbard, C.M., & Walz, D.T. (1998)** — "Retirement Savings: Choosing a Withdrawal Rate That Is Sustainable," AAII Journal. *The Trinity Study.*
- **Pfau, W.D. (2010, 2013, 2015)** — Updated Trinity Study results through 2009; "Making Sense of Variable Spending Strategies for Retirees." *Extended data and broader frameworks.*
- **Guyton, J.T. & Klinger, W.J. (2006)** — "Decision Rules and Maximum Initial Withdrawal Rates," FPA Journal. *Guardrails methodology.*
- **Klinger, W.J. (2016)** — "Guardrails to Prevent Potential Retirement Portfolio Failure," FPA Journal. *Updated guardrails research.*
- **Blanchett, D. (2014)** — "Estimating the True Cost of Retirement," Morningstar Investment Management. *Retirement spending smile.*
- **Kitces, M. (2012, 2020)** — Research on CAPE-based SWR predictions, Ratcheting SWR, and "The 4% Rule Is Not Safe in a Low-Yield World." *Valuation-dependent SWR.*
- **Morningstar (2025)** — Annual retirement spending report. *Current prudent baseline: 3.7% for 30-year fixed withdrawal.*
- **Scott, J.S., Sharpe, W.F., & Watson, J.G. (2008)** — Critique of static withdrawal strategies. *Economic inefficiency argument.*

### 9.2 Key FIRE Blogs & Tools (Research Sources)

- **Early Retirement Now (Big ERN)** — earlyretirementnow.com — 63+ part Safe Withdrawal Rate Series. CAPE-based dynamic withdrawal methodology. Google Sheet SWR Toolbox. The single most rigorous FIRE-specific withdrawal rate research.
- **Mad Fientist** — madfientist.com — Roth conversion ladder strategy, tax optimization, FI Laboratory tracking tool.
- **Mr. Money Mustache** — mrmoneymustache.com — "The Shockingly Simple Math Behind Early Retirement." Savings rate as the primary driver.
- **Root of Good** — rootofgood.com — Roth conversion ladder real-world implementation, ACA subsidy optimization.
- **Physician on FIRE** — physicianonfire.com — Fat FIRE perspectives, ProjectionLab advocacy.
- **Can I Retire Yet?** — caniretireyet.com — ACA vs. Roth conversion optimization research.
- **The Poor Swiss** — thepoorswiss.com — Updated Trinity Study through 2025, FIRE type taxonomy.
- **Money Flamingo** — moneyflamingo.com — Flamingo FI concept originator, Semi-FI calculator.
- **The Fioneers** — thefioneers.com — Slow FI philosophy.
- **Go Curry Cracker** — gocurrycracker.com — Tax optimization, zero-tax retirement strategies.
- **Financial Samurai** — financialsamurai.com — Fat FIRE and Barista FIRE taxonomy.
- **Engaging Data** — engaging-data.com — FIRE calculator and Trinity Study visualizer. Excellent reference for chart design.
- **Living a FI** — livingafi.com — Calculator aggregation and FI lifecycle documentation.
- **White Coat Investor** — whitecoatinvestor.com — High-income FIRE, withdrawal strategy comparisons.

### 9.3 Existing Tools Studied

- **ProjectionLab** (projectionlab.com) — Best-in-class UX, Monte Carlo, tax engine, scenario modeling. Paid. Closest competitor; our app should match its polish while being free and adding CAPE/GK strategies.
- **cFIREsim** (cfiresim.com) — Open-source, crowdsourced. Historical backtesting with detailed control. GK guardrails. Spreadsheet-like UX.
- **FIRECalc** (firecalc.com) — Original historical backtester (since 2007). Simple but reliable. No Monte Carlo. Dated UI.
- **FI Calc** (ficalc.app) — Clean, modern UI. Historical backtesting. Good for VPW analysis. Limited features.
- **ERN SWR Toolbox** (Google Sheet) — Most analytically rigorous. CAPE-based dynamic withdrawal, supplemental cash flows, mortality integration. But it's a spreadsheet — terrible UX.
- **Engaging Data** (engaging-data.com) — Beautiful interactive charts. Historical cycles + Monte Carlo. Good reference for visualization design.
- **WalletBurst** (walletburst.com) — Simple, clean FIRE calculator. Good for beginners.
- **Networthify** (networthify.com) — Savings-rate-focused. Iconic "savings rate → years to FI" table.
- **BridgeToFI** (bridgetofi.com) — Roth conversion ladder calculator. Niche but well-done.
- **Rich, Broke, or Dead** (engaging-data.com) — Mortality-integrated visualization. We incorporate this concept.
- **Portfolio Visualizer** (portfoliovisualizer.com) — Professional-grade Monte Carlo. Multi-asset. Not FIRE-specific.

### 9.4 Reddit Communities Referenced

- **r/financialindependence** (2.4M members) — Primary FIRE community. Common feature requests: better tax modeling, Roth ladder planning, international support, mobile-friendly tools.
- **r/leanfire** — Lean FIRE specific. Emphasis on low-cost living and minimal withdrawal rates.
- **r/fatFIRE** — Fat FIRE specific. Emphasis on high income, complex tax situations, estate planning.
- **r/CoastFIRE** — Coast FIRE specific. Need for "when can I stop saving?" calculators.
- **r/Bogleheads** — Investment philosophy community. Rigorous analysis of withdrawal strategies, VPW methodology.
- **r/ChubbyFIRE** — Middle ground between regular and Fat FIRE.

---

## 10. CRITICAL IMPLEMENTATION NOTES

### 10.1 Common Pitfalls to Avoid

1. **Don't use nominal returns without adjusting for inflation.** All projections should work in real (inflation-adjusted) dollars by default. Offer nominal as a toggle.

2. **Don't assume constant returns.** The #1 complaint about simple calculators is "7% average return every year." Variability matters enormously (sequence of returns risk). Historical backtesting and Monte Carlo are essential.

3. **Don't ignore taxes.** A $1M portfolio in a traditional 401(k) is worth much less than $1M in a Roth IRA. Tax-aware planning is a key differentiator.

4. **Don't treat the 4% rule as gospel.** It was designed for 30-year retirements with a 50/50 stock/bond mix. For 40-60 year horizons (FIRE), 3.25-3.5% is more appropriate (per ERN's research). The app should educate on this.

5. **Don't forget about healthcare.** For US early retirees (pre-Medicare), healthcare is often the #1 expense concern. ACA subsidy optimization is critical.

6. **Don't ignore the behavioral dimension.** A plan that requires a 45% spending cut during a downturn (Guyton-Klinger worst case) may be mathematically sound but psychologically impossible. Show users the worst-case spending trajectory, not just the success rate.

7. **Don't conflate historical backtesting with Monte Carlo.** They answer different questions. Historical: "Would this have worked in every past period?" Monte Carlo: "What is the probability distribution of outcomes given return assumptions?" Both are valuable; they should be clearly distinguished.

8. **Don't hard-code US assumptions.** Build the architecture for international support from day one. Tax presets, currency, and data sources should be modular.

### 10.2 Performance Requirements

- Quick FIRE calculator: results in < 100ms
- Historical backtest (150 years, monthly resolution, single scenario): < 500ms
- Monte Carlo (10,000 trials, 40-year horizon): < 3 seconds (use Web Workers)
- Monte Carlo (100,000 trials): < 15 seconds (with progress indicator)
- Chart rendering: < 200ms for initial paint, real-time updates on slider drag
- Page load (initial): < 2 seconds on 3G

### 10.3 Accessibility & Inclusivity

- All charts must have text alternatives (data tables accessible via screen reader)
- Color schemes must be colorblind-safe (use redundant encoding: color + pattern + label)
- WCAG 2.1 AA compliance
- Keyboard-navigable throughout
- Content available without JavaScript for educational pages (SSR)
- Support for multiple currencies and number formats
- Avoid assumptions about family structure (e.g., don't say "spouse" — use "partner")

### 10.4 Legal Disclaimer

Every page must include: "This tool is for educational and informational purposes only. It does not constitute financial, tax, or investment advice. Past performance does not guarantee future results. Consult a qualified financial professional before making financial decisions."

---

## 11. SUCCESS METRICS

Upon launch, the app should be evaluated against:

1. **Comprehensiveness:** Does it support all 8 withdrawal strategies, all FIRE types, Roth ladder, ACA optimization, and SS optimization in a single tool? (No competitor does this today.)
2. **Accuracy:** Do historical backtest results match cFIREsim and FIRECalc for identical inputs? (Build automated regression tests.)
3. **Usability:** Can a FIRE beginner get a meaningful result in under 60 seconds? Can an advanced user model a complex scenario in under 10 minutes?
4. **Community reception:** Post on r/financialindependence, r/leanfire, r/fatFIRE, Bogleheads forum. Target: front page of r/financialindependence.
5. **Performance:** All benchmarks in Section 10.2 met.
6. **Free-to-Pro conversion:** Target 3-5% of free users converting to Pro within 30 days. The free tier must be genuinely useful (so people share it) while making the Pro upgrade feel like an obvious next step (not a paywall trap).
7. **Revenue:** Target $5k MRR within 6 months, $15k MRR within 12 months. Lifetime deals will front-load revenue in the first few months.

---

*This document should be treated as the single source of truth for the FIRE calculator project. All design decisions, feature priorities, and technical choices should reference this spec. Update this document as requirements evolve.*
