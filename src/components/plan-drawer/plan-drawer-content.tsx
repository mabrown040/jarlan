"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { FieldLabel } from "@/components/form/field-label";
import {
  formatCompactCurrency,
  formatPercent,
  getCurrentPortfolioBalance,
  syncScenarioRollups,
} from "@/lib/calc";
import {
  cloneScenario,
  createDefaultAccount,
  createDefaultCashFlowEvent,
} from "@/lib/domain";
import type {
  AccountOwner,
  AccountType,
  CashFlowEvent,
  CurrencyCode,
  Scenario,
} from "@/lib/domain/types";
import { getCountryPreset, listCountryPresets, listStateTaxPresets } from "@/lib/data";
import { useScenarioStore } from "@/lib/store";
import { estimateScenarioTax } from "@/lib/tax";
import { SSAImport } from "@/components/plan-drawer/ssa-import";
import { get401kEmployeeLimit, getRothIraLimit, getHsaLimit } from "@/lib/tax/limits";
import { clamp, cn } from "@/lib/utils";

const accountTypeOptions: Array<{ value: AccountType; label: string }> = [
  { value: "traditional_401k", label: "Traditional 401(k)" },
  { value: "roth_401k", label: "Roth 401(k)" },
  { value: "traditional_ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "taxable", label: "Taxable brokerage" },
  { value: "hsa", label: "HSA" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const accountOwnerOptions: Array<{ value: AccountOwner; label: string }> = [
  { value: "primary", label: "Primary" },
  { value: "partner", label: "Partner" },
  { value: "joint", label: "Joint" },
];

const countryPresets = listCountryPresets();
const stateTaxPresets = listStateTaxPresets();
const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
];

const withdrawalStrategyLabels: Record<string, string> = {
  fixed: "Fixed real",
  cape_dynamic: "CAPE dynamic",
  guyton_klinger: "Guyton-Klinger",
  vpw: "VPW",
  constant_pct: "Constant %",
  rmd: "RMD-based",
  floor_ceiling: "Floor & ceiling",
  spending_smile: "Spending smile",
};

export function PlanDrawerContent() {
  const {
    activeScenario,
    replaceScenario,
    updateIncome,
    updateExpenses,
    updateAnnualSavings,
    updateCurrentBalance,
    updateProfileAge,
    updateExpectedRealReturn,
    updateWithdrawalRate,
    updatePartTimeIncome,
    updatePartTimeIncomeDuration,
    updateIncomeGrowthRate,
    updateExpenseGrowthRate,
    updateInflation,
    updateFeeDrag,
    updateTaxRateOverride,
    updateCountry,
    updateCurrency,
    setPartnerPlanningEnabled,
    updatePartnerName,
    updatePartnerAge,
    updatePartnerRetirementAge,
    updatePartnerIncome,
    updatePartnerHealthStatus,
    updateRetirementExpenses,
  } = useScenarioStore();

  const [expenseMode, setExpenseMode] = useState<"annual" | "monthly">("annual");
  const [showRetirementExpenses, setShowRetirementExpenses] = useState(
    activeScenario.retirementExpenses !== activeScenario.annualExpenses,
  );
  const [savingsOverride, setSavingsOverride] = useState(false);

  const currentBalance = useMemo(
    () => getCurrentPortfolioBalance(activeScenario.accounts),
    [activeScenario.accounts],
  );
  const countryPreset = useMemo(
    () => getCountryPreset(activeScenario.profile.country),
    [activeScenario.profile.country],
  );

  const taxCalc = useMemo(
    () => estimateScenarioTax(activeScenario),
    [activeScenario],
  );

  function updateScenario(mutator: (scenario: Scenario) => void) {
    const next = cloneScenario(activeScenario);
    mutator(next);
    replaceScenario(syncScenarioRollups(next));
  }

  function handleCountryChange(value: string) {
    const preset = getCountryPreset(value);
    updateCountry(preset.code);
    updateCurrency(preset.currency);
  }

  // When income or expenses change, recalculate savings using tax-aware math
  function handleIncomeChange(value: number) {
    updateIncome(value);
    if (!savingsOverride) {
      // Compute savings with the NEW income value (not yet in store)
      const tax = estimateScenarioTax({ ...activeScenario, annualIncome: value });
      updateAnnualSavings(Math.round(tax.actualSavings));
    }
  }

  function handleExpensesChange(value: number) {
    const annual = expenseMode === "monthly" ? value * 12 : value;
    updateExpenses(annual);
    if (!savingsOverride) {
      const tax = estimateScenarioTax({ ...activeScenario, annualExpenses: annual });
      updateAnnualSavings(Math.round(tax.actualSavings));
    }
  }

  function handleSavingsOverride(value: number) {
    setSavingsOverride(true);
    updateAnnualSavings(value);
  }

  const expenseValue =
    expenseMode === "monthly"
      ? Math.round(activeScenario.annualExpenses / 12)
      : activeScenario.annualExpenses;

  return (
    <div className="space-y-3 p-4">
      {/* ── Today ── */}
      <CollapsibleSection
        title="Today"
        summary={`${formatCompactCurrency(activeScenario.annualIncome)} income · ${formatCompactCurrency(currentBalance)} saved`}
        defaultOpen
      >
        <div className="space-y-4">
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-income" label="Gross income" tooltip="Annual pre-tax income from all sources." />
              <NumberInput id="drawer-income" min={0} step={1000} inputMode="numeric" value={activeScenario.annualIncome} onValueChange={handleIncomeChange} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-filing" label="Filing status" tooltip="Affects federal tax brackets. Married filing jointly has wider brackets and lower effective rates." />
              <Select id="drawer-filing" value={activeScenario.profile.filingStatus} onChange={(e) => updateScenario((s) => { s.profile.filingStatus = e.target.value as Scenario["profile"]["filingStatus"]; })}>
                <option value="single">Single</option>
                <option value="married_joint">Married joint</option>
                <option value="married_separate">Married separate</option>
                <option value="head_of_household">Head of household</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-employment" label="Employment type" tooltip="Affects FICA taxes. Self-employed and 1099 workers pay both halves (~15.3%)." />
              <Select id="drawer-employment" value={activeScenario.profile.employmentType} onChange={(e) => updateScenario((s) => { s.profile.employmentType = e.target.value as Scenario["profile"]["employmentType"]; })}>
                <option value="w2">W-2 Employee</option>
                <option value="self_employed">Self-employed</option>
                <option value="1099">1099 Contractor</option>
              </Select>
              <p className="text-[10px] text-muted-foreground">Self-employed and 1099 workers pay both halves of FICA (~15.3% vs ~7.65% for W-2)</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="drawer-expenses" label={expenseMode === "monthly" ? "Monthly spending" : "Annual spending"} />
              <div className="inline-flex rounded-full border border-border/60 bg-background/70 p-0.5 text-xs">
                {(["annual", "monthly"] as const).map((mode) => (
                  <button key={mode} type="button" className={cn("rounded-full px-2 py-0.5 transition-colors", expenseMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setExpenseMode(mode)}>
                    {mode === "annual" ? "Yearly" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>
            <NumberInput id="drawer-expenses" min={0} step={expenseMode === "monthly" ? 100 : 1000} inputMode="numeric" value={expenseValue} onValueChange={handleExpensesChange} />
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Est. taxes</span>
              <span className="tabular-nums text-foreground">{formatCompactCurrency(taxCalc.totalTax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 py-1">
              <span className="text-muted-foreground">Take-home</span>
              <span className="tabular-nums text-foreground">{formatCompactCurrency(taxCalc.takeHome)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 py-1">
              <span className="font-medium text-foreground">Savings</span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums font-semibold text-foreground">{formatCompactCurrency(savingsOverride ? activeScenario.annualSavings : taxCalc.actualSavings)}</span>
                <span className="text-muted-foreground">({formatPercent(savingsOverride ? (taxCalc.takeHome > 0 ? activeScenario.annualSavings / taxCalc.takeHome : 0) : taxCalc.afterTaxSavingsRate, 0)})</span>
                <button type="button" className="text-xs font-medium text-primary hover:text-primary/80" onClick={() => { if (savingsOverride) { setSavingsOverride(false); updateAnnualSavings(Math.round(taxCalc.actualSavings)); } else { setSavingsOverride(true); } }}>{savingsOverride ? "Auto" : "Edit"}</button>
              </div>
            </div>
            {savingsOverride ? (
              <div className="mt-2 border-t border-border/30 pt-2">
                <NumberInput id="drawer-savings" min={0} step={1000} inputMode="numeric" value={activeScenario.annualSavings} onValueChange={handleSavingsOverride} />
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-balance" label="Portfolio balance" tooltip="Total current investments across all accounts. This is your starting point for projections." />
              <NumberInput id="drawer-balance" min={0} step={1000} inputMode="numeric" value={currentBalance} onValueChange={updateCurrentBalance} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-age" label="Age" tooltip="Your current age. Used to calculate years to FI and milestone timing." />
              <NumberInput id="drawer-age" min={18} max={80} inputMode="numeric" value={activeScenario.profile.age} onValueChange={updateProfileAge} />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Retirement ── */}
      <CollapsibleSection
        title="Retirement"
        summary={`Retire at ${activeScenario.profile.retirementAge ?? "?"} · ${formatPercent(activeScenario.assumptions.withdrawalRate, 1)} ${withdrawalStrategyLabels[activeScenario.withdrawalStrategy.type] ?? "Fixed"}`}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-ret-age" label="Retire at" tooltip="Target age for financial independence. Coast FIRE calculations use this as the compounding horizon." />
              <NumberInput id="drawer-ret-age" min={18} max={90} inputMode="numeric" value={activeScenario.profile.retirementAge ?? activeScenario.profile.age} onValueChange={(v) => updateScenario((s) => { s.profile.retirementAge = v; s.simulationSettings.retirementDuration = Math.max(10, 100 - v); })} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-ret-duration" label="Plan horizon" tooltip="How many years the backtest models. ERN recommends 50-60 years for early retirees." />
              <NumberInput id="drawer-ret-duration" min={10} max={60} inputMode="numeric" value={activeScenario.simulationSettings.retirementDuration} onValueChange={(v) => updateScenario((s) => { s.simulationSettings.retirementDuration = Math.round(Math.max(10, Math.min(60, v))); })} />
            </div>
          </div>
          {showRetirementExpenses ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="drawer-ret-expenses" label="Retirement spending" tooltip="If your spending will differ in retirement (e.g., no mortgage, more travel). Drives your FIRE number." learnHref="/education/fire-number" />
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setShowRetirementExpenses(false); updateRetirementExpenses(activeScenario.annualExpenses); }}>Same as now</button>
              </div>
              <NumberInput id="drawer-ret-expenses" min={0} step={1000} inputMode="numeric" value={activeScenario.retirementExpenses} onValueChange={updateRetirementExpenses} />
            </div>
          ) : (
            <button type="button" className="text-sm text-primary transition-colors hover:text-primary/80" onClick={() => setShowRetirementExpenses(true)}>Different spending in retirement?</button>
          )}
          <div className="space-y-1.5">
            <FieldLabel htmlFor="drawer-postfire" label="Post-FIRE income" tooltip="Expected annual income after retirement (part-time, consulting, rental, etc.). Reduces the portfolio you need." />
            <NumberInput id="drawer-postfire" min={0} step={1000} inputMode="numeric" value={activeScenario.assumptions.partTimeIncome} onValueChange={updatePartTimeIncome} />
          </div>
          {activeScenario.assumptions.partTimeIncome > 0 ? (
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-postfire-duration" label="Duration (years)" tooltip="How many years you plan to earn post-FIRE income. Leave blank for indefinite (most optimistic — lower FIRE target)." />
              <Input
                id="drawer-postfire-duration"
                type="text"
                inputMode="numeric"
                placeholder="∞ indefinite"
                className="font-mono tabular-nums"
                value={activeScenario.assumptions.partTimeIncomeDuration ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (raw === "") {
                    updatePartTimeIncomeDuration(null);
                  } else {
                    const n = parseInt(raw, 10);
                    if (Number.isFinite(n) && n >= 1 && n <= 50) {
                      updatePartTimeIncomeDuration(n);
                    }
                  }
                }}
              />
              <p className="text-[10px] text-muted-foreground">
                {activeScenario.assumptions.partTimeIncomeDuration
                  ? `${activeScenario.assumptions.partTimeIncomeDuration} years of part-time work, then fully off portfolio`
                  : "Leave blank for indefinite — the most optimistic assumption"}
              </p>
              {activeScenario.assumptions.partTimeIncomeDuration !== null && (
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary/80"
                  onClick={() => updatePartTimeIncomeDuration(null)}
                >
                  Set to indefinite
                </button>
              )}
            </div>
          ) : null}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-wr" label="Withdrawal rate" tooltip="The classic 4% rule. Lower is safer for longer retirements." learnHref="/education/the-4-percent-rule" />
              <span className="text-sm font-medium">{formatPercent(activeScenario.assumptions.withdrawalRate, 2)}</span>
            </div>
            <Slider id="drawer-wr" min={0.025} max={0.06} step={0.001} value={[activeScenario.assumptions.withdrawalRate]} onValueChange={([v]) => updateWithdrawalRate(v)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-strategy" label="Strategy" tooltip="The withdrawal method for drawing income each year. Different strategies handle market volatility differently." learnHref="/education/withdrawal-strategies" />
              <a href="/education#safe-withdrawal-rate" className="text-xs font-medium text-primary transition-colors hover:text-primary/80">Learn more →</a>
            </div>
            <Select id="drawer-strategy" value={activeScenario.withdrawalStrategy.type} onChange={(e) => updateScenario((s) => { s.withdrawalStrategy.type = e.target.value as typeof s.withdrawalStrategy.type; })}>
              <option value="fixed">Fixed real (4% rule)</option>
              <option value="cape_dynamic">CAPE-based dynamic (ERN)</option>
              <option value="guyton_klinger">Guyton-Klinger guardrails</option>
              <option value="vpw">Variable Percentage (VPW)</option>
              <option value="constant_pct">Constant % of portfolio</option>
              <option value="rmd">RMD-based</option>
              <option value="floor_ceiling">Floor &amp; ceiling</option>
              <option value="spending_smile">Spending smile</option>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-stocks" label="Stock allocation" tooltip="The rest goes to bonds. Historical backtests use real stock and bond returns." />
              <span className="text-sm font-medium">{formatPercent(activeScenario.assetAllocationGlidepath[0]?.allocation.stocks ?? 0.8, 0)} stocks</span>
            </div>
            <Slider id="drawer-stocks" min={0} max={1} step={0.05} value={[activeScenario.assetAllocationGlidepath[0]?.allocation.stocks ?? 0.8]} onValueChange={([v]) => updateScenario((s) => { if (s.assetAllocationGlidepath.length > 0) { s.assetAllocationGlidepath[0].allocation.stocks = v; s.assetAllocationGlidepath[0].allocation.bonds = 1 - v; } })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-terminal" label="Terminal target" tooltip="0% = survival only. 100% = preserve the full starting portfolio." />
              <Select id="drawer-terminal" value={String(activeScenario.simulationSettings.finalValueTarget)} onChange={(e) => updateScenario((s) => { s.simulationSettings.finalValueTarget = Number(e.target.value); })}>
                <option value="0">Survival only</option>
                <option value="0.25">Preserve 25%</option>
                <option value="1">Preserve 100%</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-rebalance" label="Rebalancing" tooltip="How often to reset your stock/bond split to the target." />
              <Select id="drawer-rebalance" value={activeScenario.simulationSettings.rebalanceFrequency} onChange={(e) => updateScenario((s) => { s.simulationSettings.rebalanceFrequency = e.target.value as typeof s.simulationSettings.rebalanceFrequency; })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="drawer-mc-mode" label="Monte Carlo mode" tooltip="How random returns are generated. Bootstrap uses actual historical returns." learnHref="/education/monte-carlo" />
            <Select id="drawer-mc-mode" value={activeScenario.simulationSettings.simulationType === "historical" ? "monte_carlo_bootstrap" : activeScenario.simulationSettings.simulationType} onChange={(e) => updateScenario((s) => { s.simulationSettings.simulationType = e.target.value as typeof s.simulationSettings.simulationType; })}>
              <option value="monte_carlo_parametric">Parametric</option>
              <option value="monte_carlo_bootstrap">Bootstrap</option>
              <option value="monte_carlo_block">Block bootstrap</option>
              <option value="monte_carlo_regime">Regime switching</option>
            </Select>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Growth ── */}
      <CollapsibleSection
        title="Growth"
        summary={`${formatPercent(activeScenario.assumptions.expectedRealReturn, 0)} return · ${formatPercent(activeScenario.assumptions.incomeGrowthRate ?? 0.01, 0)} income growth`}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-return" label="Expected real return" tooltip="After-inflation investment return. Historical US stocks average ~7% real." learnHref="/education/real-vs-nominal-returns" />
              <span className="text-sm font-medium">{formatPercent(activeScenario.assumptions.expectedRealReturn, 1)}</span>
            </div>
            <Slider id="drawer-return" min={0} max={0.1} step={0.005} value={[activeScenario.assumptions.expectedRealReturn]} onValueChange={([v]) => updateExpectedRealReturn(v)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-fees" label="Investment fees" tooltip="Total expense ratio of your funds. Subtracted from real return." learnHref="/education/investment-fees" />
              <span className="text-sm font-medium">{formatPercent(activeScenario.simulationSettings.feeDrag, 2)}</span>
            </div>
            <Slider id="drawer-fees" min={0} max={0.02} step={0.001} value={[activeScenario.simulationSettings.feeDrag]} onValueChange={([v]) => updateFeeDrag(v)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-income-growth" label="Real income growth" tooltip="Annual raise above inflation. 1% means income grows 1% faster than prices." />
              <span className="text-sm font-medium">{formatPercent(activeScenario.assumptions.incomeGrowthRate ?? 0.01, 1)}</span>
            </div>
            <Slider id="drawer-income-growth" min={0} max={0.1} step={0.005} value={[activeScenario.assumptions.incomeGrowthRate ?? 0.01]} onValueChange={([v]) => updateIncomeGrowthRate(v)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-expense-growth" label="Lifestyle creep" tooltip="How fast spending grows above inflation. 0% keeps spending flat in today's dollars." learnHref="/education/lifestyle-creep" />
              <span className="text-sm font-medium">{formatPercent(activeScenario.assumptions.expenseGrowthRate ?? 0, 1)}</span>
            </div>
            <Slider id="drawer-expense-growth" min={0} max={0.05} step={0.005} value={[activeScenario.assumptions.expenseGrowthRate ?? 0]} onValueChange={([v]) => updateExpenseGrowthRate(v)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-inflation" label="Inflation" tooltip="For context only. Projections use real (today's) dollars." learnHref="/education/real-vs-nominal-returns" />
              <span className="text-sm font-medium">{formatPercent(activeScenario.assumptions.inflation, 1)}</span>
            </div>
            <Slider id="drawer-inflation" min={0} max={0.08} step={0.005} value={[activeScenario.assumptions.inflation]} onValueChange={([v]) => updateInflation(v)} />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Tax estimate ──
          Default: calculator computes federal/state/FICA from
          income + filing status + state. Power-user override: type
          your own effective rate and we skip the bracket math.
          Used for unique tax situations the calculator can't model
          (foreign income, gov pension, big capital gains, AMT). */}
      <CollapsibleSection
        title="Tax estimate"
        summary={
          typeof activeScenario.assumptions.taxRateOverride === "number"
            ? `Manual: ${formatPercent(activeScenario.assumptions.taxRateOverride, 1)} effective`
            : "Calculator-estimated"
        }
      >
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={
                typeof activeScenario.assumptions.taxRateOverride === "number"
              }
              onChange={(e) => {
                // Toggling on seeds with the calculator's current
                // estimate so the user starts from a sensible value
                // rather than 0%. Toggling off clears to null (use
                // calculator).
                if (e.target.checked) {
                  const seed = taxCalc.effectiveRate || 0.25;
                  updateTaxRateOverride(seed);
                } else {
                  updateTaxRateOverride(null);
                }
              }}
              className="mt-0.5 size-4 rounded border-border/60 text-[var(--ember)] focus:ring-1 focus:ring-[var(--ember)]"
            />
            <span className="text-sm">
              <span className="font-medium text-foreground">
                Use my own effective tax rate
              </span>
              <span className="ml-1 text-muted-foreground">
                (overrides federal + state + FICA estimate)
              </span>
            </span>
          </label>
          {typeof activeScenario.assumptions.taxRateOverride === "number" ? (
            <div className="space-y-2 pl-6">
              {/* Two-way bound fields. Rate is the source of truth in
                  the schema; the dollar input is a derived view that
                  converts at the UI boundary using gross income.
                  NumberInput's focus-aware draft state keeps the
                  active field from being stomped on the round-trip. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor="drawer-tax-override-pct"
                    label="Effective rate"
                    tooltip="Total tax (federal + state + FICA + anything else) as a percentage of gross income. Look at last year's tax return: Total tax / gross income."
                  />
                  <div className="relative">
                    <NumberInput
                      id="drawer-tax-override-pct"
                      min={0}
                      max={70}
                      step={0.5}
                      inputMode="decimal"
                      // Display + edit as percentage points (e.g. 27.5)
                      // while the schema stores 0.275.
                      value={Math.round(
                        activeScenario.assumptions.taxRateOverride * 1000,
                      ) / 10}
                      onValueChange={(v) =>
                        updateTaxRateOverride(clamp(v / 100, 0, 0.7))
                      }
                      className="pr-7"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor="drawer-tax-override-dollars"
                    label="Annual tax"
                    tooltip="Total dollars paid in tax per year. Edit either field — they're tied to the same number, so the other updates to match."
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <NumberInput
                      id="drawer-tax-override-dollars"
                      min={0}
                      max={
                        taxCalc.grossIncome > 0
                          ? Math.round(taxCalc.grossIncome * 0.7)
                          : undefined
                      }
                      step={100}
                      inputMode="numeric"
                      disabled={taxCalc.grossIncome <= 0}
                      value={Math.round(
                        taxCalc.grossIncome *
                          activeScenario.assumptions.taxRateOverride,
                      )}
                      onValueChange={(v) => {
                        if (taxCalc.grossIncome <= 0) return;
                        updateTaxRateOverride(
                          clamp(v / taxCalc.grossIncome, 0, 0.7),
                        );
                      }}
                      className="pl-6"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {taxCalc.grossIncome > 0
                  ? "Edit either field — the other updates automatically."
                  : "Add an income above to enter a dollar amount."}
              </p>
              <button
                type="button"
                onClick={() => {
                  // Re-seed to the calculator's estimate WITHOUT the
                  // override (taxCalc would just echo the user's
                  // current override since the engine short-circuits).
                  // Keep the override toggle on — clearing it is the
                  // checkbox's job, not Reset's.
                  const est = estimateScenarioTax({
                    ...activeScenario,
                    assumptions: {
                      ...activeScenario.assumptions,
                      taxRateOverride: null,
                    },
                  });
                  updateTaxRateOverride(est.effectiveRate);
                }}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Reset to calculator estimate
              </button>
            </div>
          ) : (
            <p className="pl-6 text-xs text-muted-foreground">
              Calculator estimate: {formatPercent(taxCalc.effectiveRate, 1)}{" "}
              effective ({formatCompactCurrency(taxCalc.totalTax)}/yr).
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* ── Accounts ── */}
      <CollapsibleSection
        title="Accounts"
        summary={`${activeScenario.accounts.length} account${activeScenario.accounts.length === 1 ? "" : "s"}, ${formatCompactCurrency(currentBalance)}`}
      >
        <div className="space-y-3">
          {activeScenario.accounts.map((account) => (
            <div key={account.id} className="space-y-3 rounded-lg border border-border/50 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-name-${account.id}`} label="Name" tooltip="A label for this account (e.g., 'Vanguard 401k')." />
                  <Input id={`drawer-acct-name-${account.id}`} value={account.name} onChange={(e) => updateScenario((s) => { const a = s.accounts.find((c) => c.id === account.id); if (a) a.name = e.target.value; })} />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-type-${account.id}`} label="Type" tooltip="Account type determines tax treatment. Pre-tax (401k/IRA), tax-free (Roth), or taxable." learnHref="/education/account-types" />
                  <Select id={`drawer-acct-type-${account.id}`} value={account.type} onChange={(e) => updateScenario((s) => { const a = s.accounts.find((c) => c.id === account.id); if (a) a.type = e.target.value as AccountType; })}>
                    {accountTypeOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-bal-${account.id}`} label="Balance" tooltip="Current balance in this account." />
                  <NumberInput id={`drawer-acct-bal-${account.id}`} min={0} step={1000} inputMode="numeric" value={account.currentBalance} onValueChange={(v) => updateScenario((s) => { const a = s.accounts.find((c) => c.id === account.id); if (a) a.currentBalance = Math.max(v, 0); })} />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-contrib-${account.id}`} label="Contribution/yr" tooltip="How much you add to this account each year." />
                  <NumberInput id={`drawer-acct-contrib-${account.id}`} min={0} step={1000} inputMode="numeric" value={account.annualContribution} onValueChange={(v) => updateScenario((s) => { const a = s.accounts.find((c) => c.id === account.id); if (a) a.annualContribution = Math.max(v, 0); })} />
                  {(() => {
                    const age = activeScenario.profile.age;
                    const is50Plus = age >= 50;
                    const isSuperCatchUp = age >= 60 && age <= 63;
                    const catchUp = isSuperCatchUp ? " (super catch-up)" : is50Plus ? " (includes catch-up)" : "";
                    if (account.type === "traditional_401k") {
                      const limit401k = get401kEmployeeLimit(age);
                      return <p className="text-[10px] text-muted-foreground">Employee limit: ${(limit401k / 1000).toFixed(1)}K/yr{catchUp} (2025)</p>;
                    }
                    if (account.type === "roth_401k" || account.type === "roth_ira") {
                      const iraLimit = getRothIraLimit(age);
                      return <p className="text-[10px] text-muted-foreground">Roth IRA: ${(iraLimit / 1000).toFixed(0)}K/yr direct{catchUp}. Mega backdoor: up to ~$46K more if your plan allows.</p>;
                    }
                    if (account.type === "traditional_ira") {
                      const iraLimit = getRothIraLimit(age);
                      return <p className="text-[10px] text-muted-foreground">IRA limit: ${iraLimit.toLocaleString()}/yr{catchUp} (2025)</p>;
                    }
                    if (account.type === "hsa") {
                      const hsaLimit = getHsaLimit(age, activeScenario.profile.filingStatus);
                      return <p className="text-[10px] text-muted-foreground">HSA limit: ${(hsaLimit / 1000).toFixed(1)}K/yr{age >= 55 ? " (includes catch-up)" : ""} (2025). <Link href="/education/hsa-triple-advantage" className="text-[var(--ember)] hover:underline">Triple tax advantage →</Link></p>;
                    }
                    return null;
                  })()}
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-match-${account.id}`} label="Match %" tooltip="Employer match as a decimal (e.g., 0.5 = 50% match on your contribution)." />
                  <NumberInput id={`drawer-acct-match-${account.id}`} min={0} max={1} step={0.01} inputMode="decimal" value={account.employerMatch?.percentage ?? 0} onValueChange={(v) => updateScenario((s) => { const a = s.accounts.find((c) => c.id === account.id); if (a) { a.employerMatch = { percentage: Math.max(v, 0), upTo: a.employerMatch?.upTo ?? 0 }; } })} />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-owner-${account.id}`} label="Owner" tooltip="Who owns this account. Joint accounts are shared between partners." />
                  <Select id={`drawer-acct-owner-${account.id}`} value={account.owner ?? "primary"} onChange={(e) => updateScenario((s) => { const a = s.accounts.find((c) => c.id === account.id); if (a) a.owner = e.target.value as AccountOwner; })}>
                    {accountOwnerOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </Select>
                </div>
              </div>
              {activeScenario.accounts.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => updateScenario((s) => { s.accounts = s.accounts.filter((c) => c.id !== account.id); })}>Remove</Button>
              ) : null}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => updateScenario((s) => { s.accounts.push(createDefaultAccount("traditional_401k", "New account", s.profile.partner ? "joint" : "primary")); })}>Add account</Button>
        </div>
      </CollapsibleSection>

      {/* ── Household ── */}
      <CollapsibleSection
        title="Household"
        summary={`${activeScenario.profile.partner ? activeScenario.profile.partner.name : "Solo"} · ${countryPreset.code} · ${activeScenario.currency}`}
      >
        <div className="space-y-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setPartnerPlanningEnabled(!activeScenario.profile.partner)}>
            {activeScenario.profile.partner ? "Remove partner" : "Add a partner"}
          </Button>
          {activeScenario.profile.partner ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-partner-name" label="Name" tooltip="Your partner's name for labeling accounts and projections." />
                <Input id="drawer-partner-name" value={activeScenario.profile.partner.name} onChange={(e) => updatePartnerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-partner-income" label="Income" tooltip="Partner's gross annual income. Combined household income is used for tax calculations." />
                <NumberInput id="drawer-partner-income" min={0} step={1000} inputMode="numeric" value={activeScenario.profile.partner.annualIncome ?? 0} onValueChange={updatePartnerIncome} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-partner-age" label="Age" tooltip="Partner's current age. May differ from yours for joint retirement planning." />
                <NumberInput id="drawer-partner-age" min={18} max={80} inputMode="numeric" value={activeScenario.profile.partner.age} onValueChange={updatePartnerAge} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-partner-ret" label="Retirement age" tooltip="When your partner plans to stop working. Their income stops at this age." />
                <NumberInput id="drawer-partner-ret" min={18} max={90} inputMode="numeric" value={activeScenario.profile.partner.retirementAge ?? activeScenario.profile.partner.age} onValueChange={updatePartnerRetirementAge} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel htmlFor="drawer-partner-health" label="Health outlook" tooltip="Shifts life expectancy ±5 years. Used for mortality-adjusted withdrawal analysis." />
                <Select id="drawer-partner-health" value={activeScenario.profile.partner.healthStatus ?? "average"} onChange={(e) => updatePartnerHealthStatus(e.target.value as NonNullable<NonNullable<Scenario["profile"]["partner"]>["healthStatus"]>)}>
                  <option value="below_average">Below average</option>
                  <option value="average">Average</option>
                  <option value="above_average">Above average</option>
                </Select>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-country" label="Country" tooltip="Sets tax rules and currency defaults. US has the most detailed tax modeling." />
              <Select id="drawer-country" value={countryPreset.code} onChange={(e) => handleCountryChange(e.target.value)}>
                {countryPresets.map((o) => (<option key={o.code} value={o.code}>{o.label}</option>))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-currency" label="Currency" tooltip="Display currency for all numbers. Doesn't convert — use your local amounts." />
              <Select id="drawer-currency" value={activeScenario.currency} onChange={(e) => updateCurrency(e.target.value as CurrencyCode)}>
                {currencyOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </Select>
            </div>
            {countryPreset.code === "US" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel htmlFor="drawer-state" label="State" tooltip="Used for state income tax estimates. No-income-tax states (TX, FL, etc.) show 0%." />
                <Select id="drawer-state" value={activeScenario.profile.state} onChange={(e) => replaceScenario({ ...cloneScenario(activeScenario), profile: { ...activeScenario.profile, state: e.target.value } })}>
                  {stateTaxPresets.map((s) => (<option key={s.code} value={s.code}>{s.label} ({s.code})</option>))}
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel htmlFor="drawer-state" label={countryPreset.stateLabel} tooltip="State/province/region for your location." />
                <Input id="drawer-state" value={activeScenario.profile.state} onChange={(e) => replaceScenario({ ...cloneScenario(activeScenario), profile: { ...activeScenario.profile, state: e.target.value } })} />
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Social Security ── */}
      <CollapsibleSection
        title="Social Security"
        summary={
          activeScenario.socialSecurity.monthlyBenefitAtFra > 0
            ? `$${Math.round(activeScenario.socialSecurity.monthlyBenefitAtFra).toLocaleString()}/mo at FRA · claim at ${activeScenario.socialSecurity.claimingAge}`
            : "Not configured"
        }
      >
        <div className="space-y-4">
          <SSAImport
            importedAt={activeScenario.socialSecurity.ssaImportedAt}
            onImport={(result) =>
              updateScenario((s) => {
                s.socialSecurity.monthlyBenefitAt62 = result.monthlyBenefitAt62;
                s.socialSecurity.monthlyBenefitAtFra = result.monthlyBenefitAtFra;
                s.socialSecurity.monthlyBenefitAt70 = result.monthlyBenefitAt70;
                s.socialSecurity.ssaImportedAt = result.importedAt;
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Or enter estimates manually — find yours at{" "}
            <a href="https://www.ssa.gov/myaccount" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--ember)] hover:underline">ssa.gov</a>.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-ss-62" label="Monthly at 62" tooltip="Your estimated monthly benefit if you claim Social Security at age 62 (earliest eligible age, ~30% reduction from FRA)." learnHref="/education/social-security-timing" />
              <NumberInput id="drawer-ss-62" min={0} step={100} inputMode="numeric" value={activeScenario.socialSecurity.monthlyBenefitAt62} onValueChange={(v) => updateScenario((s) => { s.socialSecurity.monthlyBenefitAt62 = v; })} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-ss-fra" label="Monthly at FRA" tooltip="Your estimated benefit at full retirement age (67 for most people). This is your primary insurance amount." learnHref="/education/social-security-timing" />
              <NumberInput id="drawer-ss-fra" min={0} step={100} inputMode="numeric" value={activeScenario.socialSecurity.monthlyBenefitAtFra} onValueChange={(v) => updateScenario((s) => { s.socialSecurity.monthlyBenefitAtFra = v; })} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-ss-70" label="Monthly at 70" tooltip="Your estimated benefit if you delay claiming to age 70 (~24% bonus over FRA via delayed retirement credits)." learnHref="/education/social-security-timing" />
              <NumberInput id="drawer-ss-70" min={0} step={100} inputMode="numeric" value={activeScenario.socialSecurity.monthlyBenefitAt70} onValueChange={(v) => updateScenario((s) => { s.socialSecurity.monthlyBenefitAt70 = v; })} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-ss-claim" label="Claiming age" tooltip="When you plan to start receiving benefits. Delaying increases your monthly amount but means fewer years of payments." learnHref="/education/social-security-timing" />
              <Select id="drawer-ss-claim" value={String(activeScenario.socialSecurity.claimingAge)} onChange={(e) => updateScenario((s) => { s.socialSecurity.claimingAge = Number(e.target.value) as 62 | 67 | 70; })}>
                <option value="62">Claim at 62</option>
                <option value="67">Claim at 67 (FRA)</option>
                <option value="70">Claim at 70</option>
              </Select>
            </div>
          </div>

          {activeScenario.profile.partner ? (
            <>
              <p className="text-sm font-medium text-foreground">Partner benefits</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="drawer-ss-p62" label="Partner at 62" tooltip="Partner's estimated monthly benefit at age 62." />
                  <NumberInput id="drawer-ss-p62" min={0} step={100} inputMode="numeric" value={activeScenario.profile.partner.socialSecurityBenefit.monthlyBenefitAt62} onValueChange={(v) => updateScenario((s) => { if (s.profile.partner) s.profile.partner.socialSecurityBenefit.monthlyBenefitAt62 = v; })} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="drawer-ss-pfra" label="Partner at FRA" tooltip="Partner's estimated monthly benefit at full retirement age." />
                  <NumberInput id="drawer-ss-pfra" min={0} step={100} inputMode="numeric" value={activeScenario.profile.partner.socialSecurityBenefit.monthlyBenefitAtFra} onValueChange={(v) => updateScenario((s) => { if (s.profile.partner) s.profile.partner.socialSecurityBenefit.monthlyBenefitAtFra = v; })} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="drawer-ss-p70" label="Partner at 70" tooltip="Partner's estimated monthly benefit at age 70." />
                  <NumberInput id="drawer-ss-p70" min={0} step={100} inputMode="numeric" value={activeScenario.profile.partner.socialSecurityBenefit.monthlyBenefitAt70} onValueChange={(v) => updateScenario((s) => { if (s.profile.partner) s.profile.partner.socialSecurityBenefit.monthlyBenefitAt70 = v; })} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="drawer-ss-pclaim" label="Partner claim age" tooltip="When your partner plans to start claiming Social Security benefits." />
                  <Select id="drawer-ss-pclaim" value={String(activeScenario.profile.partner.socialSecurityBenefit.claimingAge)} onChange={(e) => updateScenario((s) => { if (s.profile.partner) s.profile.partner.socialSecurityBenefit.claimingAge = Number(e.target.value) as 62 | 67 | 70; })}>
                    <option value="62">Claim at 62</option>
                    <option value="67">Claim at 67 (FRA)</option>
                    <option value="70">Claim at 70</option>
                  </Select>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </CollapsibleSection>

      {/* ── Cash flows ── */}
      <CollapsibleSection
        title="Cash flows"
        summary={activeScenario.cashFlows.length === 0 ? "No events" : `${activeScenario.cashFlows.length} event${activeScenario.cashFlows.length === 1 ? "" : "s"}`}
      >
        <div className="space-y-3">
          {activeScenario.cashFlows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add income or expense events that change over time.</p>
          ) : null}
          {activeScenario.cashFlows.map((cf: CashFlowEvent) => (
            <div key={cf.id} className="space-y-3 rounded-lg border border-border/50 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-cf-name-${cf.id}`} label="Name" tooltip="Descriptive label (e.g., 'Rental income', 'Kids college')." />
                  <Input id={`drawer-cf-name-${cf.id}`} value={cf.name} onChange={(e) => updateScenario((s) => { const c = s.cashFlows.find((x) => x.id === cf.id); if (c) c.name = e.target.value; })} />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-cf-type-${cf.id}`} label="Type" tooltip="Income adds to your savings; expenses reduce them." />
                  <Select id={`drawer-cf-type-${cf.id}`} value={cf.type} onChange={(e) => updateScenario((s) => { const c = s.cashFlows.find((x) => x.id === cf.id); if (c) c.type = e.target.value as CashFlowEvent["type"]; })}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-cf-amt-${cf.id}`} label="Amount/yr" tooltip="Annual amount in today's dollars." />
                  <NumberInput id={`drawer-cf-amt-${cf.id}`} min={0} step={1000} inputMode="numeric" value={cf.amount} onValueChange={(v) => updateScenario((s) => { const c = s.cashFlows.find((x) => x.id === cf.id); if (c) c.amount = Math.max(v, 0); })} />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-cf-start-${cf.id}`} label="Start age" tooltip="Age when this event begins affecting your plan." />
                  <NumberInput id={`drawer-cf-start-${cf.id}`} min={activeScenario.profile.age} max={90} inputMode="numeric" value={cf.startAge} onValueChange={(v) => updateScenario((s) => { const c = s.cashFlows.find((x) => x.id === cf.id); if (c) c.startAge = Math.round(v); })} />
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => updateScenario((s) => { s.cashFlows = s.cashFlows.filter((x) => x.id !== cf.id); })}>Remove</Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => updateScenario((s) => { const cf = createDefaultCashFlowEvent("income"); cf.startAge = s.profile.age; s.cashFlows.push(cf); })}>Add income</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => updateScenario((s) => { const cf = createDefaultCashFlowEvent("expense"); cf.startAge = s.profile.age; s.cashFlows.push(cf); })}>Add expense</Button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
