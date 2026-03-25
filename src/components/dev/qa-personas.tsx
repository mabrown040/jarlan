"use client";

import { useState, useEffect, useCallback } from "react";
import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import { clearScenarioDraft } from "@/lib/db/database";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import type { Scenario } from "@/lib/domain/types";

/* ── Persona Definitions ─────────────────────────────────── */

function createTechWorkerPersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Tech Worker";
  s.profile.age = 30;
  s.profile.retirementAge = 45;
  s.profile.filingStatus = "married_joint";
  s.profile.state = "CA";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 2;
  s.annualIncome = 300_000;
  s.annualExpenses = 100_000;
  s.retirementExpenses = 100_000;
  s.accounts = [
    {
      id: "qa-trad-401k",
      name: "401(k)",
      type: "traditional_401k",
      currentBalance: 200_000,
      annualContribution: 23_500,
      assetAllocation: { stocks: 0.9, bonds: 0.1, alternatives: 0 },
      expenseRatio: 0.0003,
      costBasis: 150_000,
      employerMatch: { percentage: 0.5, upTo: 0.06 },
    },
    {
      id: "qa-roth",
      name: "Roth IRA",
      type: "roth_401k",
      currentBalance: 80_000,
      annualContribution: 7_000,
      assetAllocation: { stocks: 0.9, bonds: 0.1, alternatives: 0 },
      expenseRatio: 0.0003,
      costBasis: 60_000,
    },
    {
      id: "qa-hsa",
      name: "HSA",
      type: "hsa",
      currentBalance: 20_000,
      annualContribution: 8_550,
      assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 },
      expenseRatio: 0.001,
      costBasis: 15_000,
    },
    {
      id: "qa-taxable",
      name: "Brokerage",
      type: "taxable",
      currentBalance: 200_000,
      annualContribution: 0, // remainder computed by UI
      assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 },
      expenseRatio: 0.0003,
      costBasis: 150_000,
    },
  ];
  s.assumptions.expectedRealReturn = 0.07;
  s.assumptions.withdrawalRate = 0.04;
  s.assumptions.incomeGrowthRate = 0.03;
  s.assumptions.expenseGrowthRate = 0.01;
  s.assumptions.partTimeIncome = 0;
  s.cashFlows = [];
  return s;
}

function createTeacherPersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Teacher";
  s.profile.age = 42;
  s.profile.retirementAge = 58;
  s.profile.filingStatus = "single";
  s.profile.state = "TX";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 1;
  s.annualIncome = 65_000;
  s.annualExpenses = 45_000;
  s.retirementExpenses = 40_000;
  s.accounts = [
    {
      id: "qa-403b",
      name: "403(b)",
      type: "traditional_401k",
      currentBalance: 60_000,
      annualContribution: 10_000,
      assetAllocation: { stocks: 0.7, bonds: 0.3, alternatives: 0 },
      expenseRatio: 0.005,
      costBasis: 45_000,
    },
    {
      id: "qa-taxable-teacher",
      name: "Brokerage",
      type: "taxable",
      currentBalance: 20_000,
      annualContribution: 0,
      assetAllocation: { stocks: 0.6, bonds: 0.4, alternatives: 0 },
      expenseRatio: 0.001,
      costBasis: 18_000,
    },
  ];
  s.assumptions.expectedRealReturn = 0.05;
  s.assumptions.withdrawalRate = 0.04;
  s.assumptions.incomeGrowthRate = 0.02;
  s.assumptions.expenseGrowthRate = 0.005;
  s.assumptions.partTimeIncome = 0;
  s.cashFlows = [];
  return s;
}

function createFreelancerPersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Freelancer";
  s.profile.age = 35;
  s.profile.retirementAge = 50;
  s.profile.filingStatus = "single";
  s.profile.state = "NY";
  s.profile.employmentType = "self_employed";
  s.profile.householdSize = 1;
  s.annualIncome = 120_000;
  s.annualExpenses = 60_000;
  s.retirementExpenses = 55_000;
  s.accounts = [
    {
      id: "qa-sep-ira",
      name: "SEP-IRA",
      type: "traditional_401k", // SEP-IRA is treated as traditional for tax purposes
      currentBalance: 100_000,
      annualContribution: 23_500,
      assetAllocation: { stocks: 0.85, bonds: 0.15, alternatives: 0 },
      expenseRatio: 0.0003,
      costBasis: 0, // all pre-tax
    },
    {
      id: "qa-roth-freelancer",
      name: "Roth IRA",
      type: "roth_401k",
      currentBalance: 40_000,
      annualContribution: 7_000,
      assetAllocation: { stocks: 0.9, bonds: 0.1, alternatives: 0 },
      expenseRatio: 0.0003,
      costBasis: 30_000,
    },
    {
      id: "qa-taxable-freelancer",
      name: "Brokerage",
      type: "taxable",
      currentBalance: 60_000,
      annualContribution: 0,
      assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 },
      expenseRatio: 0.0003,
      costBasis: 45_000,
    },
  ];
  s.assumptions.expectedRealReturn = 0.06;
  s.assumptions.withdrawalRate = 0.035;
  s.assumptions.incomeGrowthRate = 0.02;
  s.assumptions.expenseGrowthRate = 0.01;
  s.assumptions.partTimeIncome = 10_000;
  s.cashFlows = [];
  return s;
}

/* ── Edge Case Personas ───────────────────────────────────── */

function createHighEarnerPersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: High Earner HCOL";
  s.profile.age = 45;
  s.profile.retirementAge = 55;
  s.profile.filingStatus = "married_joint";
  s.profile.state = "CA";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 3;
  s.annualIncome = 550_000;
  s.annualExpenses = 200_000;
  s.retirementExpenses = 180_000;
  s.accounts = [
    { id: "qa-he-401k", name: "401(k)", type: "traditional_401k", currentBalance: 800_000, annualContribution: 23_500, assetAllocation: { stocks: 0.7, bonds: 0.3, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 0, employerMatch: { percentage: 1.0, upTo: 0.03 } },
    { id: "qa-he-roth", name: "Backdoor Roth", type: "roth_401k", currentBalance: 200_000, annualContribution: 7_000, assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 150_000 },
    { id: "qa-he-hsa", name: "HSA", type: "hsa", currentBalance: 50_000, annualContribution: 8_550, assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 }, expenseRatio: 0.001, costBasis: 30_000 },
    { id: "qa-he-taxable", name: "Brokerage", type: "taxable", currentBalance: 1_500_000, annualContribution: 0, assetAllocation: { stocks: 0.7, bonds: 0.2, alternatives: 0.1 }, expenseRatio: 0.0003, costBasis: 900_000 },
  ];
  s.assumptions = { ...s.assumptions, expectedRealReturn: 0.06, withdrawalRate: 0.035, incomeGrowthRate: 0.02, expenseGrowthRate: 0.01, partTimeIncome: 0 };
  s.cashFlows = [];
  return s;
}

function createYoungStarterPersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Young Starter";
  s.profile.age = 22;
  s.profile.retirementAge = 45;
  s.profile.filingStatus = "single";
  s.profile.state = "CO";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 1;
  s.annualIncome = 55_000;
  s.annualExpenses = 40_000;
  s.retirementExpenses = 35_000;
  s.accounts = [
    { id: "qa-ys-401k", name: "401(k)", type: "traditional_401k", currentBalance: 3_000, annualContribution: 5_000, assetAllocation: { stocks: 0.95, bonds: 0.05, alternatives: 0 }, expenseRatio: 0.001, costBasis: 0 },
    { id: "qa-ys-taxable", name: "Savings", type: "taxable", currentBalance: 2_000, annualContribution: 0, assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 }, expenseRatio: 0.001, costBasis: 2_000 },
  ];
  s.assumptions = { ...s.assumptions, expectedRealReturn: 0.07, withdrawalRate: 0.04, incomeGrowthRate: 0.04, expenseGrowthRate: 0.01, partTimeIncome: 0 };
  s.cashFlows = [];
  return s;
}

function createAlmostFirePersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Almost FIRE";
  s.profile.age = 48;
  s.profile.retirementAge = 50;
  s.profile.filingStatus = "married_joint";
  s.profile.state = "WA";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 2;
  s.annualIncome = 150_000;
  s.annualExpenses = 50_000;
  s.retirementExpenses = 50_000;
  s.accounts = [
    { id: "qa-af-401k", name: "401(k)", type: "traditional_401k", currentBalance: 600_000, annualContribution: 23_500, assetAllocation: { stocks: 0.7, bonds: 0.3, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 0 },
    { id: "qa-af-roth", name: "Roth IRA", type: "roth_401k", currentBalance: 300_000, annualContribution: 7_000, assetAllocation: { stocks: 0.7, bonds: 0.3, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 200_000 },
    { id: "qa-af-taxable", name: "Brokerage", type: "taxable", currentBalance: 900_000, annualContribution: 0, assetAllocation: { stocks: 0.6, bonds: 0.4, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 600_000 },
  ];
  s.assumptions = { ...s.assumptions, expectedRealReturn: 0.05, withdrawalRate: 0.04, incomeGrowthRate: 0.01, expenseGrowthRate: 0, partTimeIncome: 0 };
  s.cashFlows = [];
  return s;
}

function createRetiredPersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Already Retired";
  s.profile.age = 65;
  s.profile.retirementAge = 65;
  s.profile.filingStatus = "married_joint";
  s.profile.state = "FL";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 2;
  s.annualIncome = 0;
  s.annualExpenses = 60_000;
  s.retirementExpenses = 60_000;
  s.annualSavings = 0;
  s.accounts = [
    { id: "qa-ret-trad", name: "Traditional IRA", type: "traditional_401k", currentBalance: 800_000, annualContribution: 0, assetAllocation: { stocks: 0.5, bonds: 0.5, alternatives: 0 }, expenseRatio: 0.001, costBasis: 0 },
    { id: "qa-ret-roth", name: "Roth IRA", type: "roth_401k", currentBalance: 400_000, annualContribution: 0, assetAllocation: { stocks: 0.5, bonds: 0.5, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 300_000 },
    { id: "qa-ret-taxable", name: "Brokerage", type: "taxable", currentBalance: 800_000, annualContribution: 0, assetAllocation: { stocks: 0.4, bonds: 0.5, alternatives: 0.1 }, expenseRatio: 0.0003, costBasis: 500_000 },
  ];
  s.assumptions = { ...s.assumptions, expectedRealReturn: 0.04, withdrawalRate: 0.04, incomeGrowthRate: 0, expenseGrowthRate: 0.005, partTimeIncome: 0 };
  s.cashFlows = [];
  return s;
}

function createDualIncomePersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Dual Income";
  s.profile.age = 35;
  s.profile.retirementAge = 50;
  s.profile.filingStatus = "married_joint";
  s.profile.state = "IL";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 2;
  s.profile.partner = { name: "Partner", age: 33, annualIncome: 120_000, retirementAge: 50, socialSecurityBenefit: { monthlyBenefitAt62: 0, monthlyBenefitAtFra: 0, monthlyBenefitAt70: 0, claimingAge: 67 } };
  s.annualIncome = 180_000;
  s.annualExpenses = 80_000;
  s.retirementExpenses = 70_000;
  s.accounts = [
    { id: "qa-di-401k-1", name: "401(k) — Primary", type: "traditional_401k", currentBalance: 150_000, annualContribution: 23_500, assetAllocation: { stocks: 0.85, bonds: 0.15, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 0, employerMatch: { percentage: 0.5, upTo: 0.06 }, owner: "primary" as const },
    { id: "qa-di-401k-2", name: "401(k) — Partner", type: "traditional_401k", currentBalance: 80_000, annualContribution: 23_500, assetAllocation: { stocks: 0.85, bonds: 0.15, alternatives: 0 }, expenseRatio: 0.001, costBasis: 0, employerMatch: { percentage: 1.0, upTo: 0.03 }, owner: "partner" as const },
    { id: "qa-di-roth", name: "Roth IRAs", type: "roth_401k", currentBalance: 60_000, annualContribution: 14_000, assetAllocation: { stocks: 0.9, bonds: 0.1, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 45_000 },
    { id: "qa-di-taxable", name: "Joint Brokerage", type: "taxable", currentBalance: 100_000, annualContribution: 0, assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 70_000 },
  ];
  s.assumptions = { ...s.assumptions, expectedRealReturn: 0.06, withdrawalRate: 0.04, incomeGrowthRate: 0.03, expenseGrowthRate: 0.01, partTimeIncome: 0 };
  s.cashFlows = [];
  return s;
}

function createCoastFirePersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Coast FIRE";
  s.profile.age = 28;
  s.profile.retirementAge = 55;
  s.profile.filingStatus = "single";
  s.profile.state = "OR";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 1;
  s.annualIncome = 90_000;
  s.annualExpenses = 35_000;
  s.retirementExpenses = 35_000;
  s.accounts = [
    { id: "qa-cf-401k", name: "401(k)", type: "traditional_401k", currentBalance: 100_000, annualContribution: 15_000, assetAllocation: { stocks: 0.9, bonds: 0.1, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 0 },
    { id: "qa-cf-taxable", name: "Brokerage", type: "taxable", currentBalance: 300_000, annualContribution: 0, assetAllocation: { stocks: 0.85, bonds: 0.15, alternatives: 0 }, expenseRatio: 0.0003, costBasis: 200_000 },
  ];
  s.assumptions = { ...s.assumptions, expectedRealReturn: 0.07, withdrawalRate: 0.04, incomeGrowthRate: 0.02, expenseGrowthRate: 0, partTimeIncome: 0 };
  s.cashFlows = [];
  return s;
}

function createNegativeSavingsPersona(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.name = "QA: Negative Savings";
  s.profile.age = 30;
  s.profile.retirementAge = 65;
  s.profile.filingStatus = "single";
  s.profile.state = "GA";
  s.profile.employmentType = "w2";
  s.profile.householdSize = 1;
  s.annualIncome = 60_000;
  s.annualExpenses = 65_000;
  s.retirementExpenses = 50_000;
  s.annualSavings = 0;
  s.accounts = [
    { id: "qa-ns-taxable", name: "Savings", type: "taxable", currentBalance: 10_000, annualContribution: 0, assetAllocation: { stocks: 0.5, bonds: 0.5, alternatives: 0 }, expenseRatio: 0.001, costBasis: 10_000 },
  ];
  s.assumptions = { ...s.assumptions, expectedRealReturn: 0.05, withdrawalRate: 0.04, incomeGrowthRate: 0.02, expenseGrowthRate: 0.02, partTimeIncome: 0 };
  s.cashFlows = [];
  return s;
}

const PERSONAS = [
  // Core personas
  {
    id: "tech-worker",
    label: "Tech Worker",
    emoji: "💻",
    summary: "30yo, $300K, married, CA, 401k+Roth+HSA",
    create: createTechWorkerPersona,
  },
  {
    id: "teacher",
    label: "Teacher",
    emoji: "📚",
    summary: "42yo, $65K, single, TX (no state tax), 403b",
    create: createTeacherPersona,
  },
  {
    id: "freelancer",
    label: "Freelancer",
    emoji: "🎨",
    summary: "35yo, $120K, self-employed, NY, SEP-IRA",
    create: createFreelancerPersona,
  },
  // Edge case personas
  {
    id: "high-earner",
    label: "High Earner HCOL",
    emoji: "🏠",
    summary: "45yo, $550K, married, CA, max contributions",
    create: createHighEarnerPersona,
  },
  {
    id: "young-starter",
    label: "Young Starter",
    emoji: "👶",
    summary: "22yo, $55K, single, CO, $5K saved, long horizon",
    create: createYoungStarterPersona,
  },
  {
    id: "almost-fire",
    label: "Almost FIRE",
    emoji: "🔥",
    summary: "48yo, $150K, married, WA (no tax), $1.8M, ~2yr to FI",
    create: createAlmostFirePersona,
  },
  {
    id: "retired",
    label: "Already Retired",
    emoji: "👴",
    summary: "65yo, $0 income, FL, $2M portfolio, tests Spend side",
    create: createRetiredPersona,
  },
  {
    id: "dual-income",
    label: "Dual Income",
    emoji: "💑",
    summary: "35+33yo, $180K+$120K, married, IL, double 401k",
    create: createDualIncomePersona,
  },
  {
    id: "coast-fire",
    label: "Coast FIRE",
    emoji: "🌊",
    summary: "28yo, $90K, single, OR, $400K (past Coast target)",
    create: createCoastFirePersona,
  },
  {
    id: "negative-savings",
    label: "Negative Savings",
    emoji: "📉",
    summary: "30yo, $60K income, $65K spending, tests error states",
    create: createNegativeSavingsPersona,
  },
] as const;

/* ── Dev Modal Component ─────────────────────────────────── */

export function QADevModal() {
  const [open, setOpen] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);
  const replaceScenario = useScenarioStore((s) => s.replaceScenario);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Shift+Q (or Cmd+Shift+Q on Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Q") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (process.env.NODE_ENV !== "development") return null;
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[9999] rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-violet-700 hover:shadow-xl"
        title="QA Personas (Ctrl+Shift+Q)"
      >
        🧪 QA
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-80 rounded-xl border border-violet-300/50 bg-white/95 p-4 shadow-2xl backdrop-blur-sm dark:bg-gray-900/95">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-violet-700 dark:text-violet-400">
          🧪 QA Personas
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Load a pre-built persona to test with. Ctrl+Shift+Q to toggle.
      </p>

      <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            onClick={() => {
              const scenario = persona.create();
              // Compute taxable brokerage contribution as remainder
              const totalContribs = scenario.accounts
                .filter((a) => a.type !== "taxable")
                .reduce((sum, a) => sum + a.annualContribution, 0);
              const taxableAcct = scenario.accounts.find((a) => a.type === "taxable");
              if (taxableAcct) {
                // Rough remainder — will be refined by the tax engine
                const roughSavings = Math.max(scenario.annualIncome * 0.6 - scenario.annualExpenses, 0);
                taxableAcct.annualContribution = Math.max(roughSavings - totalContribs, 0);
              }
              scenario.annualSavings = scenario.accounts.reduce((sum, a) => sum + a.annualContribution, 0);
              replaceScenario(scenario);
              setLastLoaded(persona.id);
              setTimeout(() => setLastLoaded(null), 2000);
            }}
            className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
              lastLoaded === persona.id
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                : "border-border/60 bg-card hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
            }`}
          >
            <span className="text-lg">{persona.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {persona.label}
                {lastLoaded === persona.id && (
                  <span className="ml-2 text-xs font-normal text-emerald-600">✓ Loaded</span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">{persona.summary}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 border-t border-border/40 pt-2">
        <button
          onClick={async () => {
            // Full "new user" reset: clear persisted draft + reset store
            await clearScenarioDraft();
            replaceScenario(createDefaultScenario());
            setLastLoaded("reset");
            // Navigate to home page for fresh start experience
            window.location.href = "/";
          }}
          className="text-xs text-muted-foreground hover:text-red-500"
        >
          ↺ Reset to new user
          {lastLoaded === "reset" && <span className="ml-1 text-emerald-600">✓</span>}
        </button>
      </div>
    </div>
  );
}
