# Jarlan — Page-by-Page Breakdown

## Shared shell (every page)

### Header
Sticky, frosted glass (`bg-background/75 backdrop-blur-xl`), `border-b`.
- Left: "Jarlan" (display font, links to `/`) + "FIRECALC" mono eyebrow (hidden on mobile)
- Center-right: primary nav pills (Home, Save, Spend, Learn, Pro★)
- Right: Plan Drawer trigger pill + theme toggle (sun/moon)
- Below header border: context-sensitive sub-nav (only when active group has sub-items)

### Footer
Minimal. `border-t bg-card/35`.
- Left: "For educational purposes only. Not financial advice."
- Right: lock icon + "Data stays in your browser"

### Plan Drawer
Sheet/bottom-drawer (Vaul). Triggered from header pill. Allows saving, loading, and switching named scenarios. Scenario state is stored in IndexedDB.

---

## Home `/`

**Purpose:** First answer in under 60 seconds. Route new users to the right deeper tool.

### Layout
Two-column workspace (hero calculator) above the fold. Three support sections below.

### QuickFireWorkspace
Split layout: inputs (left/top on mobile) + results (right/bottom).

**Inputs panel:**
- Portfolio balance (number input with $ formatting)
- Annual spending (number input)
- Savings rate (slider, 0-80%)
- Expected return (slider, 4-12%)
- Toggle: nominal vs. real (inflation-adjusted) mode
- Toggle: include partner / add accounts

**Results panel:**
- FIRE number — large display stat (ember tone)
- Years to FIRE — large display stat
- Safer comparison rate stat (4% vs. 3.5%)
- Brief explanatory copy linking to deeper tools
- CTA: "Open the full planner" → `/accumulation`

### Pathway section (below fold)
Eyebrow: "Choose your path"
Title: "Start from the question you actually have today"
3 journey cards in a 2-col grid (3rd wraps):
1. "Brand new to FIRE" → `/quiz` — Take the FIRE quiz
2. "Actively saving" → `/accumulation` — Open the full planner
3. "Close to retiring" → `/withdrawal` — Test retirement durability

### Capability section
Eyebrow: "What you can do"
Title: "A clear first answer, then deeper planning when you are ready"
5 cards in a 2-col/3-col grid — each links to a tool:
- Quick answer `/`
- FIRE type quiz `/quiz`
- Full planner `/accumulation`
- Retirement lab `/withdrawal`
- Decision support `/tax-strategy`

### Trust section
Eyebrow: "Why this feels different"
3 cards: progressive disclosure, research-backed defaults, designed for real decision moments

---

## Save — Your Plan `/accumulation`

**Purpose:** Full accumulation planner for people still building toward FI.

### Layout
PageHero → stat row → main chart → inputs panel → milestone section

### PageHero
Dark gradient. Headline stats inline or below:
- Years to FI, FIRE number, current savings rate

### Key stat row
4 StatCards across (responsive 2-col mobile): Years to FI (accent), FIRE number, current portfolio, annual savings

### Portfolio growth chart (ChartShell)
AreaChart: portfolio balance over time, stacked contributions vs. growth
- Milestone lines/annotations: Lean FIRE ($), Traditional FIRE ($), Fat FIRE ($)
- Toggle: show/hide contribution bands

### Account management
Add/remove accounts: Taxable, Roth IRA, Traditional 401k, HSA, Other
- Each account: name, balance, monthly contribution, expected return override
- Partner toggle: adds partner accounts

### Cash flow events
One-time or recurring income/expense events over the projection timeline
- Examples: home purchase, inheritance, sabbatical, college costs

### Assumptions panel
Collapsible: return rate, inflation rate, retirement age, safe withdrawal rate override

---

## Save — What if? `/save-what-if`

**Purpose:** Sensitivity analysis — "what happens if I save more or retire earlier?"

### Layout
Controls panel (sidebar or top bar) → comparison chart → delta stats

### Scenario comparison
Base plan vs. modified scenario
- Slider: savings rate delta (±% from base)
- Slider: return assumption delta
- Slider: target retirement age
- Toggle: partner income phase-out

### Results
Portfolio growth chart with two overlaid scenarios (base = ember, what-if = sky/blue)
- Delta stat cards: years gained/lost, portfolio delta at retirement, FIRE number shift

---

## Spend — Your Plan `/withdrawal`

**Purpose:** "Can I retire now?" — historical durability, Monte Carlo, strategy comparison.

### Layout
PageHero → key stats → historical backtest chart → Monte Carlo chart → strategy comparison → retirement checkup

### PageHero
Dark gradient. Badge: "Retirement Lab" or "Spend"
Key stats inline: Initial withdrawal rate, 30-yr success rate (historical), current CAPE

### Key stats row
StatCards: withdrawal rate (accent/danger based on threshold), success rate (success/warning/danger), portfolio, annual spending

### Historical backtest (ChartShell)
AreaChart: portfolio balance for each historical cohort starting year
- X-axis: retirement years elapsed
- Y-axis: portfolio value (normalized or nominal)
- Color: cohorts that succeeded (ember) vs. failed (danger/glow)
- Hover: show specific cohort start year and outcome

