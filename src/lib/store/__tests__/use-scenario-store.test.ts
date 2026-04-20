import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultScenario } from "@/lib/domain";

// Mock the Dexie-backed DB module so we can simulate both "healthy IDB"
// (returns null = no draft) and "blocked IDB" (throws on read).
vi.mock("@/lib/db/database", () => ({
  loadScenarioDraft: vi.fn(),
  saveScenarioDraft: vi.fn(),
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
