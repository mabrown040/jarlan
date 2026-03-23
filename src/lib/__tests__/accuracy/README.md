# Accuracy Verification System

A comprehensive golden-test suite that pins every financial metric in Calcifer to a known-correct value.

## Quick Start

```bash
# Run all accuracy tests
npm run test:accuracy

# Run a specific engine
npx vitest run --config vitest.accuracy.config.ts src/lib/__tests__/accuracy/backtest.accuracy.ts
```

## Architecture

```
accuracy/
  _fixtures/
    scenarios.ts          -- 6 canonical test scenarios
    external-benchmarks.ts -- cFIREsim/FIRECalc expected values
    seeded-rng.ts         -- Deterministic RNG for Monte Carlo
    golden.ts             -- golden() helper that pins + documents values
  accumulation.accuracy.ts  -- FIRE number, years-to-FI, coast, fire types
  withdrawal.accuracy.ts    -- All 8 withdrawal strategies
  backtest.accuracy.ts      -- Historical backtest + cFIREsim cross-validation
  monte-carlo.accuracy.ts   -- 4 Monte Carlo modes (seeded, deterministic)
  tax.accuracy.ts           -- Federal tax brackets vs IRS publications
  data-integrity.accuracy.ts -- Shiller dataset, mortality tables, bounds
  mortality.accuracy.ts     -- SSA spot checks + rich/broke/dead decomposition
```

## The Golden Test Pattern

Every test uses the `golden()` helper which:
1. Asserts the value matches the expected output
2. Documents the methodology inline (JSDoc above each test)
3. Records results for the accuracy report

```typescript
golden("accumulation.fire-number.4pct", {
  input: { annualExpenses: 54_000, withdrawalRate: 0.04 },
  expected: 1_350_000,
  actual: calculateFireNumber(54_000, 0.04),
  tolerance: 0,
  methodology: "expenses / WR per Bengen (1994)",
});
```

## Adding a New Test

1. Add a scenario to `_fixtures/scenarios.ts` if it's reusable
2. Add the golden test to the relevant `.accuracy.ts` file
3. Document the methodology in the JSDoc block above the test
4. Run `npm run test:accuracy` to verify

## External Cross-Validation

The `external-benchmarks.ts` fixture stores expected outputs from cFIREsim and FIRECalc.
Each benchmark includes:
- Source URL + date accessed
- Exact parameters used
- Tolerance band + methodology notes explaining differences

A 2-4% gap between tools is expected due to different bond modeling,
return series (nominal vs real), and date filtering approaches.

## Monte Carlo Determinism

All Monte Carlo tests use a seeded RNG (`createSeededRng(seed)`) which produces
the same sequence every time. This makes results byte-for-byte reproducible.

If you change the Monte Carlo engine, the pinned values will change — this is
intentional. Re-run the tests, verify the new values are reasonable, and update.

## Data Freshness

The `data-integrity.accuracy.ts` file checks that datasets aren't stale.
When Shiller data needs updating, run `npm run data:fetch:shiller`.
