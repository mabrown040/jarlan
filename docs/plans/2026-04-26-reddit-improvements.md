# Reddit Feature Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the Reddit reply generation feature with calculated numbers in replies, FIRE math preview in admin UI, reply style variants, and post tracking analytics.

**Architecture:** Two-pass pipeline: extraction → build scenario → calculate metrics → generate reply with computed numbers. Add reply style selector, FIRE math summary card, Reddit-style preview, and posted-reply tracking.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Anthropic SDK, Tailwind CSS

---

## Task 1: Add Calculation Utils for FIRE Metrics Summary

**Files:**
- Create: `src/lib/calc/fire-summary.ts`
- Test: `src/lib/calc/__tests__/fire-summary.test.ts`

**Step 1: Write the interface and failing test**

```typescript
// src/lib/calc/fire-summary.ts
export interface FireSummary {
  portfolioTotal: number;
  annualExpenses: number;
  withdrawalRate: number;
  saferWithdrawalRate: number;
  yearsToFire: number | null;
  isAlreadyFi: boolean;
  monthlySafeWithdrawal: number;
  monthlySaferWithdrawal: number;
  expenseCoverageYears: number;
}

export function calculateFireSummary(scenario: Scenario): FireSummary {
  // TODO
}
```

**Step 2: Write tests**

```typescript
// src/lib/calc/__tests__/fire-summary.test.ts
import { describe, it, expect } from "vitest";
import { calculateFireSummary } from "../fire-summary";
import { createDefaultScenario } from "@/lib/domain/defaults";

describe("calculateFireSummary", () => {
  it("detects already-FI scenario", () => {
    const s = createDefaultScenario();
    s.accounts[0].currentBalance = 3_000_000;
    s.annualExpenses = 80_000;
    s.assumptions.withdrawalRate = 0.04;
    s.assumptions.saferWithdrawalRate = 0.035;
    
    const summary = calculateFireSummary(s);
    expect(summary.isAlreadyFi).toBe(true);
    expect(summary.portfolioTotal).toBe(3_000_000);
  });

  it("calculates years to FI for accumulation scenario", () => {
    const s = createDefaultScenario();
    s.accounts[0].currentBalance = 500_000;
    s.annualIncome = 150_000;
    s.annualSavings = 50_000;
    s.annualExpenses = 80_000;
    
    const summary = calculateFireSummary(s);
    expect(summary.yearsToFire).not.toBeNull();
    expect(summary.yearsToFire).toBeGreaterThan(0);
  });
});
```

**Step 3: Implement minimal version**

Use existing `calculateScenario` or quick-FIRE logic. Sum accounts, check if portfolio × WR >= expenses, compute years to target.

**Step 4: Run tests**

```bash
cd /home/claw/.openclaw/workspace/developer/jarlan
npx vitest run src/lib/calc/__tests__/fire-summary.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/calc/fire-summary.ts src/lib/calc/__tests__/fire-summary.test.ts
git commit -m "feat: add FIRE summary calculator for admin review panel"
```

---

## Task 2: Add Reply Style Variants to AI Pipeline

**Files:**
- Modify: `src/lib/ai/prompts/extract-scenario.ts`
- Modify: `src/lib/ai/tools/extract-scenario.ts`
- Modify: `src/lib/ai/types.ts`
- Modify: `src/lib/ai/schemas/extract-scenario.ts`

**Step 1: Add reply style type**

```typescript
// src/lib/ai/types.ts
export type ReplyStyle = "concise" | "thorough" | "questioning";
```

**Step 2: Update extraction input to include style**

```typescript
// src/lib/ai/types.ts
export interface ExtractScenarioInput {
  text: string;
  source: "description" | "admin_paste";
  userId?: string | null;
  replyStyle?: ReplyStyle;
}
```

**Step 3: Update prompt to accept style**

Add to system prompt: a section that adapts word count and tone based on `replyStyle`. Concise = 80–120 words, direct. Thorough = 150–200 words, more context. Questioning = 120–160 words, ends with thought-provoking questions.

**Step 4: Pass style through tool**

```typescript
// src/lib/ai/tools/extract-scenario.ts
const styleGuidance = {
  concise: "80–120 words. Direct, punchy. No filler.",
  thorough: "150–200 words. More context, explain the reasoning.",
  questioning: "120–160 words. End with 1–2 thought-provoking questions about their plan."
};
```

**Step 5: Update schema to capture style**

No schema changes needed — style affects prompt, not output shape.

**Step 6: Commit**

```bash
git add src/lib/ai/prompts/extract-scenario.ts src/lib/ai/tools/extract-scenario.ts src/lib/ai/types.ts
git commit -m "feat: add reply style variants (concise, thorough, questioning)"
```

---

## Task 3: Two-Pass Pipeline — Reply with Calculated Numbers

**Files:**
- Create: `src/lib/ai/prompts/generate-reply.ts`
- Create: `src/lib/ai/tools/generate-reply.ts`
- Modify: `app/api/extract-scenario/route.ts`
- Modify: `src/lib/ai/types.ts`

