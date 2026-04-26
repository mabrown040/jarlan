import { describe, expect, it } from "vitest";

import { APP_VERSION, createDefaultScenario } from "@/lib/domain";
import { downgradeScenarioForTest } from "@/lib/domain/migrations";
import {
  buildExportEnvelope,
  parseImportPayload,
  PORTABILITY_FORMAT_VERSION,
} from "@/lib/domain/portability";

describe("scenario portability", () => {
  it("round-trips a single scenario through export → import", () => {
    const scenario = createDefaultScenario();
    const envelope = buildExportEnvelope([scenario]);
    const json = JSON.stringify(envelope);

    const result = parseImportPayload(json);
    expect(result).not.toBeNull();
    expect(result!.scenarios).toHaveLength(1);
    expect(result!.droppedCount).toBe(0);
    expect(result!.scenarios[0].name).toBe(scenario.name);
  });

  it("round-trips multiple scenarios", () => {
    const a = { ...createDefaultScenario(), id: "a", name: "Plan A" };
    const b = { ...createDefaultScenario(), id: "b", name: "Plan B" };
    const envelope = buildExportEnvelope([a, b]);
    const json = JSON.stringify(envelope);

    const result = parseImportPayload(json);
    expect(result).not.toBeNull();
    expect(result!.scenarios).toHaveLength(2);
    expect(result!.scenarios.map((s) => s.name).sort()).toEqual([
      "Plan A",
      "Plan B",
    ]);
  });

  it("runs the migration chain on imported v1 scenarios", () => {
    const current = createDefaultScenario();
    const v1 = downgradeScenarioForTest(current, 1);
    const envelope = {
      source: "jarlan",
      formatVersion: PORTABILITY_FORMAT_VERSION,
      exportedBy: { appVersion: 1, exportedAt: new Date().toISOString() },
      scenarios: [v1],
    };
    const result = parseImportPayload(JSON.stringify(envelope));
    expect(result).not.toBeNull();
    expect(result!.scenarios[0].version).toBe(APP_VERSION);
    expect(result!.scenarios[0].ownerId).toBeNull();
  });

  it("returns null on non-JSON input", () => {
    expect(parseImportPayload("this isn't JSON")).toBeNull();
    expect(parseImportPayload("")).toBeNull();
  });

  it("returns null when the file isn't a Jarlan envelope", () => {
    const notOurs = JSON.stringify({ source: "something-else", scenarios: [] });
    expect(parseImportPayload(notOurs)).toBeNull();
  });

  it("refuses forward-version envelopes (would drop unknown fields)", () => {
    const future = JSON.stringify({
      source: "jarlan",
      formatVersion: PORTABILITY_FORMAT_VERSION + 1,
      exportedBy: { appVersion: 99, exportedAt: new Date().toISOString() },
      scenarios: [createDefaultScenario()],
    });
    expect(parseImportPayload(future)).toBeNull();
  });

  it("reports droppedCount for mixed-validity payloads", () => {
    const valid = createDefaultScenario();
    const envelope = {
      source: "jarlan",
      formatVersion: PORTABILITY_FORMAT_VERSION,
      exportedBy: { appVersion: APP_VERSION, exportedAt: "x" },
      scenarios: [
        valid,
        { totally: "invalid", not: "a scenario" },
        { also: "garbage" },
      ],
    };
    const result = parseImportPayload(JSON.stringify(envelope));
    expect(result).not.toBeNull();
    expect(result!.scenarios).toHaveLength(1);
    expect(result!.droppedCount).toBe(2);
  });

  it("returns null when all scenarios are invalid (fails loud)", () => {
    const envelope = {
      source: "jarlan",
      formatVersion: PORTABILITY_FORMAT_VERSION,
      exportedBy: { appVersion: APP_VERSION, exportedAt: "x" },
      scenarios: [{ garbage: 1 }, { more: "garbage" }],
    };
    expect(parseImportPayload(JSON.stringify(envelope))).toBeNull();
  });

  it("export envelope has the self-describing shape", () => {
    const scenario = createDefaultScenario();
    const envelope = buildExportEnvelope([scenario]);
    expect(envelope.source).toBe("jarlan");
    expect(envelope.formatVersion).toBe(PORTABILITY_FORMAT_VERSION);
    expect(envelope.exportedBy.appVersion).toBe(APP_VERSION);
    expect(typeof envelope.exportedBy.exportedAt).toBe("string");
    expect(envelope.scenarios).toHaveLength(1);
  });
});
