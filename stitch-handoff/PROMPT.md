# Google Stitch Handoff — Calcifer / FIRECALC

## Project brief

**Calcifer** (internal: FIRECALC) is a local-first FIRE (Financial Independence, Retire Early) calculator web app. It helps users answer "when can I retire?" with a quick headline number, then routes them to progressively deeper planning tools as their questions get more specific.

The product is built on **Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Zustand, Recharts, and Dexie (IndexedDB)**. All data lives in the browser — no accounts required. There is a Pro tier (via Stripe) for advanced features.

---

## Design language

The visual identity is built around **fire and warmth**. The palette uses earthy ambers, flames, and dark charcoal backgrounds. The vibe is premium/calm — not colorful or flashy. Charts and numbers are the heroes.

### Core personality
- **Calm and credible** — like a financial advisor's interface, not a consumer fintech app
- **Progressive disclosure** — simple first answer, depth only when asked
- **Research-backed** — links to explanations, shows assumptions, surfaces CAPE/SWR research
- **Local-first and private** — data stays in the browser; no tracking or ads

### Key design decisions
- Dark "hero" cards on light backgrounds (PageHero component uses dark gradient)
- Warm off-white background (`#f5f0eb` / `--ash`) in light mode, deep charcoal (`#0d0a0e` / `--coal`) in dark
- Ember orange (`#ff6b35`) as the primary accent — used for active states, CTA emphasis, eyebrow labels
- Flame yellow (`#f7c948`) as secondary accent — used in charts, gradients
- Body background has a subtle radial ember glow at top and flame glow at bottom
- Cards use rounded-xl/2xl corners (16-20px radius)
- Typography mixing: display serif (DM Serif Display) for hero numbers/headings, body sans-serif (Plus Jakarta Sans) for copy, mono (JetBrains Mono) for labels and eyebrows

---

## Navigation structure

```
Header (sticky, frosted glass backdrop-blur)
  Logo: "Calcifer" (display font) + "FIRECALC" (mono eyebrow)
  Primary nav: Home | Save | Spend | Learn | Pro★
  Sub-nav (context-sensitive, below header border):
    Save → Your plan | What if?
    Spend → Your Plan | What if? | Income plan
    Learn → Overview | Savings rate | Withdrawal strategies | Coast FIRE | Barista FIRE
    Pro → Pricing | Account
  Right controls: Plan Drawer trigger pill + Theme toggle (sun/moon)
  Mobile: hamburger opens full-screen nav with collapsible sub-items

Footer (minimal)
  Left: "For educational purposes only. Not financial advice."
  Right: 🔒 "Data stays in your browser"
```

The **Pro nav item** uses a special gradient pill treatment — ember-to-flame gradient with a star icon, elevated shadow. Active state is filled gradient with white text.

---

## Page inventory

### Home `/`
Hero calculator with instant FIRE number. The entry point for new users.
- QuickFireWorkspace: large input panel on left, results panel on right
- Inputs: portfolio balance, annual spending, savings rate, expected return
- Outputs: FIRE number, years to FIRE, safe rate comparison
- Below: pathway cards (Brand new → quiz, Actively saving → accumulation, Close to retiring → withdrawal)
- Below: capability grid (5 feature cards)
- Below: trust/philosophy cards

### Save — Your Plan `/accumulation`
Full accumulation planner.
- PageHero (dark gradient) with headline FIRE stats (years to FI, portfolio size at FI)
- Multi-account portfolio input (Taxable, Roth IRA, Traditional 401k, etc.)
- Cash flow events (income, expenses over time)
- Partner planning mode
- Timeline chart: portfolio growth projection with contribution breakdowns
- Milestone markers: Lean FIRE, Traditional FIRE, Fat FIRE thresholds on chart

### Save — What if? `/save-what-if`
Sensitivity analysis for the accumulation plan.
- Side-by-side scenario comparison
- Sliders for savings rate, return assumptions, timeline
- Visual delta between base plan and scenarios

### Spend — Your Plan `/withdrawal`
Retirement withdrawal simulator — the "can I retire?" tool.
- PageHero with key retirement stats (initial withdrawal rate, portfolio success rate)
- Historical backtest: area chart showing portfolio survival across historical periods
- Monte Carlo: probability fan chart
- Withdrawal strategy comparison: 4% rule, VPW, CAPE-guided, floor + upside
- Retirement checkup card: year-over-year monitoring (withdrawal rate drift, CAPE movement)

