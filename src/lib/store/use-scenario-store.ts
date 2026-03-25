"use client";

import { create } from "zustand";

import { loadScenarioDraft, saveScenarioDraft } from "@/lib/db/database";
import {
  cloneScenario,
  createDefaultPartnerProfile,
  createDefaultScenario,
  touchScenario,
  type Scenario,
} from "@/lib/domain";
import { syncScenarioForActiveAccount } from "@/lib/product";
import { clamp, roundTo } from "@/lib/utils";

type StoreStatus = "idle" | "hydrating" | "ready";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ScenarioStore {
  activeScenario: Scenario;
  status: StoreStatus;
  saveStatus: SaveStatus;
  initialize: (sharedScenario?: Scenario | null) => Promise<void>;
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
  initialize: async (sharedScenario) => {
    set({ status: "hydrating" });

    if (sharedScenario) {
      set({
        activeScenario: touchScenario(cloneScenario(sharedScenario)),
        status: "ready",
      });
      return;
    }

    const draft = await loadScenarioDraft();

    set({
      activeScenario: draft ? touchScenario(cloneScenario(draft)) : createDefaultScenario(),
      status: "ready",
    });
  },
  replaceScenario: (scenario) =>
    set({
      activeScenario: touchScenario(cloneScenario(scenario)),
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
      }),
      saveStatus: "idle",
    })),
  updateExpenses: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        annualExpenses: Math.max(value, 0),
        retirementExpenses: Math.max(value, 0),
      }),
      saveStatus: "idle",
    })),
  updateRetirementExpenses: (value) =>
    set((state) => ({
      activeScenario: touchScenario({
        ...state.activeScenario,
        retirementExpenses: Math.max(value, 0),
      }),
      saveStatus: "idle",
    })),
  updateAnnualSavings: (value) =>
    set((state) => ({
      activeScenario: updatePrimaryAccount(state.activeScenario, (scenario) => ({
        ...scenario,
        annualSavings: Math.max(value, 0),
        accounts: scenario.accounts.map((account, index) => {
          if (index !== 0) {
            return account;
          }

          const otherContributionTotal = scenario.accounts
            .filter((_, accountIndex) => accountIndex !== 0)
            .reduce(
              (total, currentAccount) =>
                total + currentAccount.annualContribution,
              0,
            );

          return {
            ...account,
            annualContribution: Math.max(value - otherContributionTotal, 0),
          };
        }),
      })),
      saveStatus: "idle",
    })),
  updateCurrentBalance: (value) =>
    set((state) => ({
      activeScenario: updatePrimaryAccount(state.activeScenario, (scenario) => ({
        ...scenario,
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
}));
