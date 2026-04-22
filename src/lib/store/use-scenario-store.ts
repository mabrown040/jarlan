"use client";

import { create } from "zustand";

import {
  deleteScenarioRecord,
  listStoredScenarios,
  loadScenarioById,
  loadScenarioDraft,
  saveScenarioDraft,
  setActiveDraftId,
  upsertScenarioRecord,
} from "@/lib/db/database";
import {
  cloneScenario,
  createDefaultPartnerProfile,
  createDefaultScenario,
  touchScenario,
  type Scenario,
} from "@/lib/domain";
import { getFlexAccountIndex } from "@/lib/calc/scenario";
import {
  buildExportEnvelope,
  downloadScenarioExport,
  parseImportPayload,
} from "@/lib/domain/portability";
import { syncScenarioForActiveAccount } from "@/lib/product";
import { clamp, roundTo } from "@/lib/utils";

type StoreStatus = "idle" | "hydrating" | "ready";
type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Hydration warnings surfaced in the UI as one-time banners.
 * - `share-link-invalid` — user landed on a ?scenario=… URL that failed to
 *   decode/validate; we fell back to the saved draft or the demo scenario.
 * - `storage-unavailable` — IndexedDB threw on read (private mode, extension
 *   block). The session uses the demo scenario; changes won't persist.
 */
export type HydrationWarning = "share-link-invalid" | "storage-unavailable";

interface InitializeInput {
  sharedScenario?: Scenario | null;
  shareLinkProvided?: boolean;
}

interface ScenarioStore {
  activeScenario: Scenario;
  status: StoreStatus;
  saveStatus: SaveStatus;
  hydrationWarning: HydrationWarning | null;
  dismissHydrationWarning: () => void;
  initialize: (input?: InitializeInput) => Promise<void>;
  replaceScenario: (scenario: Scenario) => void;
  updateCurrency: (value: Scenario["currency"]) => void;
  updateCountry: (value: string) => void;
  updateIncome: (value: number) => void;
  updateExpenses: (value: number) => void;
  updateRetirementExpenses: (value: number) => void;
  updateAnnualSavings: (value: number) => void;
  updateCurrentBalance: (value: number) => void;
  updateProfileAge: (value: number) => void;
  updateHealthStatus: (value: Scenario["profile"]["healthStatus"]) => void;
  setPartnerPlanningEnabled: (enabled: boolean) => void;
  updatePartnerName: (value: string) => void;
  updatePartnerAge: (value: number) => void;
  updatePartnerRetirementAge: (value: number) => void;
  updatePartnerIncome: (value: number) => void;
  updatePartnerHealthStatus: (
    value: NonNullable<Scenario["profile"]["partner"]>["healthStatus"],
  ) => void;
  updateRetirementAge: (value: number) => void;
  updateRetirementDuration: (value: number) => void;
  updateWithdrawalRate: (value: number) => void;
  updateWithdrawalStrategyType: (value: Scenario["withdrawalStrategy"]["type"]) => void;
  updateWithdrawalStrategyInitialRate: (value: number) => void;
  updateCapeParameter: (key: "a" | "b", value: number) => void;
  updateGuytonKlingerParameter: (
    key: "guardrailWidth" | "adjustmentSize" | "suspendCapPreservationYears",
    value: number,
  ) => void;
  updateFloorCeilingParameter: (key: "floor" | "ceiling", value: number) => void;
  updateSpendingDeclineRate: (value: number) => void;
  updateSaferWithdrawalRate: (value: number) => void;
  updateExpectedRealReturn: (value: number) => void;
  updatePartTimeIncome: (value: number) => void;
  updatePartTimeIncomeDuration: (value: number | null) => void;
  updateIncomeGrowthRate: (value: number) => void;
  updateExpenseGrowthRate: (value: number) => void;
  updateInflation: (value: number) => void;
  updateFeeDrag: (value: number) => void;
  updateStockAllocation: (value: number) => void;
  updateRebalanceFrequency: (value: Scenario["simulationSettings"]["rebalanceFrequency"]) => void;
  updateFinalValueTarget: (value: number) => void;
  updateSimulationType: (value: Scenario["simulationSettings"]["simulationType"]) => void;
  updateMonteCarloTrials: (value: number) => void;
  saveDraft: () => Promise<void>;
  resetScenario: () => void;

