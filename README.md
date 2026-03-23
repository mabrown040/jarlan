# Calcifer — FIRE Calculator

A local-first FIRE (Financial Independence, Retire Early) planning application built with Next.js 15, React 19, and TypeScript.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

### Navigation

| Tab | Route | Purpose |
|-----|-------|---------|
| Home | `/` | Marketing (new users) or FIRE overview (returning users) |
| Save | `/accumulation` | Your Plan — tax-aware projections, milestones, what-if analysis |
| Spend | `/withdrawal` | Withdrawal lab, tax strategy, scenario comparison |
| Track | `/dashboard` | Net worth tracking, retirement checkup |
| Learn | `/education` | Glossary, explainers, research library |

The FIRE quiz lives at `/quiz` and routes back to Home after completion.

### Key Components

- **Plan Drawer** (`src/components/plan-drawer/`) — global slide-out panel for all inputs, accessible from any page via the header pill
- **FIRE Quiz** (`src/components/quiz/`) — stage-aware quiz (curious/saving/pre-retirement/retired) with dynamic questions
- **Your Plan** (`src/components/landing/quick-fire-workspace.tsx` module variant) — the main planner workspace

### Data Flow

```
User Input → Plan Drawer → Zustand Store → Auto-save to IndexedDB
                                         → URL sync (for sharing)
                                         → All pages react to changes
```

Single source of truth: `useScenarioStore` (Zustand). All pages read/write the same scenario.

### Calculations

- `src/lib/calc/quick-fire.ts` — accumulation projections with income growth, expense growth, fee drag
- `src/lib/calc/fire-types.ts` — 5 FIRE types (Traditional, Lean, Fat, Coast, Barista)
- `src/lib/tax/strategy.ts` — federal tax estimation, shared `estimateScenarioTax()`
- `src/lib/sim/` — historical backtesting (1871-present), Monte Carlo (4 variants), 8 withdrawal strategies

### Quiz → Scenario Mapping

See `docs/quiz-input-mapping.md` for the full mapping of quiz answers to scenario inputs.

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **UI:** Tailwind CSS 4, Radix UI, shadcn/ui patterns
- **State:** Zustand
- **Charts:** Recharts
- **Storage:** Dexie (IndexedDB), URL-encoded sharing (lz-string)
- **Drawer:** Vaul

## Scripts

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run test         # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Data

Historical market data (Shiller dataset, 1871-present) lives in `data/shiller.json`. Tax brackets, state taxes, ACA premiums, and mortality tables are in `data/`.
