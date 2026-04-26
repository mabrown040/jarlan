/**
 * Server-side functions for tracking posted Reddit replies.
 * Logs when an operator marks a reply as posted, along with metadata
 * that enables click-through analytics.
 */

import { getSupabaseServiceClient } from "@/lib/supabase/server";

export interface LogPostedReplyParams {
  operatorId: string;
  subreddit?: string;
  postUrl?: string;
  replyBody: string;
  shareUrl: string;
  extractionConfidence?: string;
  replyStyle?: string;
  wordCount: number;
}

/**
 * Log a posted reply to the `posted_replies` table.
 * Non-fatal on failure — warns to console and returns.
 */
export async function logPostedReply(params: LogPostedReplyParams): Promise<void> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    console.warn("[posted_replies] Supabase not configured — skipping log");
    return;
  }

  type PostedRepliesTable = {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await (
    supabase.from("posted_replies") as unknown as PostedRepliesTable
  ).insert({
    operator_id: params.operatorId,
    subreddit: params.subreddit ?? null,
    post_url: params.postUrl ?? null,
    reply_body: params.replyBody,
    share_url: params.shareUrl,
    extraction_confidence: params.extractionConfidence ?? null,
    reply_style: params.replyStyle ?? null,
    word_count: params.wordCount,
  });

  if (error) {
    console.warn("[posted_replies] insert failed:", error.message);
  }
}

/**
 * Fetch posted replies for the analytics dashboard.
 * Returns most recent first.
 */
export async function fetchPostedReplies(limit = 50): Promise<
  Array<{
    id: string;
    operator_id: string;
    subreddit: string | null;
    post_url: string | null;
    share_url: string;
    extraction_confidence: string | null;
    reply_style: string | null;
    word_count: number | null;
    posted_at: string;
  }>
> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  type Table = {
    select: (cols: string) => {
      order: (col: string, opts: { ascending: boolean }) => {
        limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };

  const { data, error } = await (
    supabase.from("posted_replies") as unknown as Table
  )
    .select(
      "id, operator_id, subreddit, post_url, share_url, extraction_confidence, reply_style, word_count, posted_at",
    )
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn("[posted_replies] fetch failed:", error);
    return [];
  }

  return data as Array<{
    id: string;
    operator_id: string;
    subreddit: string | null;
    post_url: string | null;
    share_url: string;
    extraction_confidence: string | null;
    reply_style: string | null;
    word_count: number | null;
    posted_at: string;
  }>;
}
