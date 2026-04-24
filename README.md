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

## Deployment & Observability

Copy `.env.example` to `.env.local` and fill in whichever providers you use. All of these are optional — the app runs locally without any of them.

### Error monitoring (Sentry)

1. Create a project at [sentry.io](https://sentry.io) (or self-host).
2. Set `NEXT_PUBLIC_SENTRY_DSN` in the deploy environment.
3. For resolved stack traces, also set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. Without the auth token, the build skips source-map upload (dryRun) so local builds don't fail.
4. Configs live in `sentry.{client,server,edge}.config.ts`. They no-op when the DSN is unset.

### Analytics (Vercel Web Analytics + Speed Insights)

Automatic on Vercel deployments — no env vars, no setup. Page views and
Core Web Vitals start flowing to the Vercel dashboard as soon as the
site receives traffic. Cookieless. Scenario data never leaves the
browser; only anonymized page-view beacons go to Vercel.

### SEO

- Per-route `metadata` via `buildMetadata()` in `src/lib/seo/metadata.ts` (canonical URLs, OG, Twitter card, robots).
- `app/sitemap.ts` generates `/sitemap.xml` at build.
- `app/robots.ts` generates `/robots.txt` (disallows `/account` + `?scenario=` URLs).
- Set `NEXT_PUBLIC_SITE_URL` so canonicals point at the right origin.

Drop an `/og-image.png` (1200×630) into `public/` for social-share previews. A simple SVG-to-PNG export of the hero works as a v1.

