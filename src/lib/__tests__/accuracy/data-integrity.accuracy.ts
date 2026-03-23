/**
 * Data Integrity — Golden Tests
 *
 * Verifies the bundled datasets are complete, consistent, and fresh.
 * If any of these fail, either the data was corrupted or needs a refresh.
 */
import { describe, it, expect } from "vitest";
import { getShillerDataset, getMortalityDataset } from "@/lib/data";

describe("Shiller Dataset — Integrity", () => {
  const dataset = getShillerDataset();

  it("has exactly 1,833 monthly records", () => {
    expect(dataset.records.length).toBe(1833);
  });

  it("starts at 1871-01", () => {
    expect(dataset.startDate).toBe("1871-01");
    expect(dataset.records[0].date).toBe("1871-01");
  });

  it("ends at 2023-09", () => {
    expect(dataset.endDate).toBe("2023-09");
    expect(dataset.records[dataset.records.length - 1].date).toBe("2023-09");
  });

  it("has no null returns after the first record", () => {
    for (let i = 1; i < dataset.records.length; i++) {
      const r = dataset.records[i];
      expect(r.realStockReturn).not.toBeNull();
      expect(r.realBondReturn).not.toBeNull();
      expect(r.inflationRate).not.toBeNull();
    }
  });

  it("has consecutive monthly dates with no gaps", () => {
    for (let i = 1; i < dataset.records.length; i++) {
      const prev = dataset.records[i - 1];
      const curr = dataset.records[i];

      const [prevYear, prevMonth] = prev.date.split("-").map(Number);
      const [currYear, currMonth] = curr.date.split("-").map(Number);

      // Next month should be prev + 1 (or January of next year)
      if (prevMonth === 12) {
        expect(currYear).toBe(prevYear + 1);
        expect(currMonth).toBe(1);
      } else {
        expect(currYear).toBe(prevYear);
        expect(currMonth).toBe(prevMonth + 1);
      }
    }
  });

  it("stock returns are within sane bounds [-60%, +60%]", () => {
    for (const r of dataset.records) {
      if (r.realStockReturn !== null) {
        expect(r.realStockReturn).toBeGreaterThan(-0.6);
        expect(r.realStockReturn).toBeLessThan(0.6);
      }
    }
  });

  it("bond returns are within sane bounds [-20%, +20%]", () => {
    for (const r of dataset.records) {
      if (r.realBondReturn !== null) {
        expect(r.realBondReturn).toBeGreaterThan(-0.2);
        expect(r.realBondReturn).toBeLessThan(0.2);
      }
    }
  });

  it("CAPE values are in [4, 50] where present", () => {
    for (const r of dataset.records) {
      if (r.cape !== null) {
        expect(r.cape).toBeGreaterThanOrEqual(4);
        expect(r.cape).toBeLessThanOrEqual(50);
      }
    }
  });

  /**
   * @golden Spot-check: 1929-09 CAPE should be approximately 32.56
   * @source Shiller's published Excel spreadsheet
   */
  it("1929-09 CAPE ≈ 32.56 (pre-crash peak)", () => {
    const record = dataset.records.find((r) => r.date === "1929-09");
    expect(record).toBeDefined();
    if (record?.cape !== null && record?.cape !== undefined) {
      expect(record.cape).toBeCloseTo(32.56, 0);
    }
  });

  /**
   * Verify version matches expected
   */
  it("dataset version is v1", () => {
    expect(dataset.version).toBe("v1");
  });
});

describe("Mortality Dataset — Integrity", () => {
  const dataset = getMortalityDataset();

  it("has 102 records (ages 18-119)", () => {
    expect(dataset.records.length).toBe(102);
  });

  it("starts at age 18 and ends at age 119", () => {
    expect(dataset.records[0].age).toBe(18);
    expect(dataset.records[dataset.records.length - 1].age).toBe(119);
  });

  it("all probabilities are in [0, 1]", () => {
    for (const r of dataset.records) {
      expect(r.maleProbability).toBeGreaterThanOrEqual(0);
      expect(r.maleProbability).toBeLessThanOrEqual(1);
      expect(r.femaleProbability).toBeGreaterThanOrEqual(0);
      expect(r.femaleProbability).toBeLessThanOrEqual(1);
      expect(r.blendedProbability).toBeGreaterThanOrEqual(0);
      expect(r.blendedProbability).toBeLessThanOrEqual(1);
    }
  });

  it("mortality increases with age (generally)", () => {
    // Check that age-80 mortality > age-40 mortality
    const age40 = dataset.records.find((r) => r.age === 40);
    const age80 = dataset.records.find((r) => r.age === 80);
    expect(age40).toBeDefined();
    expect(age80).toBeDefined();
    if (age40 && age80) {
      expect(age80.blendedProbability).toBeGreaterThan(age40.blendedProbability);
    }
  });
});
