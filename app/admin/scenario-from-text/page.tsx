/**
 * Admin growth tool. Operator pastes free-text (forum post, Reddit
 * comment, user description) and receives a draft Scenario plus a
 * shareable link they can send to the prospective user.
 *
 * Hard-gated by `requireAdmin()`. Non-admins see a 404 — we
 * deliberately do not leak that this route exists.
 *
 * See docs/ai-chat-architecture.md for the broader design.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminScenarioFromText } from "@/components/admin/scenario-from-text";
import { requireAdmin } from "@/lib/supabase/admin";

// Always render fresh. The admin gate calls Supabase and that read
// shouldn't be cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin: Scenario from text",
  // Block search engines from indexing this surface even if they
  // somehow find it. Nothing here should be public.
  robots: { index: false, follow: false },
};

export default async function AdminScenarioFromTextPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AdminScenarioFromText />
    </main>
  );
}
