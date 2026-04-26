/**
 * GET /api/posted-replies
 *
 * Returns posted replies for the analytics dashboard.
 * Admin-only.
 */

import { NextResponse } from "next/server";

import { fetchPostedReplies } from "@/lib/admin/posted-replies";
import { requireAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.reason },
      { status: gate.status },
    );
  }

  const replies = await fetchPostedReplies(100);
  return NextResponse.json({ replies });
}
