"use client";

import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHero } from "@/components/brand";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { FieldLabel } from "@/components/form/field-label";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  calculateFireTypeSummaries,
  formatCompactCurrency,
  formatPercent,
  formatYears,
} from "@/lib/calc";
import {
  getContributionLimits,
  DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
  buildScenarioFromQuizAnswers,
  getFireTypeRecommendation,
  type FireStage,
  type FireTypeQuizAnswers,
  type PlanningPriority,
} from "@/lib/quiz/fire-type-quiz";
import { listStateTaxPresets } from "@/lib/data";
import type { EmploymentType } from "@/lib/domain/types";
import { useScenarioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const stateTaxPresets = listStateTaxPresets();
const noIncomeTaxCodes = new Set(["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"]);
const noTaxStates = stateTaxPresets.filter((s) => noIncomeTaxCodes.has(s.code));
const taxStates = stateTaxPresets.filter((s) => !noIncomeTaxCodes.has(s.code)).sort((a, b) => a.label.localeCompare(b.label));

/**
 * Budget math for the contributionSplit step. Shared between the step
 * render (for display) and the parent's over-budget modal guard so
 * the two can't disagree about whether the user is over budget.
 *
 * Which buckets reduce taxable income?
 *   - Trad 401(k): YES (pre-tax payroll deduction)
 *   - HSA: YES (pre-tax payroll deduction, plus FICA savings we don't
 *     model here)
 *   - Roth IRA / backdoor: NO (post-tax contribution)
 *   - Mega backdoor Roth: NO (after-tax 401(k) contribution + in-plan
 *     conversion; not a pre-tax deduction)
 *   - Partner mega backdoor: NO (same)
 * Matching that to the scenario, `preTaxDeductions = trad + hsa`.
 *
 * The "rough tax" heuristic here is deliberately coarse — the real tax
 * engine runs after the quiz commits to a scenario. We just need
 * enough signal for sensible defaults, the budget breakdown display,
 * and the over-budget guard.
 */
function computeContributionBudget(answers: FireTypeQuizAnswers) {
  const grossIncome = answers.annualIncome;
  const preTaxDeductions =
    answers.traditionalContribution + answers.hsaContribution;
  const roughTaxableIncome = Math.max(grossIncome - preTaxDeductions, 0);
  const roughFederalRate = roughTaxableIncome > 243_725 ? 0.32
    : roughTaxableIncome > 191_950 ? 0.24
    : roughTaxableIncome > 100_525 ? 0.22
    : roughTaxableIncome > 47_150 ? 0.12
    : 0.10;
  const roughTax = roughTaxableIncome * (roughFederalRate * 0.85 + 0.05);
  const estimatedTakeHome = Math.max(grossIncome - roughTax, 0);
  const totalSavings = Math.max(estimatedTakeHome - answers.annualSpending, 0);

  const activeMega = answers.megaBackdoorRothAvailable
    ? answers.megaBackdoorRothContribution
    : 0;
  const activePartnerMega = answers.partnerMegaBackdoorRothAvailable
    ? answers.partnerMegaBackdoorRothContribution
    : 0;
  const preTaxableAllocated =
    answers.traditionalContribution +
    answers.rothContribution +
    answers.hsaContribution +
    activeMega +
    activePartnerMega;
  const derivedTaxable = Math.max(totalSavings - preTaxableAllocated, 0);
  const overBudgetBy = Math.max(preTaxableAllocated - totalSavings, 0);

  return {
    grossIncome,
    estimatedTax: roughTax,
    estimatedTakeHome,
    annualSpending: answers.annualSpending,
    totalSavings,
    preTaxableAllocated,
    derivedTaxable,
    overBudgetBy,
    isOverBudget: overBudgetBy > 0,
  };
}

/** Virtual step keys that don't map 1:1 to a single answer field */
type VirtualStepKey = "accountSplit" | "contributionSplit";

interface QuizStep {
  key: keyof FireTypeQuizAnswers | VirtualStepKey;
  title: string;
  description: string;
}

const stageStep: QuizStep = {
  key: "stage",
  title: "Where are you on the FIRE journey?",
  description: "This helps us tailor the quiz and send you to the right tools.",
};

const allQuestionSteps: QuizStep[] = [
  { key: "currentAge", title: "How old are you today?", description: "This sets the starting point for the rest of the timeline and Coast FIRE math." },
  { key: "targetFiAge", title: "When would full financial independence feel ideal?", description: "Think about the age where optional work becomes more valuable than mandatory work." },
  { key: "annualIncome", title: "What is your annual gross income?", description: "Pre-tax household income from all sources. This determines your savings rate and timeline." },
  { key: "employmentType", title: "What best describes your work situation?", description: "This determines how FICA taxes are calculated — self-employed workers pay both halves." },
  { key: "filingStatus", title: "How do you file taxes?", description: "This affects your tax brackets, contribution limits, and take-home pay estimate." },
  { key: "state", title: "Which state do you live in?", description: "State income taxes can significantly affect your take-home pay and FIRE timeline." },
  { key: "annualSpending", title: "What annual spending level feels comfortable?", description: "Use a real-world number, not the absolute minimum you could survive on for a year." },
  { key: "currentPortfolio", title: "How much is already invested toward FIRE?", description: "A current portfolio helps calculate Coast FIRE and your overall progress." },
  { key: "accountSplit", title: "Where is your money?", description: "Account types matter for tax-efficient withdrawals in retirement. Skip if you're not sure." },
  { key: "contributionSplit", title: "Where do your savings go?", description: "How you allocate contributions affects your tax bill now and in retirement." },
  { key: "partTimePreference", title: "Would you be open to earning income after FIRE?", description: "This changes whether Barista FIRE is in the mix — and sets your post-FIRE income assumption." },
  { key: "flexibility", title: "How much spending flexibility would you have in a downturn?", description: "A plan is only useful if it feels behaviorally realistic during rough markets." },
  { key: "dependents", title: "Are you planning with dependents in the picture?", description: "Household responsibility can shift the tradeoff toward more margin." },
  { key: "riskTolerance", title: "How much risk of running short feels acceptable?", description: "Cautious answers push toward more margin. Aggressive answers favor speed." },
  { key: "priority", title: "What matters most in your plan right now?", description: "This helps separate speed-first FIRE plans from lifestyle-first paths." },
];

const stageQuestionKeys: Record<FireStage, Array<keyof FireTypeQuizAnswers | "accountSplit" | "contributionSplit">> = {
  curious: ["currentAge", "targetFiAge", "annualIncome", "employmentType", "filingStatus", "state", "annualSpending", "currentPortfolio", "partTimePreference", "flexibility", "dependents", "riskTolerance", "priority"],
  saving: ["currentAge", "targetFiAge", "annualIncome", "employmentType", "filingStatus", "state", "annualSpending", "currentPortfolio", "accountSplit", "contributionSplit", "partTimePreference", "flexibility", "dependents", "riskTolerance", "priority"],
  pre_retirement: ["currentAge", "targetFiAge", "annualIncome", "employmentType", "filingStatus", "state", "annualSpending", "currentPortfolio", "accountSplit", "partTimePreference", "flexibility", "riskTolerance"],
  retired: ["currentAge", "annualSpending", "currentPortfolio", "accountSplit", "flexibility"],
};

function getStepsForStage(stage: FireStage): QuizStep[] {
  const keys = stageQuestionKeys[stage];
  return [stageStep, ...allQuestionSteps.filter((s) => keys.includes(s.key))];
}

const priorityLabels: Record<PlanningPriority, string> = {
  freedom_fast: "Reach freedom as fast as possible",
  balanced_life: "Balance life now with life later",
  premium_lifestyle: "Preserve a high-end lifestyle",
};

const riskLabels = [
  "Very cautious",
  "Cautious",
  "Balanced",
  "Growth-oriented",
  "Aggressive",
] as const;

function ChoiceGrid<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; description: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all duration-200",
              selected
                ? "border-[rgba(255,107,53,0.26)] bg-[rgba(255,107,53,0.12)] shadow-[var(--shadow-glow)]"
                : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
              </div>
              <div
                className={cn(
                  "mt-1 size-3 rounded-full border border-border/70",
                  selected && "border-transparent bg-[var(--ember)] shadow-[var(--shadow-glow)]",
                )}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function FireTypeQuiz() {
  const router = useRouter();
  const {
    activeScenario,
    status,
    replaceScenario,
    saveDraft,
  } = useScenarioStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(DEFAULT_FIRE_TYPE_QUIZ_ANSWERS);
  const [quizComplete, setQuizComplete] = useState(false);
  // Surfaced when the user tries to advance from contributionSplit
  // while allocations exceed their after-tax budget. Offers two paths:
  // trim a bucket (dismiss) or revisit the spending step.
  const [showOverBudgetPrompt, setShowOverBudgetPrompt] = useState(false);
  const hasSyncedFromStore = useRef(false);

  useInitializeStore();

  // Sync from scenario store once it's ready
  useEffect(() => {
    if (hasSyncedFromStore.current || status !== "ready") return;
    hasSyncedFromStore.current = true;
    const hasCustomData =
      activeScenario.annualExpenses !== 54_000 ||
      activeScenario.profile.age !== 34;
    if (hasCustomData) {
      setAnswers((prev) => ({
        ...prev,
        currentAge: activeScenario.profile.age,
        targetFiAge: activeScenario.profile.retirementAge ?? activeScenario.profile.age + 12,
        annualIncome: activeScenario.annualIncome,
        annualSpending: activeScenario.annualExpenses,
        currentPortfolio: activeScenario.accounts.reduce(
          (sum, a) => sum + a.currentBalance,
          0,
        ),
        postFireIncome: activeScenario.assumptions.partTimeIncome,
      }));
    }
  }, [activeScenario, status]);

  const steps = useMemo(() => getStepsForStage(answers.stage), [answers.stage]);
  const currentStep = steps[stepIndex];
  const scenario = useMemo(() => buildScenarioFromQuizAnswers(answers), [answers]);
  useGlobalScenarioFormatting(scenario);
  const recommendation = useMemo(
    () => getFireTypeRecommendation(answers),
    [answers],
  );
  const fireTypes = useMemo(
    () => calculateFireTypeSummaries(scenario),
    [scenario],
  );
  const isLastStep = stepIndex === steps.length - 1;
  const completion = (stepIndex + 1) / steps.length;

  function setAnswer<K extends keyof FireTypeQuizAnswers>(
    key: K,
    value: FireTypeQuizAnswers[K],
  ) {
    setAnswers((current) => {
      const nextAnswers = {
        ...current,
        [key]: value,
      };

      if (key === "currentAge" && nextAnswers.targetFiAge < nextAnswers.currentAge) {
        nextAnswers.targetFiAge = nextAnswers.currentAge;
      }

      return nextAnswers;
    });
  }

  // After quiz completion, all stages route to home which shows results
  // The stage-specific CTA on the home page determines the next destination
  const stageNextStep: Record<FireStage, { href: Route; label: string }> = {
    curious: { href: "/education" as Route, label: "Start learning about FIRE" },
    saving: { href: "/accumulation" as Route, label: "Open Your Plan" },
    pre_retirement: { href: "/withdrawal" as Route, label: "Stress-test your retirement" },
    retired: { href: "/withdrawal" as Route, label: "Check your plan" },
  };

  async function persistQuizToStore() {
    const built = buildScenarioFromQuizAnswers(answers);
    replaceScenario(built);
    await saveDraft();
  }

  async function handleQuizComplete() {
    // Persist again in case the user edited answers between "See my result" and this CTA.
    // replaceScenario is idempotent for identical inputs.
    await persistQuizToStore();
    router.push("/" as Route);
  }

  function renderStep() {
    switch (currentStep.key) {
      case "stage":
        return (
          <ChoiceGrid
            value={answers.stage}
            onChange={(value) => {
              setAnswer("stage", value);
              // Reset step to 1 when stage changes (stay on stage question)
            }}
            options={[
              {
                value: "curious" as FireStage,
                label: "I'm just exploring FIRE",
                description: "I want to learn what financial independence means and see if it applies to me.",
              },
              {
                value: "saving" as FireStage,
                label: "I'm actively saving toward FI",
                description: "I'm on the path and want to optimize my plan, track progress, and find the right FIRE type.",
              },
              {
                value: "pre_retirement" as FireStage,
                label: "I'm close to or ready for FI",
                description: "I need to stress-test whether my portfolio can sustain me and plan the transition.",
              },
              {
                value: "retired" as FireStage,
                label: "I'm already retired",
                description: "I'm living off my portfolio and want to make sure I'm still on track.",
              },
            ]}
          />
        );
      case "currentAge":
        return (
          <div className="space-y-3">
            <FieldLabel htmlFor="quiz-current-age" label="Current age" />
            <NumberInput
              id="quiz-current-age"
              min={18}
              max={80}
              inputMode="numeric"
              value={answers.currentAge}
              onValueChange={(value) => setAnswer("currentAge", Math.round(value))}
            />
          </div>
        );
      case "targetFiAge":
        return (
          <div className="space-y-3">
            <FieldLabel htmlFor="quiz-target-age" label="Target FI age" />
            <NumberInput
              id="quiz-target-age"
              min={answers.currentAge}
              max={90}
              inputMode="numeric"
              value={answers.targetFiAge}
              onValueChange={(value) => setAnswer("targetFiAge", Math.round(value))}
            />
            <p className="text-sm text-muted-foreground">
              That gives you{" "}
              {formatYears(Math.max(answers.targetFiAge - answers.currentAge, 0))} to
              get there.
            </p>
          </div>
        );
      case "annualIncome":
        return (
          <div className="space-y-3">
            <FieldLabel htmlFor="quiz-income" label="Annual gross income (pre-tax)" />
            <NumberInput
              id="quiz-income"
              min={0}
              step={5_000}
              inputMode="numeric"
              value={answers.annualIncome}
              onValueChange={(value) => setAnswer("annualIncome", value)}
            />
          </div>
        );
      case "employmentType":
        return (
          <ChoiceGrid<EmploymentType>
            value={answers.employmentType}
            onChange={(value) => setAnswer("employmentType", value)}
            options={[
              {
                value: "w2",
                label: "I\u2019m a W-2 employee",
                description: "Your employer handles payroll taxes.",
              },
              {
                value: "self_employed",
                label: "I\u2019m self-employed",
                description: "You run a business or freelance full-time.",
              },
              {
                value: "1099",
                label: "I work as a 1099 contractor",
                description: "Companies pay you without withholding taxes.",
              },
            ]}
          />
        );
      case "filingStatus":
        return (
          <div className="space-y-4">
            <ChoiceGrid
              value={answers.filingStatus}
              onChange={(value) => {
                setAnswer("filingStatus", value);
                // Reset partner 401k when switching to single
                if (value === "single" || value === "head_of_household") {
                  setAnswer("partnerHas401k", false);
                }
              }}
              options={[
                { value: "single", label: "Single", description: "Filing individually." },
                { value: "married_joint", label: "Married filing jointly", description: "Combined household income. Wider tax brackets and doubled contribution limits." },
                { value: "head_of_household", label: "Head of household", description: "Unmarried with dependents. Wider brackets than single." },
                { value: "married_separate", label: "Married filing separately", description: "Filing separately. Narrower brackets, limited deductions." },
              ]}
            />
            {(answers.filingStatus === "married_joint" || answers.filingStatus === "married_separate") && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={answers.partnerHas401k}
                    onChange={(e) => setAnswer("partnerHas401k", e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-[var(--ember)]"
                  />
                  My partner also has access to a 401(k)
                </label>
                <p className="text-[10px] text-muted-foreground">
                  This doubles the household 401(k) contribution limit to ~$47K/yr.
                </p>
              </div>
            )}
          </div>
        );
      case "state":
        return (
          <div className="space-y-3">
            <FieldLabel htmlFor="quiz-state" label="State of residence" />
            <Select
              id="quiz-state"
              value={answers.state}
              onChange={(e) => setAnswer("state", e.target.value)}
            >
              <optgroup label="No state income tax">
                {noTaxStates.map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="All states (alphabetical)">
                {taxStates.map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </optgroup>
            </Select>
          </div>
        );
      case "annualSpending":
        return (
          <div className="space-y-3">
            <FieldLabel htmlFor="quiz-spending" label="Annual spending target" />
            <NumberInput
              id="quiz-spending"
              min={12_000}
              step={1_000}
              inputMode="numeric"
              value={answers.annualSpending}
              onValueChange={(value) => setAnswer("annualSpending", value)}
            />
          </div>
        );
      case "currentPortfolio":
        return (
          <div className="space-y-3">
            <FieldLabel htmlFor="quiz-portfolio" label="Current investable portfolio" />
            <NumberInput
              id="quiz-portfolio"
              min={0}
              step={1_000}
              inputMode="numeric"
              value={answers.currentPortfolio}
              onValueChange={(value) => {
                setAnswer("currentPortfolio", value);
                // Default: all portfolio goes to taxable until user splits in the next step
                setAnswer("taxableBalance", value);
                setAnswer("traditionalBalance", 0);
                setAnswer("rothBalance", 0);
              }}
            />
          </div>
        );
      case "accountSplit": {
        // Helper: taxable is always the remainder
        const setBalances = (trad: number, roth: number, hsa: number) => {
          const total = answers.currentPortfolio;
          const t = Math.min(trad, total);
          const r = Math.min(roth, total - t);
          const h = Math.min(hsa, total - t - r);
          const taxable = Math.max(total - t - r - h, 0);
          setAnswer("traditionalBalance", t);
          setAnswer("rothBalance", r);
          setAnswer("hsaBalance", h);
          setAnswer("taxableBalance", taxable);
        };
        const balTotal = answers.traditionalBalance + answers.rothBalance + answers.hsaBalance + answers.taxableBalance;
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your {formatCompactCurrency(answers.currentPortfolio)} is split across:
            </p>
            <div className="space-y-3">
              <div>
                <FieldLabel htmlFor="quiz-trad-bal" label="Tax-deferred (401k, Traditional IRA)" />
                <NumberInput
                  id="quiz-trad-bal"
                  min={0}
                  max={answers.currentPortfolio}
                  step={1_000}
                  value={answers.traditionalBalance}
                  onValueChange={(v) => setBalances(v, answers.rothBalance, answers.hsaBalance)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="quiz-roth-bal" label="Roth (Roth 401k, Roth IRA)" />
                <NumberInput
                  id="quiz-roth-bal"
                  min={0}
                  max={answers.currentPortfolio - answers.traditionalBalance}
                  step={1_000}
                  value={answers.rothBalance}
                  onValueChange={(v) => setBalances(answers.traditionalBalance, v, answers.hsaBalance)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="quiz-hsa-bal" label="HSA (Health Savings Account)" />
                <NumberInput
                  id="quiz-hsa-bal"
                  min={0}
                  max={answers.currentPortfolio - answers.traditionalBalance - answers.rothBalance}
                  step={1_000}
                  value={answers.hsaBalance}
                  onValueChange={(v) => setBalances(answers.traditionalBalance, answers.rothBalance, v)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="quiz-taxable-bal" label="Taxable (brokerage) — remainder" />
                <NumberInput
                  id="quiz-taxable-bal"
                  min={0}
                  max={answers.currentPortfolio}
                  step={1_000}
                  value={answers.taxableBalance}
                  onValueChange={(v) => {
                    setAnswer("taxableBalance", Math.min(v, answers.currentPortfolio));
                  }}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className={cn(
                  "font-mono font-bold tabular-nums",
                  Math.abs(balTotal - answers.currentPortfolio) < 100 ? "text-emerald-600" : "text-red-500",
                )}>
                  {formatCompactCurrency(balTotal)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAnswer("traditionalBalance", 0);
                setAnswer("rothBalance", 0);
                setAnswer("hsaBalance", 0);
                setAnswer("taxableBalance", answers.currentPortfolio);
              }}
              className="text-xs text-[var(--ember)] hover:underline"
            >
              I&apos;m not sure — put it all in taxable
            </button>
          </div>
        );
      }
      case "contributionSplit": {
        const limits = getContributionLimits(answers.currentAge, {
          filingStatus: answers.filingStatus,
          partnerHas401k: answers.partnerHas401k,
        });
        // Budget math lives in a module-level helper so the over-budget
        // modal guard can use the same numbers.
        const budget = computeContributionBudget(answers);
        const {
          grossIncome,
          estimatedTax,
          estimatedTakeHome,
          annualSpending,
          totalSavings,
          preTaxableAllocated,
          derivedTaxable,
          overBudgetBy,
          isOverBudget,
        } = budget;
        const totalAllocated = preTaxableAllocated + derivedTaxable;

        const defaultTrad = Math.min(limits.traditional401k, totalSavings);
        const defaultRoth = Math.min(limits.rothIra, Math.max(totalSavings - defaultTrad, 0));
        const defaultHsa = Math.min(limits.hsa, Math.max(totalSavings - defaultTrad - defaultRoth, 0));
        const defaultTaxable = Math.max(totalSavings - defaultTrad - defaultRoth - defaultHsa, 0);
        const catchUpNote = answers.currentAge >= 50
          ? ` (includes ${answers.currentAge >= 60 && answers.currentAge <= 63 ? "super " : ""}catch-up)`
          : "";

        // First-render seed: if every bucket is still zero, fill in
        // smart defaults so the user sees a sensible starting point.
        // AND keep `taxableContribution` in state in sync with the
        // derived value so downstream scenario-building sees the
        // right number even though the field isn't user-editable.
        if (
          answers.traditionalContribution === 0 &&
          answers.rothContribution === 0 &&
          answers.hsaContribution === 0 &&
          answers.taxableContribution === 0 &&
          totalSavings > 0
        ) {
          setAnswer("traditionalContribution", defaultTrad);
          setAnswer("rothContribution", defaultRoth);
          setAnswer("hsaContribution", defaultHsa);
          setAnswer("taxableContribution", defaultTaxable);
        } else if (answers.taxableContribution !== derivedTaxable) {
          setAnswer("taxableContribution", derivedTaxable);
        }

        return (
          <div className="space-y-4">
            {/* Budget breakdown — make it visible how the ~$X/yr
                after-tax savings number was computed. Because trad
                401(k) and HSA are pre-tax, raising them shrinks the
                estimated tax and grows this number. That feedback
                loop is real US tax law, but it's surprising, so we
                show the chain. */}
            <details className="group rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="font-medium text-foreground">
                  Your budget: ~{formatCompactCurrency(totalSavings)}/yr to save
                </span>
                <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground group-open:hidden">
                  How we got this
                </span>
                <span className="hidden text-[10px] uppercase tracking-[0.08em] text-muted-foreground group-open:inline">
                  Hide
                </span>
              </summary>
              <div className="mt-3 space-y-1 font-mono tabular-nums text-muted-foreground">
                <div className="flex justify-between">
                  <span>Gross income</span>
                  <span>{formatCompactCurrency(grossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span>− Estimated tax</span>
                  <span>−{formatCompactCurrency(estimatedTax)}</span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-1 text-foreground">
                  <span>= Take-home</span>
                  <span>{formatCompactCurrency(estimatedTakeHome)}</span>
                </div>
                <div className="flex justify-between">
                  <span>− Annual spending</span>
                  <span>−{formatCompactCurrency(annualSpending)}</span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-1 font-semibold text-foreground">
                  <span>= Available to save</span>
                  <span>{formatCompactCurrency(totalSavings)}</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Trad 401(k) and HSA are pre-tax — raising them lowers
                the tax estimate above and grows this budget. Roth and
                mega backdoor are post-tax, so they don&rsquo;t.
              </p>
            </details>
            <div className="space-y-3">
              <div>
                <FieldLabel htmlFor="quiz-trad-cont" label={`Tax-deferred 401(k)${limits.partnerHas401k ? " (household)" : ""} — limit $${(limits.traditional401k / 1000).toFixed(1)}K/yr${catchUpNote}`} />
                <NumberInput
                  id="quiz-trad-cont"
                  min={0}
                  max={limits.traditional401k}
                  step={500}
                  value={answers.traditionalContribution}
                  onValueChange={(v) => {
                    setAnswer(
                      "traditionalContribution",
                      Math.min(Math.max(v, 0), limits.traditional401k),
                    );
                  }}
                />
              </div>
              <div>
                <FieldLabel htmlFor="quiz-roth-cont" label={`Roth (IRA + backdoor) — limit $${(limits.rothIra / 1000).toFixed(0)}K/yr direct${answers.currentAge >= 50 ? " (includes catch-up)" : ""}`} />
                <NumberInput
                  id="quiz-roth-cont"
                  min={0}
                  max={limits.rothIra}
                  step={500}
                  value={answers.rothContribution}
                  onValueChange={(v) => {
                    setAnswer(
                      "rothContribution",
                      Math.min(Math.max(v, 0), limits.rothIra),
                    );
                  }}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Includes backdoor Roth. Mega backdoor Roth (if your plan
                  offers it) is a separate question below.
                </p>
              </div>
              {/* Mega Backdoor Roth — ask explicitly. Most plans don't
                  offer it; those that do let the user funnel another
                  ~$46K/yr ($92K for a two-earner couple) into Roth via
                  after-tax contributions + in-plan conversion. Reshuffles
                  the same totalSavings ceiling — no new money — so the
                  taxable remainder shrinks when the user puts dollars here. */}
              {(() => {
                const isMarriedCouple =
                  answers.filingStatus === "married_joint" ||
                  answers.filingStatus === "married_separate";
                const showPartnerMega =
                  isMarriedCouple && answers.partnerHas401k;
                const perPersonCap = limits.megaBackdoorRoth /
                  (limits.partnerHas401k ? 2 : 1);
                return (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={answers.megaBackdoorRothAvailable}
                        onChange={(e) => {
                          setAnswer(
                            "megaBackdoorRothAvailable",
                            e.target.checked,
                          );
                        }}
                        className="mt-0.5 size-4 rounded border-border/60 text-[var(--ember)] focus:ring-1 focus:ring-[var(--ember)]"
                      />
                      <span className="text-xs">
                        <span className="font-medium text-foreground">
                          My 401(k) offers mega backdoor Roth
                        </span>
                        <span className="ml-1 text-muted-foreground">
                          (after-tax contributions + in-plan conversion)
                        </span>
                      </span>
                    </label>
                    {answers.megaBackdoorRothAvailable ? (
                      <div className="mt-3 space-y-3">
                        <div>
                          <FieldLabel
                            htmlFor="quiz-mega-cont"
                            label={`Your mega backdoor contribution — up to $${(perPersonCap / 1000).toFixed(0)}K/yr`}
                          />
                          <NumberInput
                            id="quiz-mega-cont"
                            min={0}
                            max={perPersonCap}
                            step={500}
                            value={answers.megaBackdoorRothContribution}
                            onValueChange={(v) => {
                              setAnswer(
                                "megaBackdoorRothContribution",
                                Math.min(Math.max(v, 0), perPersonCap),
                              );
                            }}
                          />
                        </div>
                        {showPartnerMega ? (
                          <div>
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                checked={answers.partnerMegaBackdoorRothAvailable}
                                onChange={(e) => {
                                  setAnswer(
                                    "partnerMegaBackdoorRothAvailable",
                                    e.target.checked,
                                  );
                                }}
                                className="mt-0.5 size-4 rounded border-border/60 text-[var(--ember)] focus:ring-1 focus:ring-[var(--ember)]"
                              />
                              <span className="text-xs font-medium text-foreground">
                                Partner&rsquo;s 401(k) offers it too
                              </span>
                            </label>
                            {answers.partnerMegaBackdoorRothAvailable ? (
                              <div className="mt-2">
                                <FieldLabel
                                  htmlFor="quiz-partner-mega-cont"
                                  label={`Partner mega backdoor contribution — up to $${(perPersonCap / 1000).toFixed(0)}K/yr`}
                                />
                                <NumberInput
                                  id="quiz-partner-mega-cont"
                                  min={0}
                                  max={perPersonCap}
                                  step={500}
                                  value={
                                    answers.partnerMegaBackdoorRothContribution
                                  }
                                  onValueChange={(v) => {
                                    setAnswer(
                                      "partnerMegaBackdoorRothContribution",
                                      Math.min(Math.max(v, 0), perPersonCap),
                                    );
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="text-[10px] text-muted-foreground">
                          Lands in your Roth (401k) bucket — tax-free growth
                          and tax-free withdrawal. Moves dollars from taxable
                          into Roth; total savings unchanged.
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
              <div>
                <FieldLabel htmlFor="quiz-hsa-cont" label={`HSA — limit $${(limits.hsa / 1000).toFixed(1)}K/yr${answers.currentAge >= 55 ? " (includes catch-up)" : ""}`} />
                <NumberInput
                  id="quiz-hsa-cont"
                  min={0}
                  max={limits.hsa}
                  step={100}
                  value={answers.hsaContribution}
                  onValueChange={(v) => {
                    setAnswer(
                      "hsaContribution",
                      Math.min(Math.max(v, 0), limits.hsa),
                    );
                  }}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Triple tax advantage: pre-tax in, tax-free growth, tax-free withdrawal for medical expenses.
                </p>
              </div>
              {/* Taxable brokerage is a READ-ONLY remainder — derived
                  every render from totalSavings minus the allocated
                  buckets above. This is why the inputs above don't
                  need cross-field clamping: the remainder flexes. */}
              <div>
                <FieldLabel
                  htmlFor="quiz-taxable-cont"
                  label="Taxable brokerage (remainder)"
                />
                <div
                  id="quiz-taxable-cont"
                  aria-live="polite"
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 font-mono text-sm tabular-nums",
                    isOverBudget ? "text-muted-foreground opacity-60" : "text-foreground",
                  )}
                >
                  <span>{formatCompactCurrency(derivedTaxable)}/yr</span>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    auto
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  What&rsquo;s left after the buckets above. Adjusts
                  automatically as you change the others.
                </p>
              </div>
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                  isOverBudget
                    ? "bg-red-500/10 text-red-500"
                    : "bg-muted/50 text-muted-foreground",
                )}
              >
                <span>
                  {isOverBudget
                    ? `Over budget by ${formatCompactCurrency(overBudgetBy)} — trim a bucket above`
                    : derivedTaxable > 0
                      ? "Remainder going to taxable brokerage"
                      : "Fully allocated"}
                </span>
                <span className="font-mono font-bold tabular-nums">
                  {formatCompactCurrency(
                    isOverBudget ? preTaxableAllocated : totalAllocated,
                  )}
                  /yr
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAnswer("traditionalContribution", defaultTrad);
                setAnswer("rothContribution", defaultRoth);
                setAnswer("hsaContribution", defaultHsa);
                setAnswer("taxableContribution", defaultTaxable);
                setAnswer("megaBackdoorRothAvailable", false);
                setAnswer("megaBackdoorRothContribution", 0);
                setAnswer("partnerMegaBackdoorRothAvailable", false);
                setAnswer("partnerMegaBackdoorRothContribution", 0);
              }}
              className="text-xs text-[var(--ember)] hover:underline"
            >
              I&apos;m not sure — use smart defaults
            </button>
          </div>
        );
      }
      case "partTimePreference":
        return (
          <div className="space-y-4">
            <ChoiceGrid
              value={answers.partTimePreference}
              onChange={(value) => {
                setAnswer("partTimePreference", value);
                // Reset post-FIRE income when switching to "no"
                if (value === "no") setAnswer("postFireIncome", 0);
                // Set sensible default when switching to yes/maybe
                if (value === "yes" && answers.postFireIncome === 0) setAnswer("postFireIncome", 20_000);
                if (value === "maybe" && answers.postFireIncome === 0) setAnswer("postFireIncome", 10_000);
              }}
              options={[
                {
                  value: "yes",
                  label: "Yes, I would happily work part-time",
                  description:
                    "Semi-retirement sounds appealing if it speeds up freedom and lowers portfolio pressure.",
                },
                {
                  value: "maybe",
                  label: "Maybe, if it buys flexibility",
                  description:
                    "You are open to a bridge strategy, but only if the tradeoff feels worth it.",
                },
                {
                  value: "no",
                  label: "No, I want full independence",
                  description:
                    "You would rather hold out for complete optionality than rely on earned income later.",
                },
              ]}
            />
            {answers.partTimePreference !== "no" ? (
              <div className="rounded-xl bg-muted/40 p-4">
                <FieldLabel
                  htmlFor="quiz-post-fire-income"
                  label="How much do you expect to earn annually after FIRE?"
                />
                <NumberInput
                  id="quiz-post-fire-income"
                  min={0}
                  step={5_000}
                  inputMode="numeric"
                  value={answers.postFireIncome}
                  onValueChange={(value) => setAnswer("postFireIncome", value)}
                  className="mt-2"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Part-time work, consulting, rental income, etc. This reduces the portfolio you need.
                </p>
                {answers.postFireIncome > 0 ? (
                  <div className="mt-4 space-y-3 border-t border-border/30 pt-4">
                    <p className="text-sm font-medium text-foreground">
                      How long do you plan to work part-time?
                    </p>
                    <div className="grid gap-2">
                      {([
                        { label: "Until I don't need to anymore", value: null },
                        { label: "About 5 years", value: 5 },
                        { label: "About 10 years", value: 10 },
                        ...(answers.currentAge < 62
                          ? [{ label: `Until Social Security (~age 62, ${62 - answers.currentAge} years)`, value: 62 - answers.currentAge }]
                          : []),
                      ] as const).map((option) => {
                        const selected = answers.postFireIncomeDuration === option.value;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => setAnswer("postFireIncomeDuration", option.value as number | null)}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-left text-sm transition-all",
                              selected
                                ? "border-[rgba(255,107,53,0.26)] bg-[rgba(255,107,53,0.12)]"
                                : "border-border/60 bg-card/40 hover:border-border",
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      case "flexibility":
        return (
          <ChoiceGrid
            value={answers.flexibility}
            onChange={(value) => setAnswer("flexibility", value)}
            options={[
              {
                value: "low",
                label: "Low flexibility",
                description:
                  "Cutting 20% during a market slump would feel very hard or unrealistic.",
              },
              {
                value: "medium",
                label: "Moderate flexibility",
                description:
                  "You could trim some travel, upgrades, or extras, but not your entire lifestyle.",
              },
              {
                value: "high",
                label: "High flexibility",
                description:
                  "You can meaningfully reduce spending if a bad sequence-of-returns stretch hits.",
              },
            ]}
          />
        );
      case "dependents":
        return (
          <ChoiceGrid
            value={answers.dependents}
            onChange={(value) => setAnswer("dependents", value)}
            options={[
              {
                value: "no",
                label: "No dependents",
                description:
                  "Your plan is mostly accountable to your own lifestyle and risk tolerance.",
              },
              {
                value: "yes",
                label: "Yes, dependents are part of the plan",
                description:
                  "You need more predictability, margin, or flexibility because others rely on this plan too.",
              },
            ]}
          />
        );
      case "riskTolerance":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Cautious</span>
              <Badge variant="secondary">{riskLabels[answers.riskTolerance - 1]}</Badge>
              <span>Aggressive</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[answers.riskTolerance]}
              onValueChange={([value]) =>
                setAnswer("riskTolerance", Math.max(1, Math.min(5, value ?? 3)))
              }
            />
          </div>
        );
      case "priority":
        return (
          <ChoiceGrid
            value={answers.priority}
            onChange={(value) => setAnswer("priority", value)}
            options={[
              {
                value: "freedom_fast",
                label: priorityLabels.freedom_fast,
                description:
                  "You want the fastest credible path, even if that means short-term intensity.",
              },
              {
                value: "balanced_life",
                label: priorityLabels.balanced_life,
                description:
                  "You want progress without making current life feel like a holding pattern.",
              },
              {
                value: "premium_lifestyle",
                label: priorityLabels.premium_lifestyle,
                description:
                  "You care more about sustaining comfort and optionality than minimizing the FIRE number.",
              },
            ]}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Hero — clean, no jargon badges */}
      <PageHero
        title="Find the FIRE path that fits your life"
        description="Answer a few quick questions. Calcifer turns your answers into a personalized recommendation, target number, and a clear next step."
        actions={
          <Button asChild variant="outline">
            <Link href={"/accumulation" as Route}>Skip to planner</Link>
          </Button>
        }
      />

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        {/* Quiz card or collapsed result */}
        {quizComplete ? (
          <button
            type="button"
            onClick={() => setQuizComplete(false)}
            className="group w-full rounded-2xl bg-card p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full border border-[rgba(255,107,53,0.18)] bg-[rgba(255,107,53,0.12)] p-2.5 text-[var(--ember)]">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
                    Your result
                  </p>
                  <p className="mt-1 font-display text-2xl tracking-[-0.03em] text-foreground">
                    {recommendation.label}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {recommendation.headline}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden text-right sm:block">
                  <p className="text-sm text-muted-foreground">Target</p>
                  <p className="font-display text-xl tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(recommendation.targetNumber)}
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-muted-foreground transition-transform group-hover:translate-y-0.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </button>
        ) : (
          <form
            className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]"
            onSubmit={async (event) => {
              // Pressing Enter inside any input submits the form; this
              // handler mirrors the Next / See-my-result button's click.
              // Native form submission would navigate, so always prevent
              // default first.
              event.preventDefault();
              // Over-budget guard: if the user tries to advance from
              // the contribution-split step while their buckets exceed
              // take-home, don't block hard — surface a prompt so they
              // can choose to trim a bucket or revisit the spending
              // step. Hard-disabling Next felt like a dead end.
              if (
                currentStep.key === "contributionSplit" &&
                computeContributionBudget(answers).isOverBudget
              ) {
                setShowOverBudgetPrompt(true);
                return;
              }
              if (isLastStep) {
                await persistQuizToStore();
                setQuizComplete(true);
              } else {
                setStepIndex((v) => Math.min(v + 1, steps.length - 1));
              }
            }}
          >
            {/* Question header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                  {currentStep.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentStep.description}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {stepIndex + 1}/{steps.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--flame)] to-[var(--ember)] transition-all duration-300"
                style={{ width: `${completion * 100}%` }}
              />
            </div>

            {/* Question content — keyed so stateful children (e.g. NumberInput draft state) reset on step change */}
            <div key={currentStep.key} className="mt-6">
              {renderStep()}
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStepIndex((v) => Math.max(v - 1, 0))}
                disabled={stepIndex === 0}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              {isLastStep ? (
                // `type="submit"` so the form's onSubmit fires from
                // both button click and Enter keypress — single code
                // path. The form's onSubmit intercepts over-budget
                // cases and shows a prompt instead of advancing.
                <Button type="submit">
                  <Sparkles className="size-4" />
                  See my result
                </Button>
              ) : (
                <Button type="submit">
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </form>
        )}

        {/* Over-budget prompt for contributionSplit. Not a hard block —
            we offer whichever honest path actually resolves the gap. */}
        {showOverBudgetPrompt ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="over-budget-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={(e) => {
              // Click outside card dismisses.
              if (e.target === e.currentTarget) setShowOverBudgetPrompt(false);
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              {(() => {
                const budget = computeContributionBudget(answers);
                const { overBudgetBy, totalSavings, estimatedTakeHome, preTaxableAllocated } =
                  budget;
                // Spending needed so takeHome − spending == preTaxableAllocated.
                // If this is negative, contributions exceed take-home
                // entirely — can't fix by trimming spending alone.
                const proposedSpending = estimatedTakeHome - preTaxableAllocated;
                const canFixBySpending = proposedSpending >= 0;
                const spendingStepIndex = steps.findIndex(
                  (s) => s.key === "annualSpending",
                );
                return (
                  <>
                    <h3
                      id="over-budget-title"
                      className="font-display text-lg tracking-[-0.02em] text-foreground"
                    >
                      Your contributions exceed your budget
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      The buckets above add up to{" "}
                      <strong className="font-mono text-foreground">
                        {formatCompactCurrency(overBudgetBy)}
                      </strong>{" "}
                      more than your estimated after-tax savings of{" "}
                      <strong className="font-mono text-foreground">
                        {formatCompactCurrency(totalSavings)}/yr
                      </strong>
                      .
                      {canFixBySpending ? (
                        <>
                          {" "}
                          You can either trim a contribution bucket, or
                          lower your spending target to make room.
                        </>
                      ) : (
                        <>
                          {" "}
                          Even with zero spending, your contributions
                          would exceed your estimated take-home of{" "}
                          <strong className="font-mono text-foreground">
                            {formatCompactCurrency(estimatedTakeHome)}/yr
                          </strong>
                          . You&rsquo;ll need to trim a bucket, or
                          revisit your income / spending on an earlier
                          step.
                        </>
                      )}
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowOverBudgetPrompt(false)}
                      >
                        Let me trim a bucket
                      </Button>
                      {canFixBySpending ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            // Lower spending to exactly the amount that
                            // makes the budget absorb all contributions,
                            // then advance to the next step.
                            setAnswer("annualSpending", proposedSpending);
                            setShowOverBudgetPrompt(false);
                            setStepIndex((v) =>
                              Math.min(v + 1, steps.length - 1),
                            );
                          }}
                        >
                          Lower spending to {formatCompactCurrency(proposedSpending)}/yr
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowOverBudgetPrompt(false);
                            if (spendingStepIndex >= 0) {
                              setStepIndex(spendingStepIndex);
                            }
                          }}
                        >
                          <ArrowLeft className="size-4" />
                          Revisit my spending step
                        </Button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : null}

        {/* Results — only show after completion */}
        {quizComplete ? (
          <div className="space-y-8">
            {/* Recommendation detail */}
            <div className="space-y-5">
              <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                Your recommendation
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">Target</p>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-[var(--ember)]">
                    {formatCompactCurrency(recommendation.targetNumber)}
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--flame)] to-[var(--ember)]"
                        style={{ width: `${Math.min(recommendation.progressToTarget * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatPercent(recommendation.progressToTarget, 0)} there
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Coast target</p>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(recommendation.coastTargetToday)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Save this much, then compounding alone finishes the job by retirement.
                  </p>
                </div>
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Why this path</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {recommendation.rationale}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {recommendation.nextStep}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={handleQuizComplete}>
                  <WandSparkles className="size-4" />
                  {stageNextStep[answers.stage].label}
                </Button>
              </div>
            </div>

            {/* Type comparison */}
            <div className="space-y-5">
              <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                Compare all paths
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {fireTypes.map((fireType) => {
                  const highlighted = fireType.id === recommendation.id;
                  return (
                    <div
                      key={fireType.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-2xl p-5 transition-all",
                        highlighted
                          ? "bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03),0_0_0_2px_rgba(255,107,53,0.2)]"
                          : "bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{fireType.label}</h3>
                        {highlighted ? (
                          <span className="rounded-full bg-[rgba(255,107,53,0.12)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
                            Best fit
                          </span>
                        ) : null}
                      </div>
                      <p className="font-display text-2xl tracking-[-0.03em] text-foreground">
                        {formatCompactCurrency(fireType.target)}
                      </p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            highlighted
                              ? "bg-gradient-to-r from-[var(--flame)] to-[var(--ember)]"
                              : "bg-primary/60",
                          )}
                          style={{ width: `${Math.min(fireType.progress * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm leading-snug text-muted-foreground">
                        {fireType.description}
                      </p>
                      {fireType.id === "coast" ? (
                        <Link
                          href="/education/coast-fire"
                          className="mt-1 text-xs font-medium text-[var(--ember)] hover:underline"
                        >
                          Learn about Coast FIRE &rarr;
                        </Link>
                      ) : fireType.id === "barista" ? (
                        <Link
                          href="/education/barista-fire"
                          className="mt-1 text-xs font-medium text-[var(--ember)] hover:underline"
                        >
                          Learn about Barista FIRE &rarr;
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
