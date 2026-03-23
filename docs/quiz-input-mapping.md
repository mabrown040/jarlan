# Quiz → Scenario Input Mapping

**Last updated:** March 2026
**Source of truth:** `src/lib/quiz/fire-type-quiz.ts` → `buildScenarioFromQuizAnswers()`

## Overview

The FIRE quiz is **stage-aware**. The first question asks the user's stage (curious, saving, pre-retirement, retired), which determines:
1. Which subset of questions to show
2. Where to route after completion

When the user completes the quiz, the scenario is built using `buildScenarioFromQuizAnswers()` and passed to the Zustand store via `replaceScenario()`.

## Stage Routing

| Stage | Questions | Destination |
|---|---|---|
| Curious | All (educational) | /education |
| Saving | All | /accumulation (Your Plan) |
| Pre-retirement | 8 (focused on readiness) | /withdrawal (Spend) |
| Retired | 5 (focused on monitoring) | /dashboard (Track) |

Stage routing logic: `src/components/quiz/fire-type-quiz.tsx` → `stageDestination` map.
Question filtering: `src/components/quiz/fire-type-quiz.tsx` → `getStepsForStage()`.

All mapped values can be overridden by the user in the Plan Drawer at any time.

## Direct Input Mapping

| Quiz Field | Scenario Field | Notes |
|---|---|---|
| `currentAge` | `profile.age` | Clamped 18-80 |
| `targetFiAge` | `profile.retirementAge` | Clamped to age-90 |
| `annualIncome` | `annualIncome` | Also sets `annualSavings` and `accounts[0].annualContribution` as income minus spending |
| `annualSpending` | `annualExpenses` + `retirementExpenses` | Both set to the same value |
| `currentPortfolio` | `accounts[0].currentBalance` | Mapped to the primary account |

## Derived Input Mapping

| Quiz Field | Scenario Field | Mapping Logic | Rationale |
|---|---|---|---|
| `postFireIncome` | `assumptions.partTimeIncome` | Direct if > 0, otherwise falls back to `getSuggestedPartTimeIncome()` ($20K yes, $10K maybe, $0 no) | Conditional field — only shown when partTimePreference is "yes" or "maybe" |
| `riskTolerance` (1-5) | `assumptions.withdrawalRate` | 1→3.25%, 2→3.5%, 3→4%, 4→4.25%, 5→4.5% | Maps cautious/aggressive risk appetite to withdrawal rate. 4% is the balanced default (Trinity Study). ERN research suggests 3.25-3.5% for cautious early retirees. |
| `riskTolerance` (1-5) | `assumptions.saferWithdrawalRate` | Always `withdrawalRate - 0.5%`, min 2.5% | Provides a conservative comparison benchmark |
| `flexibility` | `assumptions.expenseGrowthRate` | high→0%, medium→0.5%, low→1% | High flexibility means willing to cut spending in downturns (no lifestyle creep). Low flexibility means fixed lifestyle expectations (1% real creep). |
| `dependents` | `profile.householdSize` | yes→3, no→1 | Affects ACA subsidy calculations and tax bracket context |

## Fields NOT Mapped by Quiz

These use default values and can be adjusted in the Plan Drawer:

| Scenario Field | Default | Why Not Mapped |
|---|---|---|
| `assumptions.expectedRealReturn` | 5% | Investment return is a market assumption, not a personal preference |
| `assumptions.incomeGrowthRate` | 1% | Too speculative to infer from quiz answers |
| `assumptions.inflation` | 3% | Macro assumption, not personal |
| `simulationSettings.feeDrag` | 0.1% | Depends on specific fund choices |
| `profile.filingStatus` | "single" | Not asked in quiz — set in drawer |
| `profile.country` / `profile.state` | US / CA | Not asked in quiz — set in drawer |

## Recommendation Mapping

The quiz also produces a FIRE type recommendation based on these answers. The recommendation logic is in `pickRecommendationId()` and doesn't directly set scenario values — it only determines which FIRE type to highlight. See `src/lib/quiz/fire-type-quiz.ts` for the full recommendation logic.

## Maintenance Notes

- When adding new quiz questions, update both `FireTypeQuizAnswers` interface and `buildScenarioFromQuizAnswers()`
- When adding new scenario assumptions, consider whether the quiz should seed them
- The `handleUseInPlanner()` function in the quiz component calls `replaceScenario(buildScenarioFromQuizAnswers(answers))` — no individual update calls needed
- Pre-fill logic (scenario store → quiz answers) is in the quiz component's `useEffect` that syncs from the store
