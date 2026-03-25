"use client";

import { useState, useEffect, useCallback } from "react";
import { cloneScenario, createDefaultScenario } from "@/lib/domain";
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

const PERSONAS = [
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

      <div className="mt-3 space-y-2">
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
          onClick={() => {
            replaceScenario(createDefaultScenario());
            setLastLoaded("reset");
            setTimeout(() => setLastLoaded(null), 2000);
          }}
          className="text-xs text-muted-foreground hover:text-red-500"
        >
          ↺ Reset to defaults
          {lastLoaded === "reset" && <span className="ml-1 text-emerald-600">✓</span>}
        </button>
      </div>
    </div>
  );
}