  /* ── Multi-scenario management ─────────────────────────────── */
  /**
   * Summary list of all saved scenarios — light-weight metadata only
   * (id, name, updatedAt, isActive). Refresh by calling
   * `refreshScenarioList()` after any mutation. Kept in the store
   * rather than fetched ad-hoc so the drawer switcher can react to
   * save/delete without plumbing.
   */
  scenarioList: ScenarioSummary[];
  refreshScenarioList: () => Promise<void>;
  /** Persist the current active scenario under a new id and switch to it. */
  duplicateActiveScenario: (name?: string) => Promise<void>;
  /** Start a fresh blank scenario (demo defaults) under a new id. */
  createBlankScenario: (name?: string) => Promise<void>;
  /** Switch the active draft to a different saved scenario. */
  switchToScenario: (scenarioId: string) => Promise<void>;
  /** Rename a scenario in-place (live if it's active; else off-screen). */
  renameScenario: (scenarioId: string, name: string) => Promise<void>;
  /** Delete a saved scenario. If it was active, falls back to the newest
   *  remaining scenario or a fresh default. */
  deleteScenario: (scenarioId: string) => Promise<void>;

  /**
   * Download the current active scenario as a JSON file. If
   *`includeAll` is true, exports every saved scenario in one file.
   * Surfaces as "take my data with me" button in the drawer.
   */
  exportScenarios: (options?: { includeAll?: boolean }) => Promise<void>;

  /**
   * Import scenarios from a JSON envelope (see `lib/domain/portability`).
   * Each imported scenario gets a fresh UUID so it never collides with
   * an existing one, and is appended to the saved list (does NOT
   * auto-switch — user picks from the switcher after import).
   *
   * Returns the number of scenarios successfully imported, or null
   * if the file couldn't be parsed.
   */
  importScenarios: (raw: string) => Promise<{
    imported: number;
    dropped: number;
  } | null>;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  updatedAt: string;
  isActive: boolean;
}

function updatePrimaryAccount(
  scenario: Scenario,
  updater: (scenario: Scenario) => Scenario,
) {
  const nextScenario = cloneScenario(scenario);
  return touchScenario(updater(nextScenario));
}

