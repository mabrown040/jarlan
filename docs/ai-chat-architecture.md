# AI Chat — Architecture & Implementation Plan

**Status:** Design only. Implementation not started.
**Target release:** Pro tier (with limited free quota for signed-in users)
**Schema prereqs:** v3 → v4 bump (adds `Scenario.meta` for source provenance + assumption log)

---

## Goal

Let users (1) talk to their plan in natural language, (2) edit scenario fields by chatting, (3) run what-ifs on demand, and (4) generate a brand-new scenario from a free-text description of their situation.

A second, internally-facing surface lets the operator (initially manual; eventually a Reddit bot) paste forum/Reddit content and produce a draft scenario plus a shareable link — used as a growth lever to seed prospective users with personalized starting points.

---

## Non-negotiables

These are the invariants the architecture exists to protect. If a change would violate one, escalate.

1. **Every value shown must be true.** The AI never does math. Tools do. The model proposes; the server computes and validates.
2. **Local-first remains the default.** AI chat is opt-in, gated behind clear disclosure, and tier-limited. The base app continues to function with zero AI calls.
3. **Scenarios always pass through `parseScenario` + `assertScenarioInvariants`.** No exceptions for AI-generated drafts.
4. **AI-proposed edits never auto-apply.** Diff preview → user confirms → store update. The user is always the final authority on their plan.
5. **No personalized financial, tax, legal, or investment advice.** The chat is a natural-language interface to the calculator, not an advisor. See [Financial Advice Posture](#financial-advice-posture).

---

## Tier and Access Decisions

| Surface | Who | Quota |
|---|---|---|
| In-app chat | Pro subscribers | Generous daily token budget |
| In-app chat | Signed-in free users | Small daily message budget (teaser) |
| In-app chat | Anonymous users | **Disabled.** Sign-in required. |
| "Describe your situation" onboarding | Anyone (rate-limited per IP) | Single extraction call per session, throttled |
| Admin growth tool | Operator (admin role) only | Unlimited (within audit logging) |

Conversation history is persisted **locally only** (Dexie). No cloud sync of chat history in v1; revisit if users ask for cross-device chat continuity.

---

## User Surfaces

### 1. In-app chat (signed-in users)

A slide-out panel, sibling to the existing Plan Drawer at [src/components/plan-drawer/](../src/components/plan-drawer). Trigger: a chat icon in the header, next to the Plan Drawer trigger pill.

Mobile: full-screen sheet (Vaul, like the existing drawer). Full feature parity with desktop.

Capabilities:
- "Walk me through my plan" → AI summarizes the user's scenario, citing canonical numbers from tool calls.
- "What if I save $500 more per month?" → AI calls `run_simulation` with overrides, returns side-by-side comparison.
- "Change my retirement age to 62" → AI calls `propose_scenario_patch`. User sees diff. User accepts. Store updates.
- "Explain Bengen 1994" → AI references the existing education content and links to [/education/four-percent-rule](../app/(app)/education) rather than freelancing.

### 2. "Describe your situation" onboarding

A third entry path on the home page alongside [the quiz](../app/(app)/quiz) and the planner. User pastes 1-3 paragraphs about their situation. Server runs `extract_scenario_from_text`. User reviews the assumption log on a confirmation screen, edits any fields, and lands in `/accumulation` with the scenario loaded.

This shares the extraction pipeline with the admin growth tool — same prompt, same tool, same validators. The only differences are gating, audit, and what gets persisted server-side.

### 3. Admin growth tool

Route: `/admin/scenario-from-text`. Gated by `app_metadata.role === 'admin'` check (single role, no UI to grant — set manually in Supabase).

Flow: paste raw forum/Reddit text → run extraction → review draft + assumption log → save → receive a shareable link via the existing share infra at [src/lib/share/scenario-url.ts](../src/lib/share/scenario-url.ts).

Audit: every paste + extraction logged to a Supabase table with TTL. Used for QA, learning what assumptions the model gets wrong, and (eventually) training data for a self-hosted classifier if we automate Reddit ingestion.

---

## Architecture: The Tool-Use Loop

The chat is structured as an Anthropic API tool-use loop. The model never returns final answers in plain prose alone — every claim about user numbers comes from a tool call result.

```
┌─────────────┐  user message   ┌─────────────────┐
│   Browser   │────────────────▶│ /api/chat (SSE) │
└─────────────┘                 └────────┬────────┘
       ▲                                 │ Anthropic Messages API
       │                                 │ (streaming, tool_use)
       │                                 ▼
       │                        ┌──────────────────┐
       │  SSE: deltas + tool    │  Claude (Sonnet) │
       │  results + scenario    │   tool-use loop  │
       │  diff previews         └────────┬─────────┘
       │                                 │ tool_use blocks
       │                                 ▼
       │                        ┌──────────────────┐
       └────────────────────────│  Server tools    │
                                │  (deterministic) │
                                └──────────────────┘
                                         │
                                         ▼
                          src/lib/calc, src/lib/sim,
                          src/lib/tax, src/lib/domain,
                          data/*.json
```

**Critical property:** every number in the AI's reply originates in a tool call result. The system prompt forbids the model from computing or estimating numerical values directly.

### Tool API

Small, sharp, server-side. Located in a new directory `src/lib/ai/tools/` with one file per tool. Each tool has a Zod input schema, a typed output, and a unit test.

| Tool | Purpose |
|---|---|
| `propose_scenario_patch({ patch: PartialScenario, rationale: string })` | Server merges patch onto current scenario, runs `parseScenario` + `assertScenarioInvariants`, returns diff and recomputed headline numbers. **Does not apply** — returns a preview the UI shows. |
| `run_simulation({ overrides?: PartialScenario, mode: 'historical' \| 'monte_carlo' })` | Runs deterministic simulation over current scenario (with optional overrides). Returns success rate, percentile bands, and key milestones. Production injects `Math.random`; tests inject `createSeededRng`. |
| `compare_scenarios({ baseline: ScenarioRef, alternatives: ScenarioRef[] })` | Built on `run_simulation`. Returns side-by-side numbers for what-if narration. |
| `extract_scenario_from_text({ text: string, source: 'reddit' \| 'description' \| 'manual' })` | Structured-output call (Opus). Returns `{ draft: PartialScenario, assumptions: AssumptionLog[], confidence: 'high' \| 'medium' \| 'low' }`. |
| `lookup_data({ dataset: 'state_taxes' \| 'mortality' \| 'aca', key: string })` | Typed read of [data/](../data) JSON files. Keeps the model from hallucinating numbers it could just look up. |
| `get_canonical_constants()` | Returns Bengen WR, schema version, FIRE-type formulas, fee drag default. Anchors the model. |
| `link_education({ topic: string })` | Returns canonical URLs and short summaries for education content already in the app. The model uses this instead of freelancing about Bengen, Trinity, Shiller, etc. |

**Tools the model does NOT get:** raw filesystem access, database access, network calls, code execution, "compute arbitrary expression."

### Self-correction via invariant feedback

When `propose_scenario_patch` fails `assertScenarioInvariants` (e.g., AI proposes savings > take-home), the failure is returned to the model as a tool error with the invariant message. The model revises and retries. This makes the AI self-correcting and reuses the existing safety net described in [CLAUDE.md](../CLAUDE.md).

---

## Domain & Data Extensions

### Schema bump v3 → v4

Add to [src/lib/domain/types.ts](../src/lib/domain/types.ts):

```ts
type ScenarioMeta = {
  source: 'manual' | 'quiz' | 'description' | 'chat' | 'imported';
  sourceText?: string;            // raw input for 'description'/'imported' (capped, redacted in cloud sync)
  assumptionsLog?: AssumptionLog[];
  createdBy?: 'user' | 'ai';      // ai = generated by extraction
  createdByModel?: string;        // e.g. "claude-opus-4-7"
};

type AssumptionLog = {
  field: string;                  // dot-path into Scenario, e.g. "profile.federalEffectiveRate"
  value: unknown;
  reason: string;                 // human-readable rationale
  confidence: 'high' | 'medium' | 'low';
  source: 'derived' | 'default' | 'inferred';
};

interface Scenario {
  // ... existing fields
  meta?: ScenarioMeta;
}
```

Migration in [src/lib/domain/migrations.ts](../src/lib/domain/migrations.ts): `v3_to_v4` is a no-op for existing scenarios (`meta` defaults to `undefined`). Round-trip test added to [migrations.test.ts](../src/lib/domain/__tests__/migrations.test.ts).

Cloud scenarios stored as v3 will arrive without `meta` until re-synced — handled by the migration as the gate per the existing pattern at [src/lib/supabase/sync.ts](../src/lib/supabase/sync.ts).

### Chat session storage (Dexie)

New table `chatSessions` in [src/lib/db/database.ts](../src/lib/db/database.ts), bumping the Dexie schema:

```ts
type StoredChatSession = {
  id: string;                     // nanoid
  scenarioId: string;             // FK to scenarios table
  createdAt: string;
  updatedAt: string;
  title: string;                  // auto-generated from first user message
  messages: ChatMessage[];
  totalTokens: number;            // running cost meter
  modelUsed: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCallRecord[];
  scenarioPatchPreview?: ScenarioDiff;
  scenarioPatchApplied?: { at: string; patch: PartialScenario };
  timestamp: string;
};
```

Local-only in v1. The Dexie schema bump is independent of the Scenario schema bump.

### Admin role

Today auth is binary (signed-in / not). Add `app_metadata.role = 'admin'` in Supabase, set manually for the operator account. Server gate:

```ts
function requireAdmin(user: User): asserts user is AdminUser {
  if (user.app_metadata?.role !== 'admin') {
    throw new ApiError(403, 'admin_required');
  }
}
```

No UI to grant admin. No role hierarchy. Adequate for a tool with one user.

### Audit log table (Supabase)

Mirrors the `stripe_webhook_events` idempotency pattern at [supabase/migrations/](../supabase/migrations).

```sql
create table ai_calls (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  route           text not null,             -- 'chat' | 'extract' | 'admin_extract'
  model           text not null,             -- 'claude-sonnet-4-6' etc.
  input_tokens    int not null,
  output_tokens   int not null,
  cache_read_tokens  int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd        numeric(10, 6) not null,
  duration_ms     int not null,
  tool_calls      jsonb not null default '[]'::jsonb,  -- {name, count}[]
  error           text,
  created_at      timestamptz not null default now()
);

create index on ai_calls (user_id, created_at desc);
create index on ai_calls (route, created_at desc);

alter table ai_calls enable row level security;
-- only service role can read; users never see this table
```

Used for: per-user daily budget enforcement, anomaly detection, cost tracking, regression analysis.

### Admin extraction audit table

```sql
create table admin_extractions (
  id              uuid primary key default gen_random_uuid(),
  operator_id     uuid not null references auth.users(id) on delete cascade,
  source_text     text not null,              -- TTL via cron, see below
  source_type     text not null,              -- 'reddit' | 'forum' | 'manual'
  extracted_scenario_id text references scenarios(id),
  assumption_count int not null,
  created_at      timestamptz not null default now()
);

-- TTL: scheduled cron job clears source_text older than 90 days
alter table admin_extractions enable row level security;
create policy "admin only" on admin_extractions for all
  using (auth.uid() = operator_id and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

---

## Server Plumbing

### `/api/chat` route

First streaming route in the app. Returns Server-Sent Events.

```
POST /api/chat
{
  scenarioId: string,
  sessionId: string,            // client-generated nanoid
  message: string,
  history: ChatMessage[]        // server truncates if too long
}
→ text/event-stream:
  event: token        — model output delta
  event: tool_use     — model invoked a tool
  event: tool_result  — server-side tool result
  event: scenario_diff — preview of a proposed patch
  event: done
  event: error
```

Built on the Anthropic SDK's streaming `messages.stream()` with the tool-use loop running server-side. Each tool call resolves through `src/lib/ai/tools/`, results are appended to the message array, and the loop re-invokes the model until it returns a final answer.

### `/api/extract-scenario` route

Non-streaming. Single Opus call with structured output. Used by the public "describe your situation" flow and (with admin gate) the growth tool.

```
POST /api/extract-scenario
{ text: string, source: 'description' | 'admin_paste' }
→ { draft: PartialScenario, assumptions: AssumptionLog[], confidence: ... }
```

### Models

| Model | Use case | Why |
|---|---|---|
| `claude-sonnet-4-6` | Default chat | Best cost/quality for tool-use loops. Fast tool reasoning. |
| `claude-opus-4-7` | `extract_scenario_from_text` | Complex parsing of unstructured forum text; one-shot, worth the cost. |
| `claude-haiku-4-5` | Suggested follow-up questions, conversation titling | Cheap, low-stakes utilities. |

Model IDs lifted from the env section of [CLAUDE.md](../CLAUDE.md). Use the `claude-api` Skill when implementing — it enforces prompt caching patterns.

### Prompt caching

Aggressive caching of:
- System prompt + tool schemas (rarely change)
- The user's serialized `Scenario` JSON (stable across a turn, often across a session)
- The conversation history prefix

This is the single biggest cost lever. See [Anthropic prompt caching docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching).

### Rate limiting

Extend [src/lib/rate-limit.ts](../src/lib/rate-limit.ts) to support per-user keys (currently per-IP only). Layered limits:

- Per-IP (anti-DOS): 30 chat-route hits/min
- Per-user-per-day messages: 5 (free), 200 (Pro)
- Per-user-per-day tokens: 50K (free), 2M (Pro)
- Per-call max input tokens: 50K (mirrors the 512KB scenario cap spirit)

Daily counters live in `ai_calls` aggregations, not in the in-memory limiter.

### Conversation length cap

Server-side truncation at N turns / M tokens. Older turns are summarized into a single "context summary" tool call result and prepended; raw history beyond the window is dropped from the API call but retained in Dexie.

### Hard caps

- Max input message size: 50KB (text)
- Max conversation length sent to API: 32K tokens (truncated server-side)
- Max paste size for extraction: 50KB
- Max scenario size: 512KB (existing; mirror in chat input)

---

## Privacy, Security & Compliance

### Threat model

| Threat | Mitigation |
|---|---|
| Privacy regression (sending plan to Anthropic) | Opt-in. Clear disclosure on first use. Pro-gated. Footer copy gets a footnote when chat is enabled. |
| Prompt injection from pasted Reddit text | Untrusted text wrapped in `<user_supplied_content>` block. System prompt explicitly tags content as data, not instructions. Structured output → `parseScenario` → invariants. Defense in depth. |
| Hallucinated scenario edits | Tool-use only. Diff preview before any write. Every assumption surfaced in `AssumptionLog`. |
| Cost abuse | Per-user daily budgets, Pro tiering, per-route rate limits, server-side truncation. `ai_calls` table powers anomaly detection. |
| PII in stored chat / pasted forum content | Local-only storage by default. Admin-table source text expires after 90 days. Logs redact `sourceText`. |
| Cross-tenant leak (if multi-admin in future) | RLS on `admin_extractions`, scoped by `operator_id`. |
| Replay / duplicate extraction | Idempotency key in extract route, mirroring the Stripe webhook pattern. |

### Financial advice posture

The AI is an **educational planning assistant**, not an advisor. The firewall has four interlocking layers:

1. **System prompt rules** (immutable per session):
   - Never recommend specific securities, funds, brokers, or institutions.
   - Never give tax advice. For tax decisions, redirect to a CPA.
   - Never use prescriptive "you should." Reframe as math: "Your scenario shows X."
   - When asked for advice, restate as a calculation: "Here's what happens if..."

2. **Tool-use architecture** structurally constrains output. The model can only return what tools compute. The closest thing to "advice" it can produce is a comparison of two scenarios, both with disclaimed inputs.

3. **Standing chat disclaimer**, mirroring the existing footer:
   > For educational purposes only. Not financial, tax, legal, or investment advice. Consult a CPA or fiduciary advisor for personalized guidance.

   Shown on first chat open, and as a persistent chip in the chat header.

4. **Off-ramps for high-risk asks.** Specific topics (Roth conversions, fund selection, asset allocation in retirement, estate planning) have canned redirects baked into the system prompt: "I can show the math both ways. Whether to actually do it depends on factors I can't see — a CPA / fiduciary is the right person."

**Pre-launch checklist:** spend a few hours with a securities lawyer on launch copy, system prompt, and disclaimer placement before the chat opens publicly. The Investment Advisers Act publishers exemption covers educational content of this shape, but the chat interface introduces freeform output and that's where the risk lives.

### Disclosure UX

- First-open modal: "Chat sends your scenario to Anthropic. Conversations are stored on this device only." + opt-in toggle.
- Persistent chip in chat header linking to a "How chat works" page covering: what data is sent, where it's stored, how to delete history, the financial advice disclaimer.
- Settings page entry to wipe local chat history.

---

## Phasing

### Phase 0 — Foundations (1-2 days)

- [ ] Add `ANTHROPIC_API_KEY` to env config + `.env.example` + deploy env
- [ ] Extend [src/lib/rate-limit.ts](../src/lib/rate-limit.ts) for per-user keys
- [ ] Add `ai_calls` Supabase table + migration
- [ ] Add `admin_extractions` Supabase table + migration
- [ ] Add admin role check helper (`requireAdmin`)
- [ ] Set `app_metadata.role = 'admin'` for operator account
- [ ] Bump Scenario schema v3 → v4 (`meta` field) with migration + round-trip test
- [ ] Define `AssumptionLog` type + Zod schema in [src/lib/domain/](../src/lib/domain)

### Phase 1 — Extraction tool + admin growth tool (3-5 days)

- [ ] `src/lib/ai/tools/extract-scenario.ts` — Anthropic SDK client, Opus, structured output, prompt caching
- [ ] `/api/extract-scenario` route (admin-gated variant)
- [ ] `/admin/scenario-from-text` page: paste box → loading → review screen with assumption log → save → shareable link
- [ ] Audit logging to `admin_extractions`
- [ ] Unit tests with fixture Reddit-like inputs
- [ ] No streaming; one POST, one structured response

**Exit criteria:** operator can paste 5 different forum posts, get sensible scenario drafts, and produce shareable URLs. Assumption log surfaces every non-explicit field.

### Phase 2 — Public "describe your situation" (2-3 days)

- [ ] Public `/api/extract-scenario` variant (per-IP rate-limited)
- [ ] New entry path on home page alongside quiz/planner
- [ ] Polished review-and-edit UX for non-experts
- [ ] First-use disclosure for sending text to Anthropic

**Exit criteria:** new user can describe their situation in their own words and land in `/accumulation` with a reasonable scenario, with confidence in what was assumed.

### Phase 3 — In-app chat: edit + sim tools (1-2 weeks)

- [ ] `/api/chat` SSE route + tool-use loop
- [ ] Tools: `propose_scenario_patch`, `run_simulation`, `compare_scenarios`, `lookup_data`, `get_canonical_constants`, `link_education`
- [ ] `chatSessions` Dexie table + schema bump
- [ ] Slide-out chat panel (desktop) / full-screen sheet (mobile)
- [ ] Diff-preview-then-accept flow for scenario patches
- [ ] Streaming token rendering with tool-call indicators
- [ ] Conversation persistence + history panel
- [ ] Disclaimer chip + first-use modal
- [ ] Per-user daily budget enforcement

**Exit criteria:** Pro user can have a 10-turn conversation about their plan including edits and what-ifs, see every change before it lands, and resume the conversation tomorrow.

### Phase 4 — Polish (ongoing)

- [ ] Suggested follow-up questions (Haiku, lazy-loaded)
- [ ] Conversation summarization for long sessions (Sonnet)
- [ ] Cross-session memory ("last time we discussed Coast FIRE")
- [ ] Analytics on common questions → feeds back into Education content priorities
- [ ] Voice input (mobile-first if pursued)
- [ ] Export conversation as a saved "What-if note" attached to the scenario

---

## Open Items

Things deferred from this design pass; revisit before or during the relevant phase.

1. **Reddit bot automation.** Manual paste only in Phases 1-3. Bot ingestion (the eventual growth lever) needs a separate design pass covering: Reddit API ToS, PII handling for non-consenting authors, abuse / spam classifier, outreach mechanism (cold-DMs are likely against ToS).
2. **Cloud sync of chat history.** Off in v1. Revisit if users ask for cross-device chat continuity.
3. **Per-feature kill switch.** Probably worth a `feature_flags` table for chat / extraction so the operator can toggle off in incidents without redeploy. Lightweight; defer to Phase 0.5 if needed.
4. **Conversation export to PDF.** Could pair well with Pro's value prop. Not v1.
5. **Multi-language.** English only at launch. Anthropic models handle other languages well, but the prompt and disclaimer copy need localization first.
6. **Voice input on mobile.** Listed in Phase 4 but unscoped. Probably a thin wrapper around the browser SpeechRecognition API → existing chat flow.
7. **Securities lawyer review.** Not optional before public launch. Schedule before Phase 3 ships to users.

---

## Where to Look

- "How does the existing scenario shape work?" → [src/lib/domain/schema.ts](../src/lib/domain/schema.ts)
- "How are existing API routes structured?" → [app/api/stripe/checkout/route.ts](../app/api/stripe/checkout/route.ts) (rate limiting + auth pattern)
- "How does the existing rate limiter work?" → [src/lib/rate-limit.ts](../src/lib/rate-limit.ts)
- "How does the quiz produce a scenario?" → [src/lib/quiz/fire-type-quiz.ts](../src/lib/quiz/fire-type-quiz.ts) `buildScenarioFromQuizAnswers`
- "How does cloud sync work?" → [src/lib/supabase/sync.ts](../src/lib/supabase/sync.ts) + [docs/cloud-sync.md](cloud-sync.md)
- "How is the share link encoded?" → [src/lib/share/scenario-url.ts](../src/lib/share/scenario-url.ts)
- "Where do invariants live?" → [src/lib/__tests__/accuracy/scenario-invariants.accuracy.ts](../src/lib/__tests__/accuracy/scenario-invariants.accuracy.ts)

---

## Decision log (this doc)

- 2026-04-25: Initial architecture pass. Tier (Pro + small free quota for signed-in users), local-only chat history, manual growth tool first, full mobile parity, financial-advice firewall via system prompt + tools + disclaimer + off-ramps. Phasing prioritizes admin growth tool before public chat.
