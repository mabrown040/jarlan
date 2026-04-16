"use client";

import type { Route } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Copy, Hourglass, Printer } from "lucide-react";

import { SectionHeading, StatCard } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import {
  formatCompactCurrency,
  formatPercent,
  formatYears,
} from "@/lib/calc";
import type { RetirementReadinessAssessment } from "@/lib/retirement";
import { cn } from "@/lib/utils";

const verdictTone = {
  ready: {
    ring: "stroke-[var(--success)]",
    surface: "border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)]",
    icon: CheckCircle2,
  },
  close: {
    ring: "stroke-[var(--warning)]",
    surface: "border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.08)]",
    icon: AlertTriangle,
  },
  needs_work: {
    ring: "stroke-[var(--danger)]",
    surface: "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)]",
    icon: AlertTriangle,
  },
  accumulation: {
    // Readiness score is meaningless in this phase — use a neutral tone and
    // the callers swap the gauge for a banner.
    ring: "stroke-border",
    surface: "border-border/60 bg-muted/40",
    icon: Hourglass,
  },
} as const;

function ReadinessGauge({
  score,
  verdict,
}: {
  score: number;
  verdict: RetirementReadinessAssessment["verdict"];
}) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(score, 100)) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="fill-none stroke-border"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className={cn("fill-none transition-all", verdictTone[verdict].ring)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl leading-none tracking-[-0.03em]">
          {Math.round(score)}
        </span>
        <span className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Score
        </span>
      </div>
    </div>
  );
}

