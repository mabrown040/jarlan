import { Suspense } from "react";

import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading dashboard...</div>}>
      <DashboardWorkspace />
    </Suspense>
  );
}
