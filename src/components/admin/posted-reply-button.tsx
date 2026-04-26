"use client";

import { useState } from "react";

import { assembleReplyMessage } from "@/lib/ai/reply-template";

interface PostedReplyButtonProps {
  replyDraft: {
    summary: string;
    body: string;
    assumptionsLine: string;
  };
  shareUrl: string;
  confidence: string;
  replyStyle: string;
  subreddit: string;
}

export function PostedReplyButton({
  replyDraft,
  shareUrl,
  confidence,
  replyStyle,
  subreddit,
}: PostedReplyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [postUrl, setPostUrl] = useState("");
  const [posted, setPosted] = useState(false);

  const fullReply = assembleReplyMessage({
    body: replyDraft.body,
    assumptionsLine: replyDraft.assumptionsLine,
    shareUrl,
  });

  const wordCount = fullReply.trim().split(/\s+/).length;

  async function handleSubmit() {
    try {
      await fetch("/api/log-posted-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyBody: fullReply,
          shareUrl,
          extractionConfidence: confidence,
          replyStyle,
          wordCount,
          subreddit: subreddit.trim() || undefined,
          postUrl: postUrl.trim() || undefined,
        }),
      });
      setPosted(true);
      window.setTimeout(() => {
        setShowModal(false);
        setPosted(false);
        setPostUrl("");
      }, 1_500);
    } catch {
      // Silent fail — analytics are best-effort.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
      >
        Mark as posted
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold">Log posted reply</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Track this reply for analytics. The reply text and share URL are
              logged automatically.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium">Subreddit</label>
                <input
                  type="text"
                  value={subreddit}
                  readOnly
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Post URL (optional)</label>
                <input
                  type="text"
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://reddit.com/r/..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={posted}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {posted ? "Logged!" : "Log reply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