export function RetirementReadinessSummary({
  assessment,
  status,
  error,
  copied = false,
  onCopyShareLink,
  onPrint,
  secondaryCta,
}: {
  assessment: RetirementReadinessAssessment;
  status: "idle" | "loading" | "ready" | "error";
  error?: string | null;
  copied?: boolean;
  onCopyShareLink?: () => void | Promise<void>;
  onPrint?: () => void;
  secondaryCta?: { href: Route; label: string };
}) {
  const Icon = verdictTone[assessment.verdict].icon;
  const isAccumulation = assessment.verdict === "accumulation";

  if (isAccumulation) {
    // Skip the score gauge and simulation stat grid — those are meaningless
    // while the user is still net-saving. Show a guidance banner instead.
    return (
      <Card data-print-section="summary">
        <CardHeader>
          <SectionHeading
            eyebrow="Retirement readiness"
            title="Can I retire now?"
            titleAs="h3"
            titleClassName="text-[1.9rem]"
            description="This view is designed for the moment you start drawing from the portfolio."
          />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "rounded-2xl border p-5 shadow-[var(--shadow-soft)]",
              verdictTone.accumulation.surface,
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="size-5" />
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Still building
              </p>
            </div>
            <p className="mt-3 font-display text-2xl leading-tight tracking-[-0.03em] text-foreground">
              {assessment.title}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {assessment.summary}
            </p>
            {secondaryCta ? (
              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-print-section="summary">
      <CardHeader>
        <SectionHeading
          eyebrow="Retirement readiness"
          title="Can I retire now?"
          titleAs="h3"
          titleClassName="text-[1.9rem]"
          description="A single answer that blends withdrawal durability, first-decade sequence risk, ACA room, Social Security timing, and drawdown choices."
        />
      </CardHeader>
      <CardContent className="space-y-6">
        {status === "loading" ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
            Refreshing the historical and Monte Carlo views that feed this decision snapshot.
          </div>
        ) : null}
        {status === "error" && error ? (
          <ErrorAlert title="We couldn't refresh the readiness snapshot">
            {error}
          </ErrorAlert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[16rem_1fr]">
          <div
            className={cn(
              "rounded-2xl border p-5 shadow-[var(--shadow-soft)]",
              verdictTone[assessment.verdict].surface,
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="size-5" />
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Decision score
              </p>
            </div>
            <div className="mt-4">
              <ReadinessGauge
                score={assessment.score}
                verdict={assessment.verdict}
              />
            </div>
            <p className="mt-4 font-display text-2xl leading-tight tracking-[-0.03em] text-foreground">
              {assessment.title}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {assessment.summary}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Historical success"
              value={
                assessment.historicalSuccessRate === null
                  ? "Pending"
                  : formatPercent(assessment.historicalSuccessRate, 1)
              }
              description="Rolling historical start dates using the active withdrawal strategy."
              tone={
                assessment.historicalSuccessRate !== null &&
                assessment.historicalSuccessRate >= 0.9
                  ? "success"
                  : assessment.historicalSuccessRate !== null &&
                      assessment.historicalSuccessRate >= 0.75
                    ? "warning"
                    : "danger"
              }
            />
            <StatCard
              label="Monte Carlo success"
              value={
                assessment.monteCarloSuccessRate === null
                  ? "Pending"
                  : formatPercent(assessment.monteCarloSuccessRate, 1)
              }
              description="Forward-looking trial success at the current return model and retirement horizon."
              tone="accent"
            />
            <StatCard
              label="First 10-year failure risk"
              value={
                assessment.firstDecadeFailureRisk === null
                  ? "Pending"
                  : formatPercent(assessment.firstDecadeFailureRisk, 1)
              }
              description="A direct sequence-risk lens on the riskiest early retirement stretch."
              tone={
                assessment.firstDecadeFailureRisk !== null &&
                assessment.firstDecadeFailureRisk <= 0.1
                  ? "success"
                  : "warning"
              }
            />
            <StatCard
              label="Peak alive and broke"
              value={
                assessment.peakAliveAndBrokeProbability === null
                  ? "Pending"
                  : formatPercent(assessment.peakAliveAndBrokeProbability, 1)
              }
              description="Worst mortality-adjusted broke probability across the modeled retirement."
              tone={
                assessment.peakAliveAndBrokeProbability !== null &&
                assessment.peakAliveAndBrokeProbability <= 0.12
                  ? "success"
                  : "warning"
              }
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="ACA room left"
            value={formatCompactCurrency(assessment.acaRoomRemaining)}
            description="Remaining modeled conversion headroom before the current ACA threshold is hit."
          />
          <StatCard
            label="Bridge need"
            value={formatCompactCurrency(assessment.bridgeFundingNeed)}
            description={`Bridge reserve left after the current ladder model: ${formatCompactCurrency(
              assessment.bridgeReserveLeft,
            )}.`}
          />
          <StatCard
            label="Recommended SS age"
            value={String(assessment.recommendedClaimAge)}
            description="Mortality-weighted Social Security timing from the tax engine."
            tone="accent"
          />
          <StatCard
            label="Best drawdown order"
            value={assessment.bestDrawdown?.label ?? "Pending"}
            description={
              assessment.bestDrawdown
                ? `Estimated 10-year taxes: ${formatCompactCurrency(
                    assessment.bestDrawdown.estimatedTenYearTaxes,
                  )}.`
                : "The tax comparison will appear when the drawdown model is ready."
            }
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
            <p className="font-medium text-foreground">What could break first</p>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>
                Worst historical start:{" "}
                <span className="font-medium text-foreground">
                  {assessment.worstCaseStartDate ?? "Pending"}
                </span>
                .
              </p>
              <p>
                Failure timing in that path:{" "}
                <span className="font-medium text-foreground">
                  {assessment.worstCaseFailureYear === null
                    ? "No failure in the selected window"
                    : formatYears(assessment.worstCaseFailureYear)}
                </span>
                .
              </p>
              <p>
                Median spending floor under the current strategy:{" "}
                <span className="font-medium text-foreground">
                  {assessment.worstCaseMedianSpendingFloor === null
                    ? "Pending"
                    : formatCompactCurrency(assessment.worstCaseMedianSpendingFloor)}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
            <p className="font-medium text-foreground">Why this answer</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Strengths
                </p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {assessment.strengths.map((item) => (
                    <li key={item} className="rounded-xl border border-border/60 bg-background/60 p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Watchouts
                </p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {assessment.watchouts.map((item) => (
                    <li key={item} className="rounded-xl border border-border/60 bg-background/60 p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
          <p className="font-medium text-foreground">Next actions</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {assessment.nextActions.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3" data-print-hidden="true">
          {onCopyShareLink ? (
            <Button type="button" variant="outline" onClick={onCopyShareLink}>
              <Copy className="size-4" />
              {copied ? "Copied share link" : "Copy share link"}
            </Button>
          ) : null}
          {onPrint ? (
            <Button type="button" variant="outline" onClick={onPrint}>
              <Printer className="size-4" />
              Print decision snapshot
            </Button>
          ) : null}
          {secondaryCta ? (
            <Button asChild variant="ghost">
              <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
