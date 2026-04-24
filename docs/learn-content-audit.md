# Learn Section — Content Audit

**Date:** April 2026  
**Published:** 4 articles  
**Missing:** 26 articles  
**Referenced concepts with no article:** ~56

---

## What Exists (Published)

| Slug | Title | Quality |
|---|---|---|
| `/education/savings-rate` | Savings Rate | Full — personalized callouts, comparative table, benchmarks |
| `/education/withdrawal-strategies` | Withdrawal Strategies | Full — 8 strategies, lenses, interactive ranker, research refs |
| `/education/coast-fire` | Coast FIRE | Full — interactive charts, dynamic coast target, sequence risk |
| `/education/barista-fire` | Barista FIRE | Full — scenario modeling, part-time income controls, charts |

Plus: 4-term glossary (SWR, CAPE, Coast FIRE, Sequence Risk), 15 research links, 4 methodology notes.

---

## Roadmap — Articles to Write

Priority order: SEO value × UI reference density × user comprehension gap.

### Tier 1 — Write Next (directly referenced, high search volume)

| Slug | Title | Why it's Tier 1 |
|---|---|---|
| `/education/sequence-of-returns` | Sequence of Returns Risk | Already "coming soon" on Learn page; referenced in both Coast + Barista articles; top-10 FIRE search term |
| `/education/fat-fire` | Fat FIRE | Referenced in quiz results, home page FIRE comparison grid |
| `/education/lean-fire` | Lean FIRE | Same — quiz, home page grid |
| `/education/the-4-percent-rule` | The 4% Rule | Most-searched FIRE concept on the internet; "Based on the standard 4% rule" label on FIRE number card |
| `/education/social-security-timing` | Social Security: When to Claim | SS import feature just shipped; Income Plan page leads with SS claiming; break-even math needs explanation |
| `/education/roth-ladder` | The Roth Conversion Ladder | Explicitly named section on Income Plan page (/tax-strategy) |

### Tier 2 — High SEO, App References Exist

| Slug | Title | Why |
|---|---|---|
| `/education/aca-early-retirement` | ACA Planning for Early Retirees | Section on Income Plan page; MAGI cliff, subsidy optimization is a major early-retirement concern |
| `/education/monte-carlo` | Monte Carlo vs. Historical Backtest | Monte Carlo is a named section on Can I Retire page; users see "87% success rate" with no explanation of what that means |
| `/education/account-types` | 401(k), Roth IRA, and HSA Explained | Referenced in every Accounts drawer input; contribution limits, tax treatment, order of operations |
| `/education/tax-efficient-withdrawal` | Tax-Efficient Withdrawal Sequencing | Already "coming soon"; named section on Income Plan page (drawdown sequencing) |
| `/education/cape-ratio` | The CAPE Ratio and Valuation-Aware Withdrawals | CAPE strategy is one of 4 named strategies on Can I Retire page |
| `/education/guyton-klinger` | Guyton-Klinger Guardrails | Named strategy on Can I Retire; users pick it without understanding the guardrail mechanic |

### Tier 3 — Supporting SEO + Depth

| Slug | Title | Why |
|---|---|---|
| `/education/hsa-triple-advantage` | The HSA Triple Tax Advantage | Tooltip calls it "triple tax advantage" — deserves full explanation |
| `/education/self-employed-retirement` | SEP-IRA and Solo 401(k) | Self-employed filing type in drawer; W-2 vs SE has different account access |
| `/education/real-vs-nominal-returns` | Real vs. Nominal Returns | Every assumption slider is labeled "real return" — most users don't know what real means |
| `/education/investment-fees` | How Investment Fees Erode Your Portfolio | "Fee drag" slider in Growth assumptions; compound drag over 20 years is significant |
| `/education/lifestyle-creep` | Lifestyle Creep and Expense Growth | "Lifestyle creep" slider in Growth assumptions with tooltip |
| `/education/fire-number` | How Your FIRE Number Is Calculated | FIRE Number is the hero metric on Your Plan page; the math (expenses ÷ SWR) deserves a full explainer |
| `/education/floor-ceiling` | Floor & Ceiling Withdrawal Strategy | 4th named strategy on Can I Retire page |
| `/education/spending-smile` | The Retirement Spending Smile | Referenced in Withdrawal Strategies article; named pattern |

### Tier 4 — Completeness (lower urgency)

| Slug | Title |
|---|---|
| `/education/dual-income-fire` | Dual-Income FIRE Planning |
| `/education/longevity-risk` | Longevity Risk and Plan Horizon |
| `/education/rebalancing` | Portfolio Rebalancing in Retirement |
| `/education/income-growth` | Income Growth Assumptions in FIRE Planning |
| `/education/terminal-value` | Terminal Value: Spend to Zero vs. Estate Preservation |
| `/education/mega-backdoor-roth` | The Mega Backdoor Roth |
| `/education/drawdown-sequencing` | Drawdown Sequencing: Which Accounts to Tap First |
| `/education/fat-vs-lean-fire` | Fat FIRE vs. Lean FIRE: Choosing Your Number |

---

## Concepts Referenced with No Article (by source)

### From tooltip text in plan drawer / UI
- Pre-tax deductions reduce taxable income
- FICA — SS 6.2% + Medicare 1.45% (SE pays both halves)
- Standard deduction ($14.6K single / $29.2K MFJ)
- HSA triple tax advantage
- 401(k) contribution limits + catch-up at 50
- Roth IRA income limits
- Employer match vesting schedules
- Monthly benefit at 62 (~30% reduction from FRA)
- Delayed retirement credits (~24% bonus at 70)
- Primary Insurance Amount (PIA)
- Lifestyle creep slider
- Fee drag slider
- Real return assumption
- Inflation in planning
- Plan horizon / mortality
- Terminal target
- Health status and mortality weighting
- Filing status impact on brackets
- Income growth rate assumption

### From Income Plan page (/tax-strategy) sections
- Social Security claiming (currently has cards, no explainer link)
- Drawdown sequencing
- Roth conversion ladder
- ACA pressure

### From Can I Retire page (/withdrawal) sections
- Monte Carlo (open section, no explainer link)
- Historical success rate (what does 87% mean?)
- Strategy comparison (CAPE, Guyton-Klinger, Floor-Ceiling, Fixed)
- Rich/Broke/Dead chart (mortality-weighted outcomes)

### From home page "What's Inside" cards
- "Stress-test retirement" → links to /withdrawal (no Learn counterpart)
- "Tax-aware projections" → links to /education/savings-rate (partial)
- "Year-by-year milestones" → links to /education/coast-fire (partial)
- "What-if analysis" → no Learn counterpart

### From FIRE type quiz results
- Fat FIRE recommendation card (no article)
- Lean FIRE recommendation card (no article)
- Barista FIRE recommendation card → /education/barista-fire ✅
- Coast FIRE recommendation card → /education/coast-fire ✅
- Traditional FIRE → no article (closest is 4% Rule, which doesn't exist yet)

---

## Article Template (for consistency)

All Tier 1–2 articles should follow the pattern of existing articles:

1. **Lede** — one punchy paragraph answering "what is this and why does it matter"
2. **The math** — the actual formula or mechanism, no hand-waving
3. **Your numbers** — personalized callout from the user's scenario (use `useScenarioStore`)
4. **The tradeoffs** — what this approach costs/risks
5. **Research grounding** — 1–3 citations from the existing research library
6. **Related** — links to 2–3 other Learn articles

Charts should reuse existing Recharts components where possible (projection-chart, the success-rate bar patterns from withdrawal-strategies).
