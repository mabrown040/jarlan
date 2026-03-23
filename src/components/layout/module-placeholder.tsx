import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ChartShell, PageHero } from "@/components/brand";
import { Button } from "@/components/ui/button";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-10 pb-12">
      <PageHero
        eyebrow="Planned module"
        badges={[
          { label: "Planned module", variant: "secondary" },
          { label: "Foundation ready", variant: "outline" },
        ]}
        title={title}
        description={description}
        actions={
          <Button asChild variant="outline">
            <Link href="/accumulation">
              Explore the first live module
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
      <section className="mx-auto max-w-4xl px-6">
        <ChartShell
          eyebrow="Why this is ready"
          title="The architecture is already prepared for this module"
          description="The app shell, shared scenario model, persistence layer, and worker boundaries are in place, so this feature can land without a structural rewrite."
        >
          <p className="text-sm text-muted-foreground">
            The app shell, data model, persistence, and worker boundaries are now in
            place so this feature can land without a structural rewrite.
          </p>
        </ChartShell>
      </section>
    </div>
  );
}
