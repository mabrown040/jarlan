"use client";

import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHero } from "@/components/brand";
import { FieldLabel } from "@/components/form/field-label";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Slider } from "@/components/ui/slider";
import {
  calculateFireTypeSummaries,
  formatCompactCurrency,
  formatPercent,
  formatYears,
} from "@/lib/calc";
import {
  DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
  buildScenarioFromQuizAnswers,
  getFireTypeRecommendation,
  type FireStage,
  type FireTypeQuizAnswers,
  type PlanningPriority,
} from "@/lib/quiz/fire-type-quiz";
import { useScenarioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface QuizStep {
  key: keyof FireTypeQuizAnswers;
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
  { key: "annualIncome", title: "What is your annual gross income?", description: "Pre-tax income from all sources. This determines your savings rate and timeline." },
  { key: "annualSpending", title: "What annual spending level feels comfortable?", description: "Use a real-world number, not the absolute minimum you could survive on for a year." },
  { key: "currentPortfolio", title: "How much is already invested toward FIRE?", description: "A current portfolio helps calculate Coast FIRE and your overall progress." },
  { key: "partTimePreference", title: "Would you be open to earning income after FIRE?", description: "This changes whether Barista FIRE is in the mix — and sets your post-FIRE income assumption." },
  { key: "flexibility", title: "How much spending flexibility would you have in a downturn?", description: "A plan is only useful if it feels behaviorally realistic during rough markets." },
  { key: "dependents", title: "Are you planning with dependents in the picture?", description: "Household responsibility can shift the tradeoff toward more margin." },
  { key: "riskTolerance", title: "How much risk of running short feels acceptable?", description: "Cautious answers push toward more margin. Aggressive answers favor speed." },
  { key: "priority", title: "What matters most in your plan right now?", description: "This helps separate speed-first FIRE plans from lifestyle-first paths." },
];

const stageQuestionKeys: Record<FireStage, Array<keyof FireTypeQuizAnswers>> = {
  curious: ["currentAge", "targetFiAge", "annualIncome", "annualSpending", "currentPortfolio", "partTimePreference", "flexibility", "dependents", "riskTolerance", "priority"],
  saving: ["currentAge", "targetFiAge", "annualIncome", "annualSpending", "currentPortfolio", "partTimePreference", "flexibility", "dependents", "riskTolerance", "priority"],
  pre_retirement: ["currentAge", "targetFiAge", "annualSpending", "currentPortfolio", "partTimePreference", "flexibility", "riskTolerance"],
  retired: ["currentAge", "annualSpending", "currentPortfolio", "flexibility"],
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
    initialize,
    updateCurrentBalance,
    updateIncome,
    updateExpenses,
    updatePartTimeIncome,
    updateProfileAge,
    updateRetirementAge,
    updateWithdrawalRate,
    updateSaferWithdrawalRate,
    updateExpenseGrowthRate,
    replaceScenario,
    saveDraft,
  } = useScenarioStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(DEFAULT_FIRE_TYPE_QUIZ_ANSWERS);
  const [quizComplete, setQuizComplete] = useState(false);
  const hasSyncedFromStore = useRef(false);

  // Initialize the store if it hasn't been initialized yet (e.g. direct navigation to /quiz)
  useEffect(() => {
    if (status === "idle") {
      void initialize();
    }
  }, [status, initialize]);

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
    retired: { href: "/dashboard" as Route, label: "Check your plan" },
  };

  async function handleQuizComplete() {
    const built = buildScenarioFromQuizAnswers(answers);
    replaceScenario(built);
    await saveDraft();
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
              onValueChange={(value) => setAnswer("currentPortfolio", value)}
            />
          </div>
        );
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
          <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
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

            {/* Question content */}
            <div className="mt-6">
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
                <Button type="button" onClick={() => setQuizComplete(true)}>
                  <Sparkles className="size-4" />
                  See my result
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setStepIndex((v) => Math.min(v + 1, steps.length - 1))}
                >
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        )}

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
