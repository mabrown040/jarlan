import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Accuracy test configuration.
 *
 * Runs the golden-test suite that pins every metric to a known-correct value.
 * Separate from the main test config because:
 *   - Monte Carlo tests are slow (up to 60s with 10K trials)
 *   - We want JSON output for the accuracy report generator
 *   - These tests should run on a schedule, not on every save
 *
 * Usage:
 *   npm run test:accuracy          -- run all accuracy tests
 *   npm run test:accuracy:report   -- run + generate markdown report
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/lib/__tests__/accuracy/**/*.accuracy.ts"],
    testTimeout: 60_000,
  },
});
