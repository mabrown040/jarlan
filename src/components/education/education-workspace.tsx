import { ChartShell, PageHero, SectionHeading } from "@/components/brand";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  educationAnchors,
  educationDefaults,
  educationGlossary,
  educationReferences,
} from "@/lib/education/content";

export function EducationWorkspace() {
  return (
    <div className="space-y-10 pb-12">
      <PageHero
        eyebrow="Education hub"
        badges={[
          { label: "Glossary" },
          { label: "Research library", variant: "secondary" },
          { label: "Source-linked defaults", variant: "outline" },
        ]}
        title="Learn the math behind the planner"
        description="This hub keeps the educational layer server-rendered and readable while linking the live calculators back to the research, concepts, and defaults they use."
      />

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        <ChartShell
          eyebrow="How to use this"
          title="Three reading paths"
          description="Start simple, then opt into more technical material only when you want it."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Beginner</p>
              <p className="mt-2">
                Start with the quick FIRE number, then read the glossary entries for
                withdrawal rate, savings rate, and Coast FIRE.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Intermediate</p>
              <p className="mt-2">
                Move into historical backtesting, sequence risk, and the difference
                between fixed and dynamic withdrawal strategies.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Advanced</p>
              <p className="mt-2">
                Use the research links to dive into CAPE-based spending, mortality
                framing, and tax-aware early-retirement tactics.
              </p>
            </div>
          </div>
        </ChartShell>

        <section className="space-y-6">
          <SectionHeading
            eyebrow="Glossary"
            title="Core FIRE concepts"
            description="Short definitions for the terms that show up most often across the app."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {educationGlossary.map((entry) => (
              <Card key={entry.term} id={entry.id}>
                <CardHeader>
                  <SectionHeading
                    eyebrow="Concept"
                    title={entry.term}
                    titleAs="h3"
                    titleClassName="text-[1.35rem]"
                  />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {entry.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Defaults"
                title="Why the app defaults look like this"
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description="Defaults are meant to be transparent starting points, not universal truths."
              />
            </CardHeader>
            <CardContent
              id={educationAnchors.defaults}
              className="space-y-3 text-sm text-muted-foreground"
            >
              {educationDefaults.map((item) => (
                <div
                  key={item.id}
                  id={item.id}
                  className="rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-2">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Research"
                title="Research library"
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description="A small starting set of links that map directly to the assumptions and calculators in the app."
              />
            </CardHeader>
            <CardContent
              id={educationAnchors.researchLibrary}
              className="space-y-3 text-sm"
            >
              {educationReferences.map((reference) => (
                <a
                  key={reference.url}
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-border/60 bg-card/40 p-4 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                >
                  {reference.label}
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
