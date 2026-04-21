import { describe, expect, it } from "vitest";

import { APP_VERSION, createDefaultScenario } from "@/lib/domain";
import {
  downgradeScenarioForTest,
  runScenarioMigrations,
} from "@/lib/domain/migrations";
import { parseScenario } from "@/lib/domain/schema";

describe("scenario migrations", () => {
  it("treats missing version as v1 and upgrades to current", () => {
    const v1Scenario = downgradeScenarioForTest(createDefaultScenario(), 1);
    // Simulate an old payload without an explicit version field.
    delete v1Scenario.version;

    const migrated = runScenarioMigrations(v1Scenario);
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(APP_VERSION);
    expect(migrated!.ownerId).toBeNull();
  });

  it("v1 → v2 adds ownerId=null without touching other fields", () => {
    const current = createDefaultScenario();
    const v1 = downgradeScenarioForTest(current, 1);
    expect(v1).not.toHaveProperty("ownerId");

    const migrated = runScenarioMigrations(v1);
    expect(migrated).not.toBeNull();
    expect(migrated!.ownerId).toBeNull();
    // Other fields untouched: same name, same income, same accounts.
    expect(migrated!.name).toBe(current.name);
    expect(migrated!.annualIncome).toBe(current.annualIncome);
    expect((migrated!.accounts as unknown[]).length).toBe(
      current.accounts.length,
    );
  });

  it("current-version scenarios pass through unchanged", () => {
    const current = createDefaultScenario();
    const migrated = runScenarioMigrations(
      current as unknown as Record<string, unknown>,
    );
    expect(migrated).toEqual(current);
  });

  it("refuses forward-version data (caller falls back to default)", () => {
    const future = {
      ...createDefaultScenario(),
      version: APP_VERSION + 1,
    } as unknown as Record<string, unknown>;
    expect(runScenarioMigrations(future)).toBeNull();
  });

  it("parseScenario runs migrations automatically for v1 data", () => {
    const v1 = downgradeScenarioForTest(createDefaultScenario(), 1);
    const parsed = parseScenario(v1);
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(APP_VERSION);
    expect(parsed!.ownerId).toBeNull();
  });

  it("parseScenario returns null on non-object input without throwing", () => {
    expect(parseScenario(null)).toBeNull();
    expect(parseScenario(undefined)).toBeNull();
    expect(parseScenario("not-a-scenario")).toBeNull();
    expect(parseScenario(42)).toBeNull();
  });
});
