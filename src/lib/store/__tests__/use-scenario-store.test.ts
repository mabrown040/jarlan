import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultScenario } from "@/lib/domain";

// Mock the Dexie-backed DB module so we can simulate both "healthy IDB"
// (returns null = no draft) and "blocked IDB" (throws on read). All new
// multi-scenario helpers are mocked too — each test opts into a shape
// by overriding the needed mock via mockResolvedValueOnce.
vi.mock("@/lib/db/database", () => ({
  loadScenarioDraft: vi.fn(),
  saveScenarioDraft: vi.fn(),
  listStoredScenarios: vi.fn().mockResolvedValue([]),
  loadScenarioById: vi.fn(),
  setActiveDraftId: vi.fn(),
  upsertScenarioRecord: vi.fn(),
  deleteScenarioRecord: vi.fn(),
}));

// Mock the product sync helper that the store calls on save.
vi.mock("@/lib/product", () => ({
  syncScenarioForActiveAccount: vi.fn(),
}));

describe("useScenarioStore.initialize", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset Zustand between tests by reimporting the module.
    vi.resetModules();
  });

  it("resolves to 'ready' and surfaces 'storage-unavailable' when IDB throws", async () => {
    const { loadScenarioDraft } = await import("@/lib/db/database");
    (loadScenarioDraft as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new DOMException("The operation is insecure", "SecurityError"),
    );
    // Keep the test output clean — the store logs a console.warn on failure.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { useScenarioStore } = await import("../use-scenario-store");

    await useScenarioStore.getState().initialize();

    const state = useScenarioStore.getState();
    expect(state.status).toBe("ready");
    expect(state.hydrationWarning).toBe("storage-unavailable");
    // Demo scenario — shouldn't have been mutated, should be the default id.
    expect(state.activeScenario.id).toBe(createDefaultScenario().id);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it("surfaces 'share-link-invalid' when a share param was provided but decoding returned null", async () => {
    const { loadScenarioDraft } = await import("@/lib/db/database");
    (loadScenarioDraft as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { useScenarioStore } = await import("../use-scenario-store");

    await useScenarioStore.getState().initialize({
      sharedScenario: null,
      shareLinkProvided: true,
    });

    const state = useScenarioStore.getState();
    expect(state.status).toBe("ready");
    expect(state.hydrationWarning).toBe("share-link-invalid");
  });

  it("leaves warning null on a healthy hydration with no share param", async () => {
    const { loadScenarioDraft } = await import("@/lib/db/database");
    (loadScenarioDraft as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { useScenarioStore } = await import("../use-scenario-store");

    await useScenarioStore.getState().initialize();

    const state = useScenarioStore.getState();
    expect(state.status).toBe("ready");
    expect(state.hydrationWarning).toBeNull();
  });

  it("prefers storage-unavailable over share-link-invalid when both conditions hold", async () => {
    const { loadScenarioDraft } = await import("@/lib/db/database");
    (loadScenarioDraft as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("IDB closed"),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { useScenarioStore } = await import("../use-scenario-store");

    await useScenarioStore.getState().initialize({
      sharedScenario: null,
      shareLinkProvided: true,
    });

    expect(useScenarioStore.getState().hydrationWarning).toBe(
      "storage-unavailable",
    );
    warnSpy.mockRestore();
  });

  /**
   * Regression: dragging the "Save per year" slider used to route the
   * delta into accounts[0]. For personas where accounts[0] is a
   * traditional_401k (High Earner), that changed pre-tax contributions
   * → AGI → federal tax → take-home. The slider uses take-home as its
   * `max`, so the track scale shifted mid-drag and the thumb drifted
   * away from its labeled value. Fix: prefer the taxable account by
   * type so the tax side stays stable.
   */
  it("updateAnnualSavings routes the delta to the taxable account, not accounts[0]", async () => {
    // This test calls setState directly — no initialize() round-trip — so
    // the DB mock queue doesn't need priming.
    const { useScenarioStore } = await import("../use-scenario-store");
    const { createDefaultScenario } = await import("@/lib/domain");

    // Seed a scenario where accounts[0] is a pre-tax 401k and accounts[1]
    // is taxable — mirrors the High Earner persona layout.
    const seed = createDefaultScenario();
    seed.accounts = [
      {
        id: "401k",
        name: "401k",
        type: "traditional_401k",
        currentBalance: 800_000,
        annualContribution: 23_500,
        assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 },
        expenseRatio: 0.001,
      },
      {
        id: "taxable",
        name: "Brokerage",
        type: "taxable",
        currentBalance: 100_000,
        annualContribution: 10_000,
        assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 },
        expenseRatio: 0.001,
      },
    ];
    useScenarioStore.setState({ activeScenario: seed, status: "ready" });

    // Bump total savings from $33.5K to $50K (delta +$16.5K).
    useScenarioStore.getState().updateAnnualSavings(50_000);

    const { accounts } = useScenarioStore.getState().activeScenario;
    // 401k contribution must NOT move — it's the source of tax-drift.
    expect(accounts[0].annualContribution).toBe(23_500);
    // Taxable absorbs the delta: 50_000 − 23_500 = 26_500.
    expect(accounts[1].annualContribution).toBe(26_500);
  });

  it("updateAnnualSavings falls back to accounts[0] when no taxable account exists", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const { createDefaultScenario } = await import("@/lib/domain");

    const seed = createDefaultScenario();
    seed.accounts = [
      {
        id: "401k",
        name: "401k",
        type: "traditional_401k",
        currentBalance: 200_000,
        annualContribution: 10_000,
        assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 },
        expenseRatio: 0.001,
      },
    ];
    useScenarioStore.setState({ activeScenario: seed, status: "ready" });

    useScenarioStore.getState().updateAnnualSavings(15_000);

    const { accounts } = useScenarioStore.getState().activeScenario;
    // No taxable → accounts[0] absorbs the delta (legacy behavior).
    expect(accounts[0].annualContribution).toBe(15_000);
  });

  it("dismissHydrationWarning clears the banner", async () => {
    const { loadScenarioDraft } = await import("@/lib/db/database");
    (loadScenarioDraft as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("IDB closed"),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { useScenarioStore } = await import("../use-scenario-store");

    await useScenarioStore.getState().initialize();
    expect(useScenarioStore.getState().hydrationWarning).toBe(
      "storage-unavailable",
    );

    useScenarioStore.getState().dismissHydrationWarning();
    expect(useScenarioStore.getState().hydrationWarning).toBeNull();
    warnSpy.mockRestore();
  });
});

