"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { assembleReplyMessage } from "@/lib/ai/reply-template";
import type { ReplyStyle } from "@/lib/ai/types";
import { calculateFireSummary } from "@/lib/calc/fire-summary";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";
import type { AssumptionLog, Scenario } from "@/lib/domain/types";
import { useScenarioStore } from "@/lib/store/use-scenario-store";

import type { FireSummary } from "@/lib/calc/fire-summary";

interface ExtractApiResponse {
  scenario: Scenario;
  confidence: "high" | "medium" | "low";
  notes?: string;
  replyDraft: {
    summary: string;
    body: string;
    assumptionsLine: string;
  };
  shareUrl: string;
  fireSummary: FireSummary;
}

type Stage =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; data: ExtractApiResponse }
  | { kind: "error"; message: string };

const MIN_INPUT_CHARS = 20;
const MAX_INPUT_CHARS = 50_000;

export function AdminScenarioFromText() {
  const [text, setText] = useState("");
  const [replyStyle, setReplyStyle] = useState<ReplyStyle>("thorough");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const router = useRouter();
  const replaceScenario = useScenarioStore((s) => s.replaceScenario);

  async function handleExtract(styleOverride?: ReplyStyle) {
    const trimmed = text.trim();
    if (trimmed.length < MIN_INPUT_CHARS) {
      setStage({
        kind: "error",
        message: `Please paste at least ${MIN_INPUT_CHARS} characters of source text.`,
      });
      return;
    }

    setStage({ kind: "loading" });

    try {
      const res = await fetch("/api/extract-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          source: "admin_paste",
          replyStyle: styleOverride ?? replyStyle,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        const msg =
          body.message ?? body.error ?? `Request failed: ${res.status}`;
        setStage({ kind: "error", message: msg });
        return;
      }

      const data = (await res.json()) as ExtractApiResponse;
      setStage({ kind: "result", data });
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function handleOpenInWorkspace(scenario: Scenario) {
    replaceScenario(scenario);
    router.push("/accumulation");
  }

  async function handleCopyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1_500);
    } catch {
      // Clipboard can fail in non-HTTPS contexts or certain browsers.
      // Fall through silently — user can manually select the URL.
    }
  }

  function handleReset() {
    setStage({ kind: "idle" });
    setText("");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">
          Generate a scenario from text
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Paste a forum post, Reddit comment, or user description below.
          The AI extracts what it can and flags every assumption it had to
          make. You review before sharing.
        </p>
      </header>

      {stage.kind === "loading" ? (
        <LoadingPanel />
      ) : stage.kind === "result" ? (
        <ResultPanel
          data={stage.data}
          onOpenInWorkspace={handleOpenInWorkspace}
          onCopyShareUrl={handleCopyShareUrl}
          copyState={copyState}
          onReset={handleReset}
          onRegenerate={(style) => handleExtract(style)}
        />
      ) : (
        <PastePanel
          text={text}
          setText={setText}
          replyStyle={replyStyle}
          setReplyStyle={setReplyStyle}
          onExtract={() => handleExtract()}
          error={stage.kind === "error" ? stage.message : null}
        />
      )}
    </div>
  );
}

interface PastePanelProps {
  text: string;
  setText: (s: string) => void;
  replyStyle: ReplyStyle;
  setReplyStyle: (s: ReplyStyle) => void;
  onExtract: () => void;
  error: string | null;
}