**Step 1: Create reply generation prompt**

```typescript
// src/lib/ai/prompts/generate-reply.ts
export const GENERATE_REPLY_SYSTEM_PROMPT = `You write Reddit replies for a FIRE calculator. You are given:
1. The original post text
2. A calculated FIRE summary (portfolio, expenses, WR, years to FI, etc.)
3. Assumptions the operator made

Write a specific, personalized reply that references actual calculated numbers. Be observational, not prescriptive.

Rules:
- Reference specific numbers from the FIRE summary
- If isAlreadyFi is true, say "the math says you're already there — the hesitation isn't financial"
- If yearsToFire is provided, reference it
- Mention the withdrawal rate vs safer rate gap if notable (>0.5pp)
- NEVER give advice, predictions, or product recommendations
- Match the requested style (concise/thorough/questioning)

Tone: Reddit-casual, first person, use contractions, short paragraphs.`;
```

**Step 2: Create reply generation tool**

```typescript
// src/lib/ai/tools/generate-reply.ts
export async function generateReply(params: {
  originalText: string;
  fireSummary: FireSummary;
  assumptions: AssumptionLog[];
  style: ReplyStyle;
  shareUrl: string;
}): Promise<{ body: string; assumptionsLine: string }>
```

Uses a smaller model (Sonnet instead of Opus) since the scenario is already built. ~$0.01 per call.

**Step 3: Update route to use two-pass**

After step 7 (parseScenario), add:
```typescript
const fireSummary = calculateFireSummary(validated);
const replyWithNumbers = await generateReply({
  originalText: body.text,
  fireSummary,
  assumptions: extraction.extraction.assumptions,
  style: body.replyStyle ?? "thorough",
  shareUrl,
});
```

Use the AI-generated replyDraft as fallback if `generateReply` fails.

**Step 4: Update request schema to accept style**

```typescript
const requestSchema = z.object({
  text: z.string().trim().min(20).max(50_000),
  source: z.enum(["admin_paste", "description"]).default("admin_paste"),
  replyStyle: z.enum(["concise", "thorough", "questioning"]).optional(),
});
```

**Step 5: Commit**

```bash
git add src/lib/ai/prompts/generate-reply.ts src/lib/ai/tools/generate-reply.ts app/api/extract-scenario/route.ts
git commit -m "feat: two-pass pipeline — calculate then generate reply with real numbers"
```

---

## Task 4: Add FIRE Math Summary to Admin UI

**Files:**
- Modify: `src/components/admin/scenario-from-text.tsx`
- Modify: `src/components/admin/scenario-from-text.tsx` (ResultPanel)

**Step 1: Add FireSummaryCard component**

```tsx
function FireSummaryCard({ summary }: { summary: FireSummary }) {
  return (
    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
        FIRE Math
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
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
      </div>
      {summary.isAlreadyFi && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
          Portfolio covers expenses at the safer withdrawal rate.
        </p>
      )}
    </div>
  );
}
```

**Step 2: Add to ExtractApiResponse type**

```typescript
interface ExtractApiResponse {
  scenario: Scenario;
  confidence: "high" | "medium" | "low";
  notes?: string;
  replyDraft: { ... };
  shareUrl: string;
  fireSummary: FireSummary;
}
```

**Step 3: Update ResultPanel to show FIRE summary**

Insert `<FireSummaryCard summary={data.fireSummary} />` between the notes and the reply draft.

**Step 4: Update route to return fireSummary**

Add `fireSummary: calculateFireSummary(validated)` to the response.

**Step 5: Commit**

```bash
git add src/components/admin/scenario-from-text.tsx app/api/extract-scenario/route.ts
git commit -m "feat: show FIRE math summary in admin review panel"
```

---

## Task 5: Add Reply Style Selector to Admin UI

**Files:**
- Modify: `src/components/admin/scenario-from-text.tsx`

**Step 1: Add state for reply style**

```typescript
const [replyStyle, setReplyStyle] = useState<ReplyStyle>("thorough");
```

**Step 2: Add style selector in PastePanel**

```tsx
<div className="flex items-center gap-2">
  <span className="text-sm text-gray-600">Reply style:</span>
  <select 
    value={replyStyle} 
    onChange={(e) => setReplyStyle(e.target.value as ReplyStyle)}
    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
  >
    <option value="concise">Concise (80–120 words)</option>
    <option value="thorough">Thorough (150–200 words)</option>
    <option value="questioning">Questioning (ends with questions)</option>
  </select>
</div>
```

**Step 3: Pass style in API request**

```typescript
body: JSON.stringify({ text: trimmed, source: "admin_paste", replyStyle }),
```

**Step 4: Add "Regenerate" button in ResultPanel**

Add a button that re-calls the API with the same text but different style.

**Step 5: Commit**

```bash
git add src/components/admin/scenario-from-text.tsx
git commit -m "feat: add reply style selector and regenerate button to admin UI"
```

---

## Task 6: Add Reddit-Style Preview