### Monte Carlo (ChartShell)
Fan chart: 10th/25th/50th/75th/90th percentile bands
- X-axis: years in retirement
- Y-axis: portfolio value
- Ember-to-faded gradient fills

### Withdrawal strategy comparison
Table or card grid comparing 4+ strategies:
- Constant dollar (4% rule)
- VPW (variable percentage withdrawal)
- CAPE-guided (Shiller PE ratio adjusted)
- Floor + upside (guardrails)
Columns: success rate %, average spending, worst-case spending

### Retirement checkup card
Year-over-year monitoring:
- Current withdrawal rate vs. last review
- CAPE movement since last review
- Status: On track / Watch / Adjust (with color coding)
- Deep link: "Stress-test in What if?"

---

## Spend — What if? `/scenario-lab`

**Purpose:** Guided explorer for "what if I spend differently in retirement?"

### Layout
Scenario selector (top) → chart + metrics (center) → controls panel (right or bottom) → compare mode toggle

### Scenario cards (top selector)
4 preset scenarios as pill tabs or card buttons:
1. Spend as planned (base)
2. Spend more (+10-20%)
3. Spend less (-10-20%)
4. Custom

Each shows: success rate badge, withdrawal rate, quick description

### Main chart area
Historical survival chart for the selected scenario
- Same AreaChart pattern as Your Plan, filtered to active scenario
- Stat cards: success rate, withdrawal rate, median portfolio end balance

### Controls panel
Spending adjustment slider (% from base)
Withdrawal strategy override (select)
Time horizon slider (20-40 years)
Inflation assumption

### Compare mode
Toggle to overlay 2-3 scenarios on the same chart
Scenario A vs. B delta callout

---

## Spend — Income plan `/tax-strategy`

**Purpose:** Advanced withdrawal sequencing and tax optimization.

### Layout
PageHero → tool tabs or sections

### Sections
1. **Account drawdown sequence** — drag-and-drop ordering: taxable → Roth → Traditional (or optimizer)
2. **Roth conversion ladder** — annual conversion amounts, tax bracket visualization
3. **ACA subsidy modeling** — income vs. cliff chart, recommended MAGI target
4. **Social Security timing** — breakeven chart for claiming ages (62/67/70)
5. **Effective tax rate projection** — bar chart by year showing tax drag

---

## Learn `/education`

**Purpose:** Educational library for FIRE concepts.

### Overview `/education`
Grid of article cards:
- Savings rate — why it matters more than income
- Withdrawal strategies — 4% rule, VPW, guardrails explained
- Coast FIRE — how partial FI changes the math
- Barista FIRE — semi-retirement as a strategy

### Article pages
Long-form with:
- PageHero (lighter, not always full dark)
- SectionHeading sections
- Inline StatCards for key numbers
- ChartShell with relevant interactive chart
- Deep links to the relevant tool ("Try this in the Spend calculator")

---

## Quiz `/quiz`

**Purpose:** Translate lifestyle preferences into a recommended FIRE path. Entry point for brand-new users.

### Layout
Full-page step wizard. One question per screen.

### Steps
1. **Stage** — Where are you? (Just starting / Actively saving / Getting close / Already retired)
2. **Risk tolerance** — Market drops feel like... (opportunity / discomfort / crisis)
3. **Flexibility** — If needed I could cut spending by... (0-10% / 10-25% / 25%+)
4. **Spending style** — My retirement lifestyle is... (lean/frugal / comfortable / abundant)
5. **Partners** — Planning for... (solo / couple)

### Results
FIRE type card: Traditional / Lean / Fat / Coast / Barista
- Explains why this type fits the answers
- Key number: target FIRE multiplier (e.g., 25x, 33x)
- CTA: "Build your plan" → relevant tool route

### Routing by stage
- Just starting / Actively saving → `/accumulation`
- Getting close → `/withdrawal`
- Already retired → `/withdrawal`

---

## Pro / Pricing `/pricing`

**Purpose:** Explain Pro tier value and convert.

### Layout
PageHero → feature comparison → pricing card(s) → FAQ or social proof

### Feature table
Two columns: Free vs. Pro
Key Pro features: advanced scenario comparison, Roth ladder planner, ACA modeling, Social Security optimizer, priority support

### Pricing card
Monthly / annual toggle
Price display (display font, large)
Stripe checkout CTA

---

## Account `/account`

**Purpose:** Manage subscription, export/import data.

### Sections
- Subscription status (active/inactive, renewal date)
- Data export (JSON download of all scenarios)
- Data import (restore from JSON)
- Danger zone: clear all local data

---

## Route → Component mapping

| Route | Main workspace component |
|-------|--------------------------|
| `/` | `QuickFireWorkspace` |
| `/accumulation` | `AccumulationWorkspace` |
| `/save-what-if` | `SaveWhatIfWorkspace` |
| `/withdrawal` | `CanIRetireWorkspace` |
| `/scenario-lab` | `WhatIfWorkspace` |
| `/tax-strategy` | `TaxStrategyWorkspace` |
| `/education` | `EducationOverview` |
| `/education/[slug]` | `EducationArticle` |
| `/quiz` | `FireTypeQuiz` |
| `/pricing` | `PricingPage` |
| `/account` | `AccountPage` |
