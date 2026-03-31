# Future Track Tab — Rebuild Reference

Removed: 2026-03-31. This doc captures what the Track/Dashboard tab did, what was preserved in the codebase, and what a v2 should look like.

## What the old Track tab did

- **Net worth snapshots** — manual "Capture snapshot" button stored point-in-time portfolio balances in IndexedDB (per-account breakdowns, net worth, retirement expenses, timestamp)
- **Net worth history chart** — Recharts line chart showing snapshot progression over time
- **FIRE milestone progress bars** — five simultaneous progress bars (Traditional, Lean, Fat, Coast, Barista FIRE) showing current % to each target
- **Next milestone indicator** — 25/50/75/100% checkpoints toward FIRE number
- **Retirement checkup** — year-over-year comparison card: current withdrawal rate vs. strategy guidance, CAPE-guided spending, status assessment (on track / watch / adjust), net worth and spending deltas
- **JSON export/import** — portable scenario backup and restore
- **Shareable URL** — scenario encoded in query params

## What was preserved in the codebase

These are still used by Spend (Your Plan) and Scenario Lab (What if?):

- `listScenarioSnapshots()` in `src/lib/db/database.ts` — reads snapshots for retirement checkup
- `ScenarioSnapshotRecord` type — used by checkup and both workspaces
- `buildRetirementCheckup()` in `src/lib/retirement/checkup.ts` — computes year-over-year deltas
- `RetirementCheckupSummary` component in `src/components/retirement/retirement-checkup-summary.tsx`
- The Dexie `snapshots` table schema — still in the DB, just nothing writes to it anymore

## Why it was removed

1. **Habit feature with no habit loop** — manual snapshot capture had no reminders, no automation, no brokerage import. Users disciplined enough to do this quarterly are already using a spreadsheet or Empower.
2. **Retirement checkup was buried** — the most valuable piece (withdrawal rate monitoring + CAPE guidance) was hidden behind milestone progress bars that duplicated what Save already showed.
3. **Milestone progress was redundant** — Save already shows years-to-FI, FIRE number, and progress.
4. **Added complexity without proportional value** — the core product (Save + Spend + Learn) was already doing a lot. Track made the nav wider without making the product meaningfully better.

## What to build differently in v2

### Rename to "Review" or "Checkup"
The tab should feel like "here's your annual financial review" not "here's a dashboard with charts."

### Auto-generate structured reviews
Instead of asking users to manually snapshot, generate a review when they visit:
- Current withdrawal rate drift since last visit
- Market regime change (CAPE movement)
- Milestone progress since last review
- Recommended action items with deep links ("Your withdrawal rate crept up 0.4% — stress-test the new number in Spend")

### Make it the Pro anchor
This is the financial advisor's annual meeting, automated:
- Review history timeline — each visit generates a timestamped review card
- Over years, users build a journal of financial decisions
- "How has my plan evolved?" becomes the recurring value that justifies a subscription

### Connect to the rest of the app
Every review insight should link to the relevant tool:
- Withdrawal rate concern → link to Spend
- Savings rate change → link to Save
- Market valuation shift → link to What if? scenario

### Consider automated snapshots
If the user has accounts configured, auto-capture on each visit (or weekly via service worker). Remove the manual "Capture snapshot" friction entirely.

### Consider a simple email/notification
"Your quarterly FIRE review is ready" — even for a local-first app, this could work via browser notifications or a lightweight email opt-in.