### Spend — What if? `/scenario-lab`
Guided "what if I spend more/less?" explorer.
- Scenario cards: Spend as planned, Spend more, Spend less, Custom
- For each: success rate badge, historical survival chart, withdrawal rate indicator
- Controls panel: spending adjustments, strategy overrides
- Compare mode: side-by-side scenario overlay

### Spend — Income plan `/tax-strategy`
Advanced withdrawal sequencing and tax strategy.
- Roth conversion ladder planner
- ACA subsidy cliff modeling
- Social Security timing optimizer
- Account drawdown sequence (taxable → Roth → Traditional)

### Learn `/education`
Educational hub with articles on FIRE concepts.
- Overview: quick links to all articles
- Savings rate, Withdrawal strategies, Coast FIRE, Barista FIRE — each a long-form explainer

### Pro/Pricing `/pricing`
Subscription upgrade page.
- Feature comparison: free vs. Pro
- Stripe checkout integration

### Quiz `/quiz`
FIRE type quiz — translates lifestyle preferences into a FIRE style recommendation.
- Multi-step wizard (stage → risk tolerance → flexibility → spending style → partners)
- Results: recommended FIRE type + link to relevant tool

---

## Component system

### Brand components (design language primitives)
- **PageHero** — dark gradient hero block with ember/flame radial glows, display headline, optional badges and CTA actions
- **SectionHeading** — eyebrow (mono uppercase ember) + display title + muted description, optional right-aligned actions
- **StatCard** — labeled metric card with tone variants: default / accent (ember) / success (green) / warning (yellow) / danger (red)
- **EnhancedStatCard** — richer metric with trend indicator and sparkline slot
- **ChartShell** — Card wrapper for charts: header with SectionHeading, content area

### UI components (shadcn-style)
- **Button** — primary (ember fill), ghost, outline, destructive variants
- **Card / CardHeader / CardContent / CardFooter** — base surface
- **Badge** — small label pill: default, secondary, outline, destructive
- **Slider** — range input with ember thumb
- **Select** — native-style dropdown
- **Input / NumberInput** — text/number fields
- **Tooltip** — Radix UI tooltip
- **Sheet** — Vaul bottom sheet for mobile
- **Separator** — thin border line
- **CollapsibleSection** — accordion-style expandable section

### Layout
- **SiteShell** — full page wrapper: sticky header, main, footer, plan drawer
- **PlanDrawer / PlanDrawerTrigger** — slide-in panel for scenario management (save/load/switch scenarios)

### Charts (Recharts)
- All wrapped in **ChartFrame** — defers render until mounted, prevents SSR/hydration layout flash
- **ResponsiveContainer** with `initialDimension={{ width: 1, height: 1 }}` on all instances
- Common chart types: AreaChart (portfolio growth, withdrawal survival), LineChart (history), BarChart (contributions)
- Custom tooltips styled to match brand tokens

---

## Design tokens (CSS custom properties)

See `design-system.md` for full token reference.

Key brand tokens:
```
--ember: #ff6b35        (primary CTA, active states, eyebrows)
--flame: #f7c948        (secondary, chart accent, gradients)
--hearth: #1a1118       (dark card backgrounds)
--coal: #0d0a0e         (dark mode page background)
--ash: #f5f0eb          (light mode page background)
--smoke: #8a7f87        (subtle muted text in dark contexts)
```

---

## Tailwind conventions

- `font-display` → DM Serif Display (headlines, large numbers)
- `font-mono` → JetBrains Mono (labels, eyebrows, stat labels)
- `font-sans` (default) → Plus Jakarta Sans (body text)
- `tracking-[-0.03em]` on display headings
- `tracking-[0.18em] uppercase` on mono eyebrow labels
- `text-[0.68rem]` for eyebrow labels (smaller than standard `text-xs`)
- `rounded-xl` (16px), `rounded-2xl` (24px), `rounded-[28px]` (PageHero)
- Active nav: `bg-[rgba(255,107,53,0.1)]` tint
- Shadows: `var(--shadow-soft)`, `var(--shadow-surface)`, `var(--shadow-glow)`

---

## What Stitch should prioritize

1. **Preserve the fire/warmth visual identity** — ember orange, dark hero cards, off-white warm backgrounds
2. **Respect the typography hierarchy** — display serif for big numbers/headers, mono for labels, sans for body
3. **Keep the progressive disclosure principle** — home → simple; drill into a tool → depth appears
4. **Dark mode parity** — the dark theme is coal/hearth-dark with the same ember accent, not just an inverted light theme
5. **Chart-first layout** — data visualizations are the centerpiece of Spend and Save pages; the layout should give them room
6. **Mobile-first nav** — the hamburger nav with collapsible sub-groups works well; preserve that pattern