function PastePanel({
  text,
  setText,
  replyStyle,
  setReplyStyle,
  onExtract,
  error,
}: PastePanelProps) {
  const tooShort = text.trim().length < MIN_INPUT_CHARS;
  const tooLong = text.length > MAX_INPUT_CHARS;

  return (
    <div className="space-y-3">
      <label
        htmlFor="source-text"
        className="block text-sm font-medium"
      >
        Source text
      </label>
      <textarea
        id="source-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder="Paste a forum post, Reddit comment, or user description here…"
        className="block w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        maxLength={MAX_INPUT_CHARS}
      />
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {text.length} / {MAX_INPUT_CHARS.toLocaleString()} characters
        </span>
        {tooLong ? (
          <span className="text-red-600">Over the size cap.</span>
        ) : tooShort ? (
          <span>
            Need at least {MIN_INPUT_CHARS} characters.
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="reply-style" className="text-sm text-gray-600 dark:text-gray-400">
            Reply style:
          </label>
          <select
            id="reply-style"
            value={replyStyle}
            onChange={(e) => setReplyStyle(e.target.value as ReplyStyle)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="concise">Concise (80–120 words)</option>
            <option value="thorough">Thorough (150–200 words)</option>
            <option value="questioning">Questioning (ends with questions)</option>
          </select>
        </div>
        <button
          type="button"
          onClick={onExtract}
          disabled={tooShort || tooLong}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
        >
          Extract scenario
        </button>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-sm text-gray-600 dark:text-gray-300">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100" />
      <p>Extracting scenario… this usually takes 5–15 seconds.</p>
    </div>
  );
}

interface ResultPanelProps {
  data: ExtractApiResponse;
  onOpenInWorkspace: (s: Scenario) => void;
  onCopyShareUrl: (url: string) => void;
  copyState: "idle" | "copied";
  onReset: () => void;
  onRegenerate: (style: ReplyStyle) => void;
}

function ResultPanel({
  data,
  onOpenInWorkspace,
  onCopyShareUrl,
  copyState,
  onReset,
  onRegenerate,
}: ResultPanelProps) {
  const { scenario, confidence, notes, shareUrl } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Review extraction</h2>
        <ConfidenceBadge confidence={confidence} />
      </div>

      {notes ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <strong className="font-medium">Note from the model:</strong>{" "}
          {notes}
        </div>
      ) : null}

      <FireSummaryCard summary={data.fireSummary} />

      <ReplyDraftPanel replyDraft={data.replyDraft} shareUrl={shareUrl} />

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Regenerate as:</span>
        <button
          type="button"
          onClick={() => onRegenerate("concise")}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          Concise
        </button>
        <button
          type="button"
          onClick={() => onRegenerate("thorough")}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          Thorough
        </button>
        <button
          type="button"
          onClick={() => onRegenerate("questioning")}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          Questioning
        </button>
      </div>

      <ScenarioSummary scenario={scenario} />

      <AssumptionsList
        assumptions={scenario.meta?.assumptionsLog ?? []}
      />

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Shareable URL
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-950"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => onCopyShareUrl(shareUrl)}
            className="shrink-0 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {copyState === "copied" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={() => onOpenInWorkspace(scenario)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Open in workspace
        </button>
      </div>
    </div>
  );
}

function FireSummaryCard({ summary }: { summary: FireSummary }) {
  return (
    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
        FIRE Math
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <SummaryItem label="Portfolio" value={formatCompactCurrency(summary.portfolioTotal)} />
        <SummaryItem label="Expenses" value={formatCompactCurrency(summary.annualExpenses)} />
        <SummaryItem label="WR" value={formatPercent(summary.withdrawalRate)} />
        <SummaryItem label="Safer WR" value={formatPercent(summary.saferWithdrawalRate)} />
        <SummaryItem
          label="Years to FI"
          value={summary.yearsToFire !== null ? `${summary.yearsToFire.toFixed(1)}` : "—"}
        />
        <SummaryItem
          label="Already FI?"
          value={summary.isAlreadyFi ? "Yes ✓" : "No"}
        />
      </dl>
      {summary.isAlreadyFi && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
          Portfolio covers expenses at the safer withdrawal rate.
        </p>
      )}
    </div>
  );
}

interface ReplyDraftPanelProps {
  replyDraft: {
    summary: string;
    body: string;
    assumptionsLine: string;
  };
  shareUrl: string;
}

