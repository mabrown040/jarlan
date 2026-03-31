"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { PageHero, SectionHeading } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AppErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHero
        eyebrow="Recovery"
        title={title}
        description={description}
        badges={[
          { label: "Local-first" },
          { label: "Recoverable error state" },
        ]}
      />
      <Card className="mt-8">
        <CardHeader>
          <SectionHeading
            eyebrow="What to do next"
            title="Try again or head back to a stable page"
            titleAs="h2"
            titleClassName="text-[1.9rem]"
            description="The app caught an unexpected runtime issue and kept the shell alive so you can recover without refreshing blindly."
          />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-300" />
              <p>
                If this keeps happening, the fastest fallback is to jump back to the
                landing page and reopen the module from there. Your local scenario
                draft should still be available.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {onRetry ? (
              <Button onClick={onRetry}>
                <RefreshCcw className="mr-2 size-4" />
                Try again
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/">Return to Quick FIRE</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
