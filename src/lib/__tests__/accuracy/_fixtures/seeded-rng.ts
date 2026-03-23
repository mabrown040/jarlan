/**
 * Linear Congruential Generator for deterministic Monte Carlo tests.
 *
 * Uses the same LCG parameters as Numerical Recipes (Knuth):
 *   state = (1664525 * state + 1013904223) >>> 0
 *
 * This produces the same sequence every time for a given seed,
 * making Monte Carlo results fully reproducible and pinnable.
 */
export function createSeededRng(seed = 123456789): () => number {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