function ReplyDraftPanel({ replyDraft, shareUrl }: ReplyDraftPanelProps) {
  const initial = assembleReplyMessage({
    body: replyDraft.body,
    assumptionsLine: replyDraft.assumptionsLine,
    shareUrl,
  });
  const [replyText, setReplyText] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const trimmed = replyText.trim();
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      // Clipboard access can fail in some contexts (non-HTTPS,
      // restricted extensions). Operator can still select-and-copy
      // from the textarea manually.
    }
  }

  if (replyDraft.body === "") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-900/20">
        <strong className="font-medium">No reply drafted.</strong>{" "}
        The model declined to write a reply for this input — see the note
        above for why. You can still use the share URL on its own.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border-2 border-gray-900 p-4 dark:border-gray-100">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Reddit reply draft
        </h3>
        <button
          type="button"
          onClick={copy}
          disabled={trimmed.length === 0}
          className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 dark:disabled:bg-gray-700"
        >
          {copied ? "Copied!" : "Copy reply"}
        </button>
      </div>

      {replyDraft.summary ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold">Operator note:</span>{" "}
          {replyDraft.summary}
        </p>
      ) : null}

      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        rows={12}
        className="block w-full rounded-md border border-gray-300 bg-white p-3 text-sm leading-relaxed shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{wordCount} words</span>
        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          className="text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {showPreview ? "Hide Reddit preview" : "Show Reddit preview"}
        </button>
      </div>

      {showPreview && (
        <RedditPreview replyText={replyText} />
      )}
    </div>
  );
}

function RedditPreview({ replyText }: { replyText: string }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-orange-500" />
        <div>
          <div className="text-sm font-medium">u/JarlanBot</div>
          <div className="text-xs text-gray-500">just now</div>
        </div>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {replyText}
      </div>
      <div className="mt-3 flex gap-3 text-xs text-gray-500">
        <span>↑ Vote</span>
        <span>Reply</span>
        <span>Share</span>
        <span>Save</span>
      </div>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: "high" | "medium" | "low";
}) {
  const styles = {
    high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
    low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[confidence]}`}
    >
      Confidence: {confidence}
    </span>
  );
}

function ScenarioSummary({ scenario }: { scenario: Scenario }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Extracted scenario
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <SummaryItem label="Age" value={String(scenario.profile.age)} />
        <SummaryItem
          label="Retirement age"
          value={
            scenario.profile.retirementAge === null
              ? "—"
              : String(scenario.profile.retirementAge)
          }
        />
        <SummaryItem label="State" value={scenario.profile.state} />
        <SummaryItem
          label="Filing"
          value={scenario.profile.filingStatus.replace("_", " ")}
        />
        <SummaryItem
          label="Income"
          value={formatCompactCurrency(scenario.annualIncome)}
        />
        <SummaryItem
          label="Savings"
          value={formatCompactCurrency(scenario.annualSavings)}
        />
        <SummaryItem
          label="Expenses"
          value={formatCompactCurrency(scenario.annualExpenses)}
        />
        <SummaryItem
          label="Withdrawal rate"
          value={formatPercent(scenario.assumptions.withdrawalRate)}
        />
        <SummaryItem
          label="Real return"
          value={formatPercent(scenario.assumptions.expectedRealReturn)}
        />
      </dl>
      {scenario.accounts.length > 0 ? (
        <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-800">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Accounts
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {scenario.accounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  {a.name}
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    {a.type.replace(/_/g, " ")}
                  </span>
                </span>
                <span className="font-mono">
                  {formatCompactCurrency(a.currentBalance)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function AssumptionsList({
  assumptions,
}: {
  assumptions: AssumptionLog[];
}) {
  if (assumptions.length === 0) {
    return null;
  }
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Assumptions ({assumptions.length})
      </h3>
      <ul className="mt-3 space-y-2 text-sm">
        {assumptions.map((a, i) => (
          <li
            key={`${a.field}-${i}`}
            className="flex flex-col gap-1 rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/50"
          >
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="font-semibold">{a.field}</span>
              <span className="text-gray-500 dark:text-gray-400">=</span>
              <span>{JSON.stringify(a.value)}</span>
              <SourceBadge source={a.source} />
              <ConfidencePill confidence={a.confidence} />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {a.reason}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceBadge({
  source,
}: {
  source: "derived" | "default" | "inferred";
}) {
  const styles = {
    derived:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    inferred:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    default:
      "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles[source]}`}
    >
      {source}
    </span>
  );
}

function ConfidencePill({
  confidence,
}: {
  confidence: "high" | "medium" | "low";
}) {
  const styles = {
    high: "text-green-700 dark:text-green-300",
    medium: "text-yellow-700 dark:text-yellow-300",
    low: "text-red-700 dark:text-red-300",
  } as const;
  return (
    <span className={`text-[10px] font-medium ${styles[confidence]}`}>
      ({confidence})
    </span>
  );
}
