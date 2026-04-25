# Admin tool — follow-ups

Issues surfaced while testing `/admin/scenario-from-text` that **aren't** about the AI extraction itself. Tracked here so they don't get lost; will be split into focused PRs once the admin tool flow is stable.

Format: each item has enough context to act on cold. Add new items to **Open** as they surface. When fixed, move to **Fixed** with the PR/commit reference and date.

---

## Open

### Stat-card vs. Sankey savings disagreement

The `/accumulation` page can display two contradictory savings numbers for the same scenario:

- The **"Saving" stat card** reads `scenario.annualSavings`. When the AI extraction (or any other path) leaves `annualSavings` at the default, this can show `$0/yr` even though take-home minus spending is large.
- The **"Where your money goes" Sankey** computes savings as `takeHome − annualExpenses` and shows the resulting flow into the brokerage.

Surfaced via the 42F test scenario (Midwest, $500K inferred income, $57.5K spend) — stat card showed `$0/yr` while the Sankey labelled `Savings $237.5K`.

**Likely fix:** pick one source of truth across both surfaces. The Sankey calculation (`takeHome − annualExpenses`) is the more honest answer because `annualSavings` is a stored field that can drift from reality whenever income or expenses change without a re-edit. Replace stat-card consumption of `scenario.annualSavings` with the same derivation.

**Scope:** affects all returning users, not just AI-generated scenarios. Worth its own focused PR after the admin tool work lands.

---

## Fixed

(none yet)
