import type { Route } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SectionHeading } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const journeyCards: Array<{
  eyebrow: string;
  title: string;
  description: string;
  href: Route;
  cta: string;
}> = [
  {
    eyebrow: "Brand new to FIRE",
    title: "Start with a quick answer and a path",
    description:
      "Use the quiz if you want help turning your numbers into a FIRE style that fits your life.",
    href: "/quiz",
    cta: "Take the FIRE quiz",
  },
  {
    eyebrow: "Actively saving",
    title: "Open the full planner when the basics are clear",
    description:
      "Add accounts, partner planning, cash-flow events, and deeper assumptions without losing the simple starting point.",
    href: "/accumulation",
    cta: "Open the full planner",
  },
  {
    eyebrow: "Close to retiring",
    title: "Stress-test the decision, not just the headline number",
    description:
      "Run historical backtests, Monte Carlo, and withdrawal strategy comparisons before you pull the trigger.",
    href: "/withdrawal",
    cta: "Test retirement durability",
  },
];

const capabilityCards: Array<{
  title: string;
  description: string;
  href: Route;
  tier: "free" | "pro";
}> = [
  {
    title: "Quick answer",
    description:
      "See your FIRE number, safer target, and timeline in under a minute.",
    href: "/",
    tier: "free",
  },
  {
    title: "FIRE type quiz",
    description:
      "Translate preferences and lifestyle flexibility into a recommended path.",
    href: "/quiz",
    tier: "free",
  },
  {
    title: "Full planner",
    description:
      "Model accounts, cash flows, partner planning, and milestone progress.",
    href: "/accumulation",
    tier: "free",
  },
  {
    title: "Retirement lab",
    description:
      "Compare historical success, Monte Carlo outcomes, and spending strategies.",
    href: "/withdrawal",
    tier: "free",
  },
  {
    title: "Decision support",
    description:
      "Layer in Roth ladders, ACA planning, Social Security, and scenario comparison.",
    href: "/tax-strategy",
    tier: "free",
  },
];

const trustCards = [
  {
    title: "Built around progressive disclosure",
    description:
      "You can start with one answer, then open the deeper planning surfaces only when you need them.",
  },
  {
    title: "Research-backed defaults",
    description:
      "The calculator starts in real dollars, shows a safer comparison rate, and links to explanations instead of hiding assumptions.",
  },
  {
    title: "Designed for real decision moments",
    description:
      "Jarlan is meant to serve beginners, accumulators, pre-retirees, and already-retired users without forcing everyone through the same dense workflow.",
  },
] as const;

export function LandingPathwaySection() {
  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Choose your path"
        title="Start from the question you actually have today"
        description="The best FIRE apps keep the surface calm, then route people into the right depth. Pick the lane that matches your stage and keep moving."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {journeyCards.map((card) => (
          <Card key={card.title} className="h-full">
            <CardHeader className="space-y-3">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ember)]">
                {card.eyebrow}
              </p>
              <h3 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                {card.title}
              </h3>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{card.description}</p>
              <Button asChild variant="ghost" className="px-0">
                <Link href={card.href}>
                  {card.cta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function LandingCapabilitySection() {
  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="What you can do"
        title="A clear first answer, then deeper planning when you are ready"
        description="The product should feel approachable on day one without hiding the serious tools that make it credible later."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {capabilityCards.map((card) => (
          <Link key={card.title} href={card.href} className="group">
            <Card className="h-full transition-colors group-hover:border-border">
              <CardContent className="space-y-3 py-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{card.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{card.description}</p>
                <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  Explore this tool
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LandingTrustSection() {
  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Why this feels different"
        title="The best UI is not the one with the most visible features"
        description="The goal is to help each persona get to the right decision surface quickly, then let the depth show up only when it becomes useful."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {trustCards.map((card) => (
          <Card key={card.title} className="h-full">
            <CardContent className="space-y-3 py-6">
              <p className="font-medium text-foreground">{card.title}</p>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
