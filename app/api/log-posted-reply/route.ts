/**
 * POST /api/log-posted-reply
 *
 * Logs when an operator marks a reply as posted on Reddit.
 * Admin-only. Used for click-through analytics.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { logPostedReply } from "@/lib/admin/posted-replies";
import { requireAdmin } from "@/lib/supabase/admin";

const requestSchema = z.object({
  replyBody: z.string().min(1).max(10_000),
  shareUrl: z.string().url(),
  extractionConfidence: z.string().optional(),
  replyStyle: z.string().optional(),
  wordCount: z.number().int().min(1),
  subreddit: z.string().max(50).optional(),
  postUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.reason },
      { status: gate.status },
    );
  }

  let body: z.infer<typeof requestSchema>;
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  await logPostedReply({
    operatorId: gate.user.id,
    subreddit: body.subreddit,
    postUrl: body.postUrl,
    replyBody: body.replyBody,
    shareUrl: body.shareUrl,
    extractionConfidence: body.extractionConfidence,
    replyStyle: body.replyStyle,
    wordCount: body.wordCount,
  });

  return NextResponse.json({ ok: true });
}
