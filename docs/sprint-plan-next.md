# Next Sprint Plan — Gap Analysis & Priorities

## Current State Assessment

### What's BUILT (solid)
- Accumulation engine with tax-aware projections, milestones, stacked bar chart
- All 8 withdrawal strategies with historical backtesting (Shiller 1871-present)
- Monte Carlo (4 modes: parametric, bootstrap, block, regime-switching)
- Rich/Broke/Dead mortality overlay
- Tax strategy module (Roth ladder, SS optimizer, ACA, drawdown sequencing)
- Scenario Lab with sensitivity analysis
- Dashboard with net worth tracking + snapshots
- Education hub with glossary + research library
- FIRE quiz with stage detection + scenario mapping
- Plan Drawer with tax-aware inputs
- Web Workers for simulation offloading
- Pricing page with free/pro tiers + local trial
- Shareable URL scenarios

### What's MISSING or WEAK (gap from requirements)

---

## Sprint Priorities (Recommended Order)

### SPRINT A: "Polish What Exists" (High Impact, Low Effort)
*Goal: Make the existing features production-ready and consistent*

**A1. Mobile Responsiveness Pass**
- Requirements say "mobile-first responsive" — we haven't tested or optimized for mobile
- The Plan Drawer, stat cards, chart, and quiz all need responsive breakpoints
- Priority personas: Curious Beginner, Accumulator (discovery on phone)
- Effort: Medium

**A2. Shared Scenario Banner Bug Fix**
- The `?scenario=` param persists after load, causing the banner to stick
- Quick fix: clear URL param after loading shared scenario
- Effort: Small

**A3. Educational Tooltips on ALL Inputs**
- Requirements spec: "Educational tooltips on all inputs"
- We have some (?) icons but many inputs have no tooltip
- Every slider, every field in the drawer should explain what it means + cite research
- Effort: Medium

**A4. "Show Me the Math" on Every Output**
- Requirements principle: "Users can click 'Show me the math' on any output"
- We have flip cards on the landing tiles but NOT on withdrawal results, backtest outputs, tax estimates, etc.
- Add expandable formula/methodology sections to key outputs
- Effort: Medium

**A5. Print-Friendly Report**
- We have a print button but haven't tested the print output
- Should produce a clean single-page or multi-page report
- Effort: Small-Medium

---

### SPRINT B: "Withdrawal Module UX Overhaul" (High Impact, Medium Effort)
*Goal: Apply the same UX improvements we made to Plan to the Spend tab*

**B1. Withdrawal Lab Visual Refresh**
- Apply the same card styling, typography, and layout improvements we made to the Plan page
- The withdrawal module is the #1 Pro feature — it needs to look premium
- Effort: Medium

**B2. Strategy Comparison View**
- Req: "Side-by-side chart of withdrawal amounts over time for each strategy"
- Show average withdrawal, min year, max year, std dev, success rate, median terminal balance
- This is a table + overlaid line chart
- Effort: Medium

**B3. Fan Chart of All Historical Paths**
- Req: "All historical portfolio paths overlaid (10th/25th/50th/75th/90th percentiles)"
- The backtest engine computes this — we need a clean visualization
- Effort: Medium

**B4. Success Rate Heat Map Enhancement**
- Already exists but should show WR x CAPE ratio (not just WR x duration)
- Req: "Heat map: success rate by starting CAPE ratio and withdrawal rate"
- Effort: Small

---

### SPRINT C: "Data & Accuracy" (Critical for Credibility)
*Goal: Ensure numbers are correct and data is current*

**C1. Update Shiller Data to 2025/2026**
- Current data goes to 2023-09 — need to update to latest
- Run the Python update script or manually update shiller.json
- Effort: Small

**C2. Validate Backtest Results Against cFIREsim**
- Req: "Do historical backtest results match cFIREsim and FIRECalc for identical inputs?"
- Build automated regression tests with known inputs/outputs
- Critical for credibility when posting to r/financialindependence
- Effort: Medium