export const useScenarioStore = create<ScenarioStore>((set, get) => ({
  activeScenario: createDefaultScenario(),
  status: "idle",
  saveStatus: "idle",
  hydrationWarning: null,
  dismissHydrationWarning: () => set({ hydrationWarning: null }),
  initialize: async (input) => {
    set({ status: "hydrating" });

    const sharedScenario = input?.sharedScenario;
    const shareLinkProvided = input?.shareLinkProvided ?? false;

    if (sharedScenario) {
      set({
        activeScenario: touchScenario(cloneScenario(sharedScenario)),
        status: "ready",
      });
      return;
    }

    // A share link was on the URL but it failed to decode. Fall through to
    // the saved draft so the user still gets _something_, and queue a
    // non-blocking banner so they know their link didn't take.
    const shareLinkInvalid = shareLinkProvided && !sharedScenario;

    // IndexedDB can reject (Safari private mode, Firefox ETP strict,
    // cookie-blocking extensions). Previously this bubbled as an unhandled
    // promise rejection and left the store stuck in "hydrating" forever,
    // which silently disables auto-save. Catch it here, fall back to the
    // demo scenario, and surface a banner.
    let draft: Scenario | null = null;
    let storageUnavailable = false;
    try {
      draft = await loadScenarioDraft();
    } catch (error) {
      storageUnavailable = true;
      if (typeof console !== "undefined") {
        console.warn("[scenario-store] IndexedDB unavailable — using demo scenario", error);
      }
    }

    const warning: HydrationWarning | null = storageUnavailable
      ? "storage-unavailable"
      : shareLinkInvalid
        ? "share-link-invalid"
        : null;

    set({
      activeScenario: draft ? touchScenario(cloneScenario(draft)) : createDefaultScenario(),
      status: "ready",
      hydrationWarning: warning,
    });
    // Populate the scenario-list so the switcher UI has data the
    // moment the drawer opens. Fire-and-forget; IndexedDB
    // unavailability is already captured in `hydrationWarning` above.
    void get().refreshScenarioList();
  },
  replaceScenario: (scenario) =>
    set({
      activeScenario: touchScenario({ ...cloneScenario(scenario), isPersonalized: true }),
      saveStatus: "idle",
    }),
  updateCurrency: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        currency: value,
      }),
      saveStatus: "idle",
    })),
  updateCountry: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        profile: {
          ...state.activeScenario.profile,
          country: value,
        },
      }),
      saveStatus: "idle",
    })),
  updateIncome: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        annualIncome: Math.max(value, 0),
        isPersonalized: true,
      }),
      saveStatus: "idle",
    })),
  updateExpenses: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        annualExpenses: Math.max(value, 0),
        retirementExpenses: Math.max(value, 0),
        isPersonalized: true,
      }),
      saveStatus: "idle",
    })),
  updateRetirementExpenses: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        retirementExpenses: Math.max(value, 0),
        isPersonalized: true,
      }),
      saveStatus: "idle",
    })),
  updateAnnualSavings: (value) =>
    set((state) => ({
      activeScenario: updatePrimaryAccount(state.activeScenario, (scenario) => {
        const nextSavings = Math.max(value, 0);
        // See getFlexAccountIndex — prefer taxable so the tax-side doesn't
        // drift mid-drag (Save slider max depends on take-home).
        const flexIndex = getFlexAccountIndex(scenario);

        const otherContributionTotal = scenario.accounts.reduce(
          (total, account, accountIndex) =>
            accountIndex === flexIndex
              ? total
              : total + account.annualContribution,
          0,
        );

        return {
          ...scenario,
          isPersonalized: true,
          annualSavings: nextSavings,
          accounts: scenario.accounts.map((account, index) =>
            index === flexIndex
              ? {
                  ...account,
                  annualContribution: Math.max(
                    nextSavings - otherContributionTotal,
                    0,
                  ),
                }
              : account,
          ),
        };
      }),
      saveStatus: "idle",
    })),
  updateCurrentBalance: (value) =>
    set((state) => ({
      activeScenario: updatePrimaryAccount(state.activeScenario, (scenario) => ({
        ...scenario,
        isPersonalized: true,
        accounts: scenario.accounts.map((account, index) => {
          if (index !== 0) {
            return account;
          }

          const otherBalanceTotal = scenario.accounts
            .filter((_, accountIndex) => accountIndex !== 0)
            .reduce(
              (total, currentAccount) => total + currentAccount.currentBalance,
              0,
            );

          return {
            ...account,
            currentBalance: Math.max(value - otherBalanceTotal, 0),
          };
        }),
      })),
      saveStatus: "idle",
    })),
  updateProfileAge: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        isPersonalized: true,
        profile: {
          ...state.activeScenario.profile,
          age: Math.round(clamp(value, 18, 80)),
          retirementAge:
            state.activeScenario.profile.retirementAge === null
              ? null
              : Math.max(
                  state.activeScenario.profile.retirementAge,
                  Math.round(clamp(value, 18, 80)),
                ),
        },
      }),
      saveStatus: "idle",
    })),
  updateHealthStatus: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        profile: {
          ...state.activeScenario.profile,
          healthStatus: value,
        },
      }),
      saveStatus: "idle",
    })),
  setPartnerPlanningEnabled: (enabled) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        profile: {
          ...state.activeScenario.profile,
          householdSize: enabled
            ? Math.max(state.activeScenario.profile.householdSize, 2)
            : 1,
          partner: enabled
            ? state.activeScenario.profile.partner ?? createDefaultPartnerProfile()
            : undefined,
        },
      }),
      saveStatus: "idle",
    })),
  updatePartnerName: (value) =>
    set((state) => {
      if (!state.activeScenario.profile.partner) {
        return state;
      }

      return {
        activeScenario: touchScenario({
          ...state.activeScenario,
          profile: {
            ...state.activeScenario.profile,
            partner: {
              ...state.activeScenario.profile.partner,
              name: value,
            },
          },
        }),
        saveStatus: "idle",
      };
    }),
  updatePartnerAge: (value) =>
    set((state) => {
      if (!state.activeScenario.profile.partner) {
        return state;
      }

      return {
        activeScenario: touchScenario({
          ...state.activeScenario,
          profile: {
            ...state.activeScenario.profile,
            partner: {
              ...state.activeScenario.profile.partner,
              age: Math.round(clamp(value, 18, 80)),
            },
          },
        }),
        saveStatus: "idle",
      };
    }),
  updatePartnerRetirementAge: (value) =>
    set((state) => {
      if (!state.activeScenario.profile.partner) {
        return state;
      }

      return {
        activeScenario: touchScenario({
          ...state.activeScenario,
          profile: {
            ...state.activeScenario.profile,
            partner: {
              ...state.activeScenario.profile.partner,
              retirementAge: Math.round(
                clamp(value, state.activeScenario.profile.partner.age, 90),
              ),
            },
          },
        }),
        saveStatus: "idle",
      };
    }),
  updatePartnerIncome: (value) =>
    set((state) => {
      if (!state.activeScenario.profile.partner) {
        return state;
      }

      return {
        activeScenario: touchScenario({
          ...state.activeScenario,
          profile: {
            ...state.activeScenario.profile,
            partner: {
              ...state.activeScenario.profile.partner,
              annualIncome: Math.max(value, 0),
            },
          },
        }),
        saveStatus: "idle",
      };
    }),
  updatePartnerHealthStatus: (value) =>
    set((state) => {
      if (!state.activeScenario.profile.partner) {
        return state;
      }

      return {
        activeScenario: touchScenario({
          ...state.activeScenario,
          profile: {
            ...state.activeScenario.profile,
            partner: {
              ...state.activeScenario.profile.partner,
              healthStatus: value ?? "average",
            },
          },
        }),
        saveStatus: "idle",
      };
    }),
  updateRetirementAge: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        isPersonalized: true,
        profile: {
          ...state.activeScenario.profile,
          retirementAge: Math.round(
            clamp(value, state.activeScenario.profile.age, 90),
          ),
        },
      }),
      saveStatus: "idle",
    })),
  updateRetirementDuration: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        simulationSettings: {
          ...state.activeScenario.simulationSettings,
          retirementDuration: Math.round(clamp(value, 10, 60)),
        },
      }),
      saveStatus: "idle",
    })),
  updateWithdrawalRate: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        assumptions: {
          ...state.activeScenario.assumptions,
          withdrawalRate: clamp(value, 0.01, 0.2),
        },
        withdrawalStrategy: {
          ...state.activeScenario.withdrawalStrategy,
          initialRate: clamp(value, 0.01, 0.2),
        },
      }),
      saveStatus: "idle",
    })),
  updateWithdrawalStrategyType: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        withdrawalStrategy: {
          ...state.activeScenario.withdrawalStrategy,
          type: value,
        },
      }),
      saveStatus: "idle",
    })),
  updateWithdrawalStrategyInitialRate: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        withdrawalStrategy: {
          ...state.activeScenario.withdrawalStrategy,
          initialRate: clamp(value, 0.01, 0.2),
        },
      }),
      saveStatus: "idle",
    })),
  updateCapeParameter: (key, value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        withdrawalStrategy: {
          ...state.activeScenario.withdrawalStrategy,
          capeParams: {
            a: state.activeScenario.withdrawalStrategy.capeParams?.a ?? 0.0175,
            b: state.activeScenario.withdrawalStrategy.capeParams?.b ?? 0.5,
            [key]: key === "a" ? clamp(value, 0, 0.1) : clamp(value, 0, 2),
          },
        },
      }),
      saveStatus: "idle",
    })),
  updateGuytonKlingerParameter: (key, value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        withdrawalStrategy: {
          ...state.activeScenario.withdrawalStrategy,
          gkParams: {
            guardrailWidth:
              state.activeScenario.withdrawalStrategy.gkParams?.guardrailWidth ??
              0.2,
            adjustmentSize:
              state.activeScenario.withdrawalStrategy.gkParams?.adjustmentSize ??
              0.1,
            suspendCapPreservationYears:
              state.activeScenario.withdrawalStrategy.gkParams
                ?.suspendCapPreservationYears ?? 15,
            [key]:
              key === "suspendCapPreservationYears"
                ? Math.round(clamp(value, 0, 50))
                : clamp(value, 0, 1),
          },
        },
      }),
      saveStatus: "idle",
    })),
  updateFloorCeilingParameter: (key, value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        withdrawalStrategy: {
          ...state.activeScenario.withdrawalStrategy,
          floorCeiling: {
            floor: state.activeScenario.withdrawalStrategy.floorCeiling?.floor ?? 36_000,
            ceiling:
              state.activeScenario.withdrawalStrategy.floorCeiling?.ceiling ?? 72_000,
            [key]: Math.max(value, 0),
          },
        },
      }),
      saveStatus: "idle",
    })),
  updateSpendingDeclineRate: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        withdrawalStrategy: {
          ...state.activeScenario.withdrawalStrategy,
          spendingDeclineRate: clamp(value, 0, 0.05),
        },
      }),
      saveStatus: "idle",
    })),
  updateSaferWithdrawalRate: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        assumptions: {
          ...state.activeScenario.assumptions,
          saferWithdrawalRate: clamp(value, 0.01, 0.2),
        },
      }),
      saveStatus: "idle",
    })),
  updateExpectedRealReturn: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        assumptions: {
          ...state.activeScenario.assumptions,
          expectedRealReturn: clamp(value, 0, 0.2),
        },
      }),
      saveStatus: "idle",
    })),
  updatePartTimeIncome: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        assumptions: {
          ...state.activeScenario.assumptions,
          partTimeIncome: Math.max(value, 0),
        },
      }),
      saveStatus: "idle",
    })),
  updatePartTimeIncomeDuration: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        assumptions: {
          ...state.activeScenario.assumptions,
          partTimeIncomeDuration: value === null ? null : Math.max(Math.round(value), 1),
        },
      }),
      saveStatus: "idle",
    })),
  updateIncomeGrowthRate: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        assumptions: {
          ...state.activeScenario.assumptions,
          incomeGrowthRate: clamp(value, 0, 0.1),
        },
      }),
      saveStatus: "idle",
    })),
  updateExpenseGrowthRate: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        assumptions: {
          ...state.activeScenario.assumptions,
          expenseGrowthRate: clamp(value, 0, 0.1),
        },
      }),
      saveStatus: "idle",
    })),
  updateInflation: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        assumptions: {
          ...state.activeScenario.assumptions,
          inflation: clamp(value, 0, 0.08),
        },
      }),
      saveStatus: "idle",
    })),
  updateFeeDrag: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        simulationSettings: {
          ...state.activeScenario.simulationSettings,
          feeDrag: clamp(value, 0, 0.02),
        },
      }),
      saveStatus: "idle",
    })),
  updateStockAllocation: (value) =>
    set((state) => {
      const stocks = clamp(value, 0, 1);
      const bonds = roundTo(1 - stocks, 4);

      return {
        activeScenario: updatePrimaryAccount(state.activeScenario, (scenario) => ({
          ...scenario,
          accounts: scenario.accounts.map((account, index) =>
            index === 0
              ? {
                  ...account,
                  assetAllocation: {
                    stocks,
                    bonds,
                    alternatives: 0,
                  },
                }
              : account,
          ),
          assetAllocationGlidepath: scenario.assetAllocationGlidepath.map((point) => ({
            ...point,
            allocation: {
              stocks,
              bonds,
              alternatives: 0,
            },
          })),
        })),
        saveStatus: "idle",
      };
    }),
  updateRebalanceFrequency: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        simulationSettings: {
          ...state.activeScenario.simulationSettings,
          rebalanceFrequency: value,
        },
      }),
      saveStatus: "idle",
    })),
  updateFinalValueTarget: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        simulationSettings: {
          ...state.activeScenario.simulationSettings,
          finalValueTarget: clamp(value, 0, 1),
        },
      }),
      saveStatus: "idle",
    })),
  updateSimulationType: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        simulationSettings: {
          ...state.activeScenario.simulationSettings,
          simulationType: value,
        },
      }),
      saveStatus: "idle",
    })),
  updateMonteCarloTrials: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        simulationSettings: {
          ...state.activeScenario.simulationSettings,
          monteCarloTrials: Math.round(clamp(value, 100, 100_000)),
        },
      }),
      saveStatus: "idle",
    })),
  saveDraft: async () => {
    try {
      set({ saveStatus: "saving" });
      const scenario = get().activeScenario;
      await saveScenarioDraft(scenario);
      await syncScenarioForActiveAccount(scenario);
      set({ saveStatus: "saved" });
    } catch {
      set({ saveStatus: "error" });
    }
  },
  resetScenario: () =>
    set({
      activeScenario: createDefaultScenario(),
      saveStatus: "idle",
    }),

  /* ── Multi-scenario management ─────────────────────────────── */
  scenarioList: [],
  refreshScenarioList: async () => {
    try {
      const records = await listStoredScenarios();
      const activeId = get().activeScenario.id;
      set({
        scenarioList: records.map((r) => ({
          id: r.id,
          name: r.name,
          updatedAt: r.updatedAt,
          isActive: r.id === activeId,
        })),
      });
    } catch {
      // Storage unavailable — leave the list empty. The hydration
      // banner has already warned the user.
    }
  },
  duplicateActiveScenario: async (name) => {
    const current = get().activeScenario;
    const copy = cloneScenario(current);
    copy.id = crypto.randomUUID();
    copy.name = name ?? `${current.name} (copy)`;
    const now = new Date().toISOString();
    copy.createdAt = now;
    copy.updatedAt = now;
    copy.isPersonalized = true;
    try {
      await upsertScenarioRecord(copy);
      await setActiveDraftId(copy.id);
      set({ activeScenario: copy, saveStatus: "saved" });
      await get().refreshScenarioList();
    } catch {
      set({ saveStatus: "error" });
    }
  },
  createBlankScenario: async (name) => {
    const scenario = createDefaultScenario();
    scenario.id = crypto.randomUUID();
    scenario.name = name ?? "New plan";
    const now = new Date().toISOString();
    scenario.createdAt = now;
    scenario.updatedAt = now;
    // Intentionally NOT personalized — lands in the sample-scenario
    // banner's "explore" state until the user edits something.
    scenario.isPersonalized = false;
    try {
      await upsertScenarioRecord(scenario);
      await setActiveDraftId(scenario.id);
      set({ activeScenario: scenario, saveStatus: "saved" });
      await get().refreshScenarioList();
    } catch {
      set({ saveStatus: "error" });
    }
  },
  switchToScenario: async (scenarioId) => {
    if (scenarioId === get().activeScenario.id) return;
    try {
      const scenario = await loadScenarioById(scenarioId);
      if (!scenario) return;
      await setActiveDraftId(scenarioId);
      set({ activeScenario: touchScenario(scenario), saveStatus: "saved" });
      await get().refreshScenarioList();
    } catch {
      set({ saveStatus: "error" });
    }
  },
  renameScenario: async (scenarioId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = get().activeScenario;
    try {
      if (scenarioId === current.id) {
        // Active scenario: update in-memory + persist.
        const next = touchScenario({ ...current, name: trimmed });
        await upsertScenarioRecord(next);
        set({ activeScenario: next, saveStatus: "saved" });
      } else {
        // Off-screen scenario: load → mutate → persist without
        // affecting the active draft.
        const existing = await loadScenarioById(scenarioId);
        if (!existing) return;
        await upsertScenarioRecord(
          touchScenario({ ...existing, name: trimmed }),
        );
      }
      await get().refreshScenarioList();
    } catch {
      set({ saveStatus: "error" });
    }
  },
  deleteScenario: async (scenarioId) => {
    const current = get().activeScenario;
    const wasActive = scenarioId === current.id;
    try {
      await deleteScenarioRecord(scenarioId);

      if (wasActive) {
        // Fall back to the most-recently-updated remaining scenario,
        // or create a fresh default if the user just deleted their
        // last plan.
        const remaining = await listStoredScenarios();
        const fallback = remaining[0]?.scenario;
        if (fallback) {
          await setActiveDraftId(fallback.id);
          set({
            activeScenario: touchScenario(fallback),
            saveStatus: "saved",
          });
        } else {
          const fresh = createDefaultScenario();
          fresh.id = crypto.randomUUID();
          await upsertScenarioRecord(fresh);
          await setActiveDraftId(fresh.id);
          set({ activeScenario: fresh, saveStatus: "saved" });
        }
      }

      await get().refreshScenarioList();
    } catch {
      set({ saveStatus: "error" });
    }
  },
  exportScenarios: async (options) => {
    const includeAll = options?.includeAll ?? false;
    try {
      let scenarios: Scenario[];
      if (includeAll) {
        const records = await listStoredScenarios();
        // Dedupe against the in-memory active scenario — it may have
        // unsaved edits that haven't hit IDB yet (auto-save is
        // debounced). Prefer the in-memory copy when ids collide.
        const active = get().activeScenario;
        const map = new Map<string, Scenario>();
        for (const record of records) map.set(record.id, record.scenario);
        map.set(active.id, active);
        scenarios = [...map.values()];
      } else {
        scenarios = [get().activeScenario];
      }
      downloadScenarioExport(buildExportEnvelope(scenarios));
    } catch {
      // Download can only fail in weird SSR / blob-blocked contexts.
      // Leave saveStatus alone — this isn't a save failure.
    }
  },
  importScenarios: async (raw) => {
    const parsed = parseImportPayload(raw);
    if (!parsed) return null;

    let imported = 0;
    for (const scenario of parsed.scenarios) {
      // Fresh UUID so imports never collide with existing scenarios;
      // original id may have been from another device/install.
      const localCopy: Scenario = {
        ...cloneScenario(scenario),
        id: crypto.randomUUID(),
        isPersonalized: true,
      };
      try {
        await upsertScenarioRecord(touchScenario(localCopy));
        imported += 1;
      } catch {
        // IDB write failed for this scenario — skip and continue.
      }
    }

    await get().refreshScenarioList();
    return { imported, dropped: parsed.droppedCount };
  },
}));