describe("useScenarioStore multi-scenario management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  /**
   * Duplicate should clone the active scenario under a fresh id +
   * name, persist it to IDB, and switch the active-draft pointer to
   * the new copy so the user sees their new plan immediately.
   */
  it("duplicateActiveScenario clones active under new id + switches focus", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const db = await import("@/lib/db/database");
    (db.listStoredScenarios as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const original = useScenarioStore.getState().activeScenario;
    await useScenarioStore.getState().duplicateActiveScenario("Plan B");

    const next = useScenarioStore.getState().activeScenario;
    expect(next.id).not.toBe(original.id);
    expect(next.name).toBe("Plan B");
    expect(next.isPersonalized).toBe(true);
    expect(db.upsertScenarioRecord).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Plan B" }),
    );
    expect(db.setActiveDraftId).toHaveBeenCalledWith(next.id);
  });

  /**
   * createBlank should give us a fresh default scenario (un-personalized
   * so the sample-scenario banner still shows) under a new id.
   */
  it("createBlankScenario creates a fresh un-personalized scenario", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const db = await import("@/lib/db/database");
    (db.listStoredScenarios as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const original = useScenarioStore.getState().activeScenario;
    await useScenarioStore.getState().createBlankScenario("Conservative");

    const next = useScenarioStore.getState().activeScenario;
    expect(next.id).not.toBe(original.id);
    expect(next.name).toBe("Conservative");
    expect(next.isPersonalized).toBe(false);
  });

  /**
   * switchToScenario should load a different scenario from IDB and
   * update the active-draft pointer. If the scenario can't be loaded,
   * the active scenario stays unchanged (no silent default fallback).
   */
  it("switchToScenario loads from IDB and updates active pointer", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const db = await import("@/lib/db/database");
    const target = {
      ...createDefaultScenario(),
      id: "target-id",
      name: "Aggressive",
    };
    (db.loadScenarioById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      target,
    );
    (db.listStoredScenarios as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await useScenarioStore.getState().switchToScenario("target-id");

    expect(useScenarioStore.getState().activeScenario.id).toBe("target-id");
    expect(useScenarioStore.getState().activeScenario.name).toBe("Aggressive");
    expect(db.setActiveDraftId).toHaveBeenCalledWith("target-id");
  });

  /**
   * Rename-active writes a new updatedAt timestamp + persists so
   * the cross-device sync (when added) picks up the change.
   */
  it("renameScenario on the active scenario updates name + persists", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const db = await import("@/lib/db/database");

    const currentId = useScenarioStore.getState().activeScenario.id;
    await useScenarioStore.getState().renameScenario(currentId, "Plan A");

    expect(useScenarioStore.getState().activeScenario.name).toBe("Plan A");
    expect(db.upsertScenarioRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: currentId, name: "Plan A" }),
    );
  });

  it("renameScenario ignores empty/whitespace names", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const db = await import("@/lib/db/database");

    const currentId = useScenarioStore.getState().activeScenario.id;
    const originalName = useScenarioStore.getState().activeScenario.name;
    await useScenarioStore.getState().renameScenario(currentId, "   ");

    expect(useScenarioStore.getState().activeScenario.name).toBe(originalName);
    expect(db.upsertScenarioRecord).not.toHaveBeenCalled();
  });

  /**
   * Deleting a non-active scenario should not touch the active one.
   */
  it("deleteScenario leaves active scenario alone when deleting another", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const db = await import("@/lib/db/database");
    (db.listStoredScenarios as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const originalId = useScenarioStore.getState().activeScenario.id;
    await useScenarioStore.getState().deleteScenario("some-other-id");

    expect(useScenarioStore.getState().activeScenario.id).toBe(originalId);
    expect(db.deleteScenarioRecord).toHaveBeenCalledWith("some-other-id");
  });

  /**
   * Deleting the ACTIVE scenario should fall back to the most-recent
   * remaining scenario. If nothing remains, spin up a fresh default
   * so the UI is never left without a scenario to render.
   */
  it("deleteScenario on active falls back to remaining or fresh default", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const db = await import("@/lib/db/database");

    // No scenarios remain after delete → store should spin up a fresh
    // default with a new UUID (not the original's id).
    (db.listStoredScenarios as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const originalId = useScenarioStore.getState().activeScenario.id;
    await useScenarioStore.getState().deleteScenario(originalId);

    const next = useScenarioStore.getState().activeScenario;
    expect(next.id).not.toBe(originalId);
    // setActiveDraftId called twice: once in the delete path (no-op
    // on success), once when installing the fallback.
    expect(db.setActiveDraftId).toHaveBeenCalledWith(next.id);
  });

  /**
   * refreshScenarioList tags the active scenario via isActive so the
   * switcher UI can highlight it without pulling the full store state.
   */
  it("refreshScenarioList marks the active scenario with isActive=true", async () => {
    const { useScenarioStore } = await import("../use-scenario-store");
    const db = await import("@/lib/db/database");
    const activeId = useScenarioStore.getState().activeScenario.id;
    const now = new Date().toISOString();

    (db.listStoredScenarios as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: activeId,
        name: "Active one",
        updatedAt: now,
        createdAt: now,
        isDraft: 1,
        scenario: createDefaultScenario(),
      },
      {
        id: "other-id",
        name: "Other",
        updatedAt: now,
        createdAt: now,
        isDraft: 1,
        scenario: createDefaultScenario(),
      },
    ]);

    await useScenarioStore.getState().refreshScenarioList();

    const list = useScenarioStore.getState().scenarioList;
    expect(list).toHaveLength(2);
    expect(list.find((s) => s.id === activeId)?.isActive).toBe(true);
    expect(list.find((s) => s.id === "other-id")?.isActive).toBe(false);
  });
});
