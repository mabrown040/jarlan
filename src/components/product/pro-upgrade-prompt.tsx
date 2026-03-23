import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ProUpgradePrompt({
  title = "Next step if this becomes a recurring workflow",
  description = "The free tier is meant to earn trust first. Pro is where ongoing reviews, cloud sync, and richer planning workflows live.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/pricing">See free vs Pro</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/account">Manage account</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
