"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface PostedReply {
  id: string;
  operator_id: string;
  subreddit: string | null;
  post_url: string | null;
  share_url: string;
  extraction_confidence: string | null;
  reply_style: string | null;
  word_count: number | null;
  posted_at: string;
}

export default function PostedRepliesPage() {
  const [replies, setReplies] = useState<PostedReply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReplies() {
      try {
        const res = await fetch("/api/posted-replies");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setReplies(data.replies ?? []);
      } catch {
        setReplies([]);
      } finally {
        setLoading(false);
      }
    }
    void fetchReplies();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Posted Replies</h1>
        <Link
          href="/admin/scenario-from-text"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          ← Back to tool
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : replies.length === 0 ? (
        <p className="text-sm text-gray-500">No posted replies logged yet.</p>
      ) : (
        <div className="space-y-3">
          {replies.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {r.subreddit && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium dark:bg-gray-800">
                    r/{r.subreddit}
                  </span>
                )}
                <span>{new Date(r.posted_at).toLocaleDateString()}</span>
                {r.extraction_confidence && (
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      r.extraction_confidence === "high"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                        : r.extraction_confidence === "medium"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                    }`}
                  >
                    {r.extraction_confidence}
                  </span>
                )}
                {r.reply_style && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                    {r.reply_style}
                  </span>
                )}
                {r.word_count && <span>{r.word_count} words</span>}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <a
                  href={r.share_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Share link
                </a>
                {r.post_url && (
                  <a
                    href={r.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Reddit post
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