**C3. Monthly Returns Data**
- `/data/returns_monthly.json` is a placeholder — needs real multi-asset returns
- Required for: international equities, small cap value, REITs, TIPS, gold
- Effort: Medium

**C4. State Tax Accuracy**
- We estimate state tax at 5% flat — should use actual state rates
- `state_taxes.json` exists but may need verification
- Effort: Medium

---

### SPRINT D: "Visualization Gap" (Medium Impact, Medium Effort)
*Goal: Build the missing chart types from the requirements*

**D1. Sankey Cash Flow Diagram**
- Req: Income → Taxes → Expenses → Savings → Investments
- Needs D3.js — more complex than Recharts charts
- Impressive visual, good for marketing screenshots
- Effort: Large

**D2. Tornado Sensitivity Chart**
- Req: "Horizontal bar chart showing impact of each variable on success rate"
- The Scenario Lab has basic sensitivity — needs a proper tornado chart
- Effort: Medium

**D3. Tax Bracket Waterfall Chart**
- Req: Year-by-year stacked bar showing income in each tax bracket
- Tax strategy module would benefit from this
- Effort: Medium

**D4. Roth Ladder Timeline (Gantt-style)**
- Req: "Gantt-style chart showing conversion tranches and their 5-year clocks"
- Makes the Roth conversion planner much more intuitive
- Effort: Medium

**D5. Social Security Break-Even Chart**
- Req: "Cumulative benefits by claiming age"
- The SS optimizer has the data — needs a clean chart
- Effort: Small-Medium

---

### SPRINT E: "Pro Infrastructure" (Revenue Critical)
*Goal: Actually gate features and accept payments*

**E1. Stripe Integration**
- Current Pro trial is local-only — no real payment processing
- Need: Stripe checkout for monthly ($8-12), yearly, and lifetime ($149-199)
- Effort: Large

**E2. Authentication (OAuth)**
- Req: Pro tier requires account for cloud sync
- Google + email/password auth via Supabase or Firebase
- Effort: Large

**E3. Cloud Sync for Pro Users**
- Save scenarios to server, sync across devices
- Effort: Large

**E4. Feature Gating**
- Ensure Pro features show upgrade prompts (not hard blocks)
- "Clear but non-aggressive upgrade prompts on gated features"
- Effort: Medium

---

### SPRINT F: "Community Launch Prep" (Growth)
*Goal: Ready for r/financialindependence launch*

**F1. SEO for Educational Pages**
- SSR the education hub, glossary, and key landing pages
- Meta tags, OpenGraph, structured data
- Effort: Medium

**F2. Performance Benchmarks**
- Req: Quick calc <100ms, backtest <500ms, Monte Carlo 10K <3s
- Profile and optimize — Web Workers already exist
- Effort: Medium

**F3. Accessibility Audit (WCAG 2.1 AA)**
- Keyboard navigation, screen reader, color contrast
- Effort: Medium-Large

**F4. Data Export/Import**
- JSON and CSV export of scenarios
- Import from other tools (cFIREsim format?)
- Effort: Medium

---

## Recommended Sprint Order

| Priority | Sprint | Rationale |
|----------|--------|-----------|
| 1 | **A** (Polish) | Highest ROI — fixes gaps without new features |
| 2 | **C** (Data) | Accuracy is credibility — can't launch with wrong numbers |
| 3 | **B** (Withdrawal UX) | Pro's flagship feature needs to look premium |
| 4 | **E** (Pro Infra) | Can't monetize without payments |
| 5 | **F** (Launch Prep) | Gets us ready for community launch |
| 6 | **D** (Visualizations) | Nice-to-have, impressive but not blocking |

## What We Intentionally Changed from the Spec
- **FIRE types reduced from 8 → 5** (removed Chubby, Flamingo, Slow — justified in fire-types.md)
- **Lean FIRE is a philosophy, not a milestone** — no arbitrary $40K threshold
- **Tab names changed**: Start→Home, Plan→Save, Decide→Spend (better mental model)
- **Input model changed**: Drawer-based instead of inline forms (global access from any page)
- **Tax-aware by default**: Savings rate shows after-tax, not gross
