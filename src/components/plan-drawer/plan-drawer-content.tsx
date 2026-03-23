"use client";

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
import { getCountryPreset, listCountryPresets } from "@/lib/data";
import { useScenarioStore } from "@/lib/store";
import { estimateScenarioTax } from "@/lib/tax";
import { cn } from "@/lib/utils";

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
const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
];

function syncScenarioRollups(nextScenario: Scenario) {
  nextScenario.annualSavings = nextScenario.accounts.reduce(
    (total, account) => total + account.annualContribution,
    0,
  );
  return nextScenario;
}

export function PlanDrawerContent() {
  const {
    activeScenario,
    replaceScenario,
    updateIncome,
    updateExpenses,
    updateAnnualSavings,
    updateCurrentBalance,
    updateProfileAge,
    updateRetirementAge,
    updateExpectedRealReturn,
    updateWithdrawalRate,
    updatePartTimeIncome,
    updateIncomeGrowthRate,
    updateExpenseGrowthRate,
    updateInflation,
    updateFeeDrag,
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
      {/* Your numbers — the core inputs */}
      <CollapsibleSection
        title="Your numbers"
        summary={`${formatCompactCurrency(activeScenario.annualIncome)} income, ${formatCompactCurrency(activeScenario.annualExpenses)} spending`}
        defaultOpen
      >
        <div className="space-y-4">
          {/* What you earn + where you live (needed for tax calc) */}
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-income" label="Gross income" tooltip="Annual pre-tax income from all sources." />
              <NumberInput
                id="drawer-income"
                min={0}
                step={1000}
                inputMode="numeric"
                value={activeScenario.annualIncome}
                onValueChange={handleIncomeChange}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-filing" label="Filing status" tooltip="Affects federal tax brackets. Married filing jointly has wider brackets and lower effective rates." />
              <Select
                id="drawer-filing"
                value={activeScenario.profile.filingStatus}
                onChange={(e) =>
                  updateScenario((s) => {
                    s.profile.filingStatus = e.target.value as Scenario["profile"]["filingStatus"];
                  })
                }
              >
                <option value="single">Single</option>
                <option value="married_joint">Married joint</option>
                <option value="married_separate">Married separate</option>
                <option value="head_of_household">Head of household</option>
              </Select>
            </div>
          </div>

          {/* What you spend */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel
                htmlFor="drawer-expenses"
                label={expenseMode === "monthly" ? "Monthly spending" : "Annual spending"}
              />
              <div className="inline-flex rounded-full border border-border/60 bg-background/70 p-0.5 text-xs">
                {(["annual", "monthly"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-full px-2 py-0.5 transition-colors",
                      expenseMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setExpenseMode(mode)}
                  >
                    {mode === "annual" ? "Yearly" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>
            <NumberInput
              id="drawer-expenses"
              min={0}
              step={expenseMode === "monthly" ? 100 : 1000}
              inputMode="numeric"
              value={expenseValue}
              onValueChange={handleExpensesChange}
            />
          </div>

          {/* Tax-aware breakdown (computed, not input) */}
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
                <span className="tabular-nums font-semibold text-foreground">
                  {formatCompactCurrency(savingsOverride ? activeScenario.annualSavings : taxCalc.actualSavings)}
                </span>
                <span className="text-muted-foreground">
                  ({formatPercent(savingsOverride ? (taxCalc.takeHome > 0 ? activeScenario.annualSavings / taxCalc.takeHome : 0) : taxCalc.afterTaxSavingsRate, 0)})
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:text-primary/80"
                  onClick={() => {
                    if (savingsOverride) {
                      setSavingsOverride(false);
                      updateAnnualSavings(Math.round(taxCalc.actualSavings));
                    } else {
                      setSavingsOverride(true);
                    }
                  }}
                >
                  {savingsOverride ? "Auto" : "Edit"}
                </button>
              </div>
            </div>
            {savingsOverride ? (
              <div className="mt-2 border-t border-border/30 pt-2">
                <NumberInput
                  id="drawer-savings"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  value={activeScenario.annualSavings}
                  onValueChange={handleSavingsOverride}
                />
              </div>
            ) : null}
          </div>

          {/* Portfolio + age + retirement */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="drawer-balance" label="Portfolio balance" tooltip="Total current investments across all accounts. This is your starting point for projections." />
              <NumberInput
                id="drawer-balance"
                min={0}
                step={1000}
                inputMode="numeric"
                value={currentBalance}
                onValueChange={updateCurrentBalance}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-age" label="Age" tooltip="Your current age. Used to calculate years to FI and milestone timing." />
                <NumberInput
                  id="drawer-age"
                  min={18}
                  max={80}
                  inputMode="numeric"
                  value={activeScenario.profile.age}
                  onValueChange={updateProfileAge}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-ret-age" label="Retire at" tooltip="Target age for financial independence. Coast FIRE calculations use this as the compounding horizon." />
                <NumberInput
                  id="drawer-ret-age"
                  min={18}
                  max={90}
                  inputMode="numeric"
                  value={activeScenario.profile.retirementAge ?? activeScenario.profile.age}
                  onValueChange={updateRetirementAge}
                />
              </div>
            </div>
          </div>

          {/* Retirement spending toggle */}
          {showRetirementExpenses ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="drawer-ret-expenses" label="Retirement spending" tooltip="If your spending will differ in retirement (e.g., no mortgage, more travel). Drives your FIRE number." />
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setShowRetirementExpenses(false);
                    updateRetirementExpenses(activeScenario.annualExpenses);
                  }}
                >
                  Same as now
                </button>
              </div>
              <NumberInput
                id="drawer-ret-expenses"
                min={0}
                step={1000}
                inputMode="numeric"
                value={activeScenario.retirementExpenses}
                onValueChange={updateRetirementExpenses}
              />
            </div>
          ) : (
            <button
              type="button"
              className="text-sm text-primary transition-colors hover:text-primary/80"
              onClick={() => setShowRetirementExpenses(true)}
            >
              Different spending in retirement?
            </button>
          )}

          {/* Post-FIRE income */}
          <div className="space-y-1.5">
            <FieldLabel
              htmlFor="drawer-postfire"
              label="Post-FIRE income"
              tooltip="Expected annual income after retirement (part-time, consulting, rental, etc.). Reduces the portfolio you need."
            />
            <NumberInput
              id="drawer-postfire"
              min={0}
              step={1000}
              inputMode="numeric"
              value={activeScenario.assumptions.partTimeIncome}
              onValueChange={updatePartTimeIncome}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Assumptions */}
      <CollapsibleSection
        title="Assumptions"
        summary={`${formatPercent(activeScenario.assumptions.expectedRealReturn, 0)} return, ${formatPercent(activeScenario.assumptions.withdrawalRate, 0)} WR`}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-return" label="Expected real return" tooltip="After-inflation investment return. Historical US stocks average ~7% real." />
              <span className="text-sm font-medium">
                {formatPercent(activeScenario.assumptions.expectedRealReturn, 1)}
              </span>
            </div>
            <Slider
              id="drawer-return"
              min={0}
              max={0.1}
              step={0.005}
              value={[activeScenario.assumptions.expectedRealReturn]}
              onValueChange={([v]) => updateExpectedRealReturn(v)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-fees" label="Investment fees" tooltip="Total expense ratio of your funds. Subtracted from real return." />
              <span className="text-sm font-medium">
                {formatPercent(activeScenario.simulationSettings.feeDrag, 2)}
              </span>
            </div>
            <Slider
              id="drawer-fees"
              min={0}
              max={0.02}
              step={0.001}
              value={[activeScenario.simulationSettings.feeDrag]}
              onValueChange={([v]) => updateFeeDrag(v)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-income-growth" label="Real income growth" tooltip="Annual raise above inflation. 1% means income grows 1% faster than prices." />
              <span className="text-sm font-medium">
                {formatPercent(activeScenario.assumptions.incomeGrowthRate ?? 0.01, 1)}
              </span>
            </div>
            <Slider
              id="drawer-income-growth"
              min={0}
              max={0.1}
              step={0.005}
              value={[activeScenario.assumptions.incomeGrowthRate ?? 0.01]}
              onValueChange={([v]) => updateIncomeGrowthRate(v)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-expense-growth" label="Lifestyle creep" tooltip="How fast spending grows above inflation. 0% keeps spending flat in today's dollars." />
              <span className="text-sm font-medium">
                {formatPercent(activeScenario.assumptions.expenseGrowthRate ?? 0, 1)}
              </span>
            </div>
            <Slider
              id="drawer-expense-growth"
              min={0}
              max={0.05}
              step={0.005}
              value={[activeScenario.assumptions.expenseGrowthRate ?? 0]}
              onValueChange={([v]) => updateExpenseGrowthRate(v)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-inflation" label="Inflation" tooltip="For context only. Projections use real (today's) dollars." />
              <span className="text-sm font-medium">
                {formatPercent(activeScenario.assumptions.inflation, 1)}
              </span>
            </div>
            <Slider
              id="drawer-inflation"
              min={0}
              max={0.08}
              step={0.005}
              value={[activeScenario.assumptions.inflation]}
              onValueChange={([v]) => updateInflation(v)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="drawer-wr" label="Withdrawal rate" tooltip="The classic 4% rule. Lower is safer for longer retirements." />
              <span className="text-sm font-medium">
                {formatPercent(activeScenario.assumptions.withdrawalRate, 2)}
              </span>
            </div>
            <Slider
              id="drawer-wr"
              min={0.025}
              max={0.06}
              step={0.001}
              value={[activeScenario.assumptions.withdrawalRate]}
              onValueChange={([v]) => updateWithdrawalRate(v)}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Partner */}
      <CollapsibleSection
        title="Partner"
        summary={activeScenario.profile.partner ? activeScenario.profile.partner.name : "Solo plan"}
      >
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPartnerPlanningEnabled(!activeScenario.profile.partner)
            }
          >
            {activeScenario.profile.partner
              ? "Remove partner"
              : "Add a partner"}
          </Button>
          {activeScenario.profile.partner ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-partner-name" label="Name" tooltip="Your partner's name for labeling accounts and projections." />
                <Input
                  id="drawer-partner-name"
                  value={activeScenario.profile.partner.name}
                  onChange={(e) => updatePartnerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-partner-income" label="Income" tooltip="Partner's gross annual income. Combined household income is used for tax calculations." />
                <NumberInput
                  id="drawer-partner-income"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  value={activeScenario.profile.partner.annualIncome ?? 0}
                  onValueChange={updatePartnerIncome}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-partner-age" label="Age" tooltip="Partner's current age. May differ from yours for joint retirement planning." />
                <NumberInput
                  id="drawer-partner-age"
                  min={18}
                  max={80}
                  inputMode="numeric"
                  value={activeScenario.profile.partner.age}
                  onValueChange={updatePartnerAge}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="drawer-partner-ret" label="Retirement age" tooltip="When your partner plans to stop working. Their income stops at this age." />
                <NumberInput
                  id="drawer-partner-ret"
                  min={18}
                  max={90}
                  inputMode="numeric"
                  value={
                    activeScenario.profile.partner.retirementAge ??
                    activeScenario.profile.partner.age
                  }
                  onValueChange={updatePartnerRetirementAge}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel htmlFor="drawer-partner-health" label="Health outlook" tooltip="Shifts life expectancy ±5 years. Used for mortality-adjusted withdrawal analysis." />
                <Select
                  id="drawer-partner-health"
                  value={activeScenario.profile.partner.healthStatus ?? "average"}
                  onChange={(e) =>
                    updatePartnerHealthStatus(
                      e.target.value as NonNullable<
                        NonNullable<Scenario["profile"]["partner"]>["healthStatus"]
                      >,
                    )
                  }
                >
                  <option value="below_average">Below average</option>
                  <option value="average">Average</option>
                  <option value="above_average">Above average</option>
                </Select>
              </div>
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      {/* Accounts */}
      <CollapsibleSection
        title="Accounts"
        summary={`${activeScenario.accounts.length} account${activeScenario.accounts.length === 1 ? "" : "s"}, ${formatCompactCurrency(currentBalance)}`}
      >
        <div className="space-y-3">
          {activeScenario.accounts.map((account, index) => (
            <div
              key={account.id}
              className="space-y-3 rounded-lg border border-border/50 p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-name-${account.id}`} label="Name" tooltip="A label for this account (e.g., 'Vanguard 401k')." />
                  <Input
                    id={`drawer-acct-name-${account.id}`}
                    value={account.name}
                    onChange={(e) =>
                      updateScenario((s) => {
                        const a = s.accounts.find((c) => c.id === account.id);
                        if (a) a.name = e.target.value;
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-type-${account.id}`} label="Type" tooltip="Account type determines tax treatment. Pre-tax (401k/IRA), tax-free (Roth), or taxable." />
                  <Select
                    id={`drawer-acct-type-${account.id}`}
                    value={account.type}
                    onChange={(e) =>
                      updateScenario((s) => {
                        const a = s.accounts.find((c) => c.id === account.id);
                        if (a) a.type = e.target.value as AccountType;
                      })
                    }
                  >
                    {accountTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-bal-${account.id}`} label="Balance" tooltip="Current balance in this account." />
                  <NumberInput
                    id={`drawer-acct-bal-${account.id}`}
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={account.currentBalance}
                    onValueChange={(v) =>
                      updateScenario((s) => {
                        const a = s.accounts.find((c) => c.id === account.id);
                        if (a) a.currentBalance = Math.max(v, 0);
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-contrib-${account.id}`} label="Contribution/yr" tooltip="How much you add to this account each year." />
                  <NumberInput
                    id={`drawer-acct-contrib-${account.id}`}
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={account.annualContribution}
                    onValueChange={(v) =>
                      updateScenario((s) => {
                        const a = s.accounts.find((c) => c.id === account.id);
                        if (a) a.annualContribution = Math.max(v, 0);
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-match-${account.id}`} label="Match %" tooltip="Employer match as a decimal (e.g., 0.5 = 50% match on your contribution)." />
                  <NumberInput
                    id={`drawer-acct-match-${account.id}`}
                    min={0}
                    max={1}
                    step={0.01}
                    inputMode="decimal"
                    value={account.employerMatch?.percentage ?? 0}
                    onValueChange={(v) =>
                      updateScenario((s) => {
                        const a = s.accounts.find((c) => c.id === account.id);
                        if (a) {
                          a.employerMatch = {
                            percentage: Math.max(v, 0),
                            upTo: a.employerMatch?.upTo ?? 0,
                          };
                        }
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-acct-owner-${account.id}`} label="Owner" tooltip="Who owns this account. Joint accounts are shared between partners." />
                  <Select
                    id={`drawer-acct-owner-${account.id}`}
                    value={account.owner ?? "primary"}
                    onChange={(e) =>
                      updateScenario((s) => {
                        const a = s.accounts.find((c) => c.id === account.id);
                        if (a) a.owner = e.target.value as AccountOwner;
                      })
                    }
                  >
                    {accountOwnerOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              {activeScenario.accounts.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateScenario((s) => {
                      s.accounts = s.accounts.filter((c) => c.id !== account.id);
                    })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateScenario((s) => {
                s.accounts.push(
                  createDefaultAccount(
                    "traditional_401k",
                    "New account",
                    s.profile.partner ? "joint" : "primary",
                  ),
                );
              })
            }
          >
            Add account
          </Button>
        </div>
      </CollapsibleSection>

      {/* Cash Flows */}
      <CollapsibleSection
        title="Cash flows"
        summary={
          activeScenario.cashFlows.length === 0
            ? "No events"
            : `${activeScenario.cashFlows.length} event${activeScenario.cashFlows.length === 1 ? "" : "s"}`
        }
      >
        <div className="space-y-3">
          {activeScenario.cashFlows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add income or expense events that change over time.
            </p>
          ) : null}
          {activeScenario.cashFlows.map((cf: CashFlowEvent) => (
            <div
              key={cf.id}
              className="space-y-3 rounded-lg border border-border/50 p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-cf-name-${cf.id}`} label="Name" tooltip="Descriptive label (e.g., 'Rental income', 'Kids college')." />
                  <Input
                    id={`drawer-cf-name-${cf.id}`}
                    value={cf.name}
                    onChange={(e) =>
                      updateScenario((s) => {
                        const c = s.cashFlows.find((x) => x.id === cf.id);
                        if (c) c.name = e.target.value;
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-cf-type-${cf.id}`} label="Type" tooltip="Income adds to your savings; expenses reduce them." />
                  <Select
                    id={`drawer-cf-type-${cf.id}`}
                    value={cf.type}
                    onChange={(e) =>
                      updateScenario((s) => {
                        const c = s.cashFlows.find((x) => x.id === cf.id);
                        if (c) c.type = e.target.value as CashFlowEvent["type"];
                      })
                    }
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-cf-amt-${cf.id}`} label="Amount/yr" tooltip="Annual amount in today's dollars." />
                  <NumberInput
                    id={`drawer-cf-amt-${cf.id}`}
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={cf.amount}
                    onValueChange={(v) =>
                      updateScenario((s) => {
                        const c = s.cashFlows.find((x) => x.id === cf.id);
                        if (c) c.amount = Math.max(v, 0);
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor={`drawer-cf-start-${cf.id}`} label="Start age" tooltip="Age when this event begins affecting your plan." />
                  <NumberInput
                    id={`drawer-cf-start-${cf.id}`}
                    min={activeScenario.profile.age}
                    max={90}
                    inputMode="numeric"
                    value={cf.startAge}
                    onValueChange={(v) =>
                      updateScenario((s) => {
                        const c = s.cashFlows.find((x) => x.id === cf.id);
                        if (c) c.startAge = Math.round(v);
                      })
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateScenario((s) => {
                    s.cashFlows = s.cashFlows.filter((x) => x.id !== cf.id);
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateScenario((s) => {
                  const cf = createDefaultCashFlowEvent("income");
                  cf.startAge = s.profile.age;
                  s.cashFlows.push(cf);
                })
              }
            >
              Add income
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateScenario((s) => {
                  const cf = createDefaultCashFlowEvent("expense");
                  cf.startAge = s.profile.age;
                  s.cashFlows.push(cf);
                })
              }
            >
              Add expense
            </Button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Location */}
      <CollapsibleSection
        title="Location"
        summary={`${countryPreset.code}, ${activeScenario.profile.state}, ${activeScenario.currency}`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="drawer-country" label="Country" tooltip="Sets tax rules and currency defaults. US has the most detailed tax modeling." />
            <Select
              id="drawer-country"
              value={countryPreset.code}
              onChange={(e) => handleCountryChange(e.target.value)}
            >
              {countryPresets.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="drawer-currency" label="Currency" tooltip="Display currency for all numbers. Doesn't convert — use your local amounts." />
            <Select
              id="drawer-currency"
              value={activeScenario.currency}
              onChange={(e) => updateCurrency(e.target.value as CurrencyCode)}
            >
              {currencyOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <FieldLabel htmlFor="drawer-state" label={countryPreset.stateLabel} tooltip="State/province for state income tax estimates." />
            <Input
              id="drawer-state"
              value={activeScenario.profile.state}
              onChange={(e) =>
                replaceScenario({
                  ...cloneScenario(activeScenario),
                  profile: {
                    ...activeScenario.profile,
                    state: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