**Files:**
- Modify: `src/components/admin/scenario-from-text.tsx`

**Step 1: Create RedditPreview component**

```tsx
function RedditPreview({ replyText }: { replyText: string }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-orange-500" />
        <div>
          <div className="text-sm font-medium">u/JarlanBot</div>
          <div className="text-xs text-gray-500">just now</div>
        </div>
      </div>
      <div className="text-sm whitespace-pre-wrap leading-relaxed">
        {replyText}
      </div>
      <div className="mt-3 flex gap-2 text-xs text-gray-500">
        <span>↑ Vote</span>
        <span>Reply</span>
        <span>Share</span>
        <span>Save</span>
      </div>
    </div>
  );
}
```

**Step 2: Add to ReplyDraftPanel**

Show the Reddit preview below the editable textarea, with a toggle "Show Reddit preview".

**Step 3: Commit**

```bash
git add src/components/admin/scenario-from-text.tsx
git commit -m "feat: add Reddit-style preview for reply draft"
```

---

## Task 7: Add Posted Reply Tracking

**Files:**
- Create: `src/lib/admin/posted-replies.ts`
- Create: `supabase/migrations/20260426000000_posted_replies.sql`
- Modify: `src/components/admin/scenario-from-text.tsx`
- Modify: `app/api/extract-scenario/route.ts`

**Step 1: Create migration**

```sql
-- supabase/migrations/20260426000000_posted_replies.sql
CREATE TABLE public.posted_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  extraction_id UUID,
  subreddit TEXT,
  post_url TEXT,
  reply_body TEXT NOT NULL,
  share_url TEXT NOT NULL,
  extraction_confidence TEXT,
  reply_style TEXT,
  word_count INTEGER,
  posted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.posted_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert their own posted replies"
  ON public.posted_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (operator_id = auth.uid());

CREATE POLICY "Admins can view all posted replies"
  ON public.posted_replies
  FOR SELECT
  TO authenticated
  USING (true);
```

**Step 2: Create server-side logging function**

```typescript
// src/lib/admin/posted-replies.ts
export async function logPostedReply(params: {
  operatorId: string;
  subreddit?: string;
  postUrl?: string;
  replyBody: string;
  shareUrl: string;
  extractionConfidence?: string;
  replyStyle?: string;
  wordCount: number;
}): Promise<void>
```

**Step 3: Add "Mark as posted" button to UI**

In ResultPanel, add a button that opens a small modal asking for subreddit + post URL (optional), then logs the posted reply.

**Step 4: Add posted replies list page**

Create `app/admin/posted-replies/page.tsx` — table showing all posted replies with click counts from `share_links`.

**Step 5: Commit**

```bash
git add src/lib/admin/posted-replies.ts supabase/migrations/20260426000000_posted_replies.sql app/admin/posted-replies/page.tsx
git commit -m "feat: add posted reply tracking with subreddit and click analytics"
```

---

## Task 8: Add Subreddit-Aware Tone (Optional Input)

**Files:**
- Modify: `src/lib/ai/prompts/generate-reply.ts`
- Modify: `src/lib/ai/tools/generate-reply.ts`
- Modify: `app/api/extract-scenario/route.ts`
- Modify: `src/components/admin/scenario-from-text.tsx`

**Step 1: Add subreddit to request schema**

```typescript
subreddit: z.string().max(50).optional(),
```

**Step 2: Add subreddit tone map**

```typescript
const SUBREDDIT_TONES: Record<string, string> = {
  "fatFIRE": "Direct, numbers-heavy, assumes sophistication. No hand-holding.",
  "leanfire": "Efficiency-focused, spending optimization, community-minded.",
  "personalfinance": "Beginner-friendly, more explanatory, educational tone.",
  "financialindependence": "Balanced, community-savvy, references 4% rule naturally.",
};
```

**Step 3: Add subreddit input to UI**

Optional text field next to the style selector: "r/ (optional)".

**Step 4: Commit**

```bash
git add src/lib/ai/prompts/generate-reply.ts src/lib/ai/tools/generate-reply.ts app/api/extract-scenario/route.ts src/components/admin/scenario-from-text.tsx
git commit -m "feat: add subreddit-aware tone for Reddit replies"
```

---

## Task 9: Run Full Test Suite

**Step 1: Run all tests**

```bash
cd /home/claw/.openclaw/workspace/developer/jarlan
npm test
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Fix any failures**

Address test or type failures.

**Step 4: Final commit**

```bash
git commit -m "chore: verify all tests pass after Reddit feature improvements"
```

---

## Rollout Order

1. Task 1: FIRE summary calculator (foundation)
2. Task 2: Reply style variants (prompt change)
3. Task 3: Two-pass pipeline (the big quality upgrade)
4. Task 4: FIRE math in admin UI (uses Task 1)
5. Task 5: Style selector in UI (uses Task 2)
6. Task 6: Reddit preview (UI polish)
7. Task 7: Posted reply tracking (analytics)
8. Task 8: Subreddit tone (optional)
9. Task 9: Verification
