# Admin growth tool — Phase 1 recap

**Status:** Shipped. Admin-only at `/admin/scenario-from-text`.
**Architecture doc:** [ai-chat-architecture.md](ai-chat-architecture.md)
**Followups list:** [admin-tool-followups.md](admin-tool-followups.md)

What this doc captures: what got built in Phase 1, the load-bearing decisions and what we learned from each, and where the work goes from here. Reads bottom-up: skim *What's next* first if that's what you're here for.

---

## What got built

End-to-end admin pipeline for converting a pasted forum/Reddit post into a draft FIRE scenario plus a Reddit-postable reply with a short share URL.

Surfaces:
- **`/admin/scenario-from-text`** — server-gated by `requireAdmin()`, hidden 404 for everyone else. Operator pastes text → reviews extracted scenario, assumption log, and reply body → copies the assembled reply.
- **`Admin` chip in the header** — shown only to admins; non-admins never see the route exists.
- **`/s/abc123` short links** — backed by `share_links` table; recipient hit redirects to `/?scenario=...` for client-side scenario hydration.

Server-side pipeline (`POST /api/extract-scenario`):
1. `requireAdmin` → 401/403 for non-admins
2. Per-user rate limit (10/min)
3. Zod-validated input
4. `extractScenario()` — Claude Opus 4.7 with adaptive thinking + `effort: "high"` + structured output, producing scenario draft + assumption log + reply body
5. `logAiCall()` — `ai_calls` audit table (success or failure, with token / cost / duration)
6. `buildScenarioFromExtraction()` — flat draft → full Scenario, with server-side default-assumption logging
7. `parseScenario()` gate — non-negotiable per CLAUDE.md
8. `logAdminExtraction()` — `admin_extractions` audit row
9. `createShortLink()` — short URL stored in `share_links`; falls back to long compressed-in-URL form if Supabase unavailable
10. Returns `{ scenario, confidence, notes, replyDraft, shareUrl }`

UI: review screen leads with the Reddit reply (editable textarea, word count, copy button), then the extracted scenario summary, then the assumption log, then the share URL (separately, in case the operator wants just the URL).

---

## Decisions that held up

**Tool-use architecture: AI proposes, server validates.** Every scenario the AI produces goes through `parseScenario` + invariants before reaching the user. The "AI never does math" rule from CLAUDE.md has been the right north star — we never had to debug bad math because the math layer didn't change. Future phases inherit this.

**Structured output via Zod + `client.messages.parse()`.** Schema validation client-side, no JSON parsing edge cases, type-safe end to end. Empty `body` is the model's "decline to draft" signal — gracefully handled.

**Audit logging from day one.** `ai_calls` and `admin_extractions` were Phase 0 work. By Phase 1 they were just there. Once we start spending real money on Anthropic calls, this is what tells us whether costs are sane.

**Short URL service by default.** The first end-to-end test produced a ~3KB share URL pasted in a Reddit reply — looked auto-generated and would have killed clickthroughs. Catching this on the first real test (rather than after launch) was lucky; the fix took ~30 minutes because the data model was already supporting it.

**Server-side default-assumption logging.** The model interprets "log every assumption" as "log every field I populated" — so null returns silently inherit calculator defaults. The mapper now flags every default-source field explicitly so the operator sees, e.g., "state defaulted to CA because not stated" rather than "state: CA" with no warning.

**Admin role via `app_metadata.role = 'admin'`** (no UI to grant). Set manually in Supabase. Adequate for one operator. Not worth building a role system until we have more than one admin.

---

## Decisions we changed

**The reply was originally fully AI-generated, including the share link and disclosure.** That gave the model freedom to drift on parts that should never vary — and it did. The model produced "(I built this — free, no signup, **nothing saved**)" as a disclosure, which was factually wrong (the short-link service persists scenarios server-side). We split:

- **AI generates**: acknowledgment + analysis (the "body") + optional 1-line assumption-verification flag
- **Server hardcodes**: share-line wrap, the URL, and the disclosure (`assembleReplyMessage()` in `reply-template.ts`)

This is the principle: trust the model on **content** (what to say about the OP), not on **structure and boilerplate** (how to wrap and frame). They're different concerns. About 30 lines of structural rules came out of the prompt as a result, freeing model attention for the analysis — the load-bearing part.

---

## What we learned about prompting

**Specific examples beat rules.** The single most useful section of the prompt is "Calibrating analysis quality" — concrete examples of what generic vs. specific analysis looks like for FIRE situations. The hard rules ("NO advice", "NO products") matter for safety; the calibration examples drive *quality*.

**Don't accrete edge-case rules.** The temptation is real: every test surfaces a thing the model could have done better, and the easy fix is "add a rule." We resisted this for at least two cases (family-pressure cues, real-estate income) — the model picks most of these up naturally without instructions, and rules for specific situations make the model rule-bound and less natural overall.

**Hard rules earn their place.** "NO financial / tax advice", "NO predicted outcomes", "NO specific products" stay because they're the legal/safety boundary. Tone calibration (phrase blocklist + DOs) stays because it generalizes across all replies. Specific-situation guidance ("watch for family pressure") doesn't earn its place because each situation that warrants its own rule opens the door to dozens more.

**Word count caps are negotiable; structure isn't.** Once we hardcoded the boilerplate, the body shrank from "150–250 word reply" to "120–200 word body" — and the model just adapted. If you're not happy with reply length, change the cap. If you're not happy with quality, change the calibration examples or the analysis-section guidance.

---

## Operational

- **Cost per extraction**: ~$0.02–0.04 on Opus 4.7 (input ~3K tokens, output ~700 tokens, no caching benefit because each input is different). Cache hits are minimal in this workflow because every paste is unique.
- **Latency**: 5–15 seconds per extraction in practice.
- **Audit tables**: `ai_calls` (every API call) and `admin_extractions` (every paste) are populated automatically. View counts on `share_links` rows tell us which links got clicked.

Manual operator step (one-time, post-merge): apply migrations
- `supabase/migrations/20260425000000_ai_calls.sql`
- `supabase/migrations/20260425000100_admin_extractions.sql`
- `supabase/migrations/20260425200000_share_links.sql`
- Set `app_metadata.role = 'admin'` on the operator account.

---

## What's next

### Immediate

- **Use the tool.** Paste a few real Reddit posts each week, post the replies, and track the short-link `view_count` for click-through rate. The product hypothesis is "thoughtful AI-assisted replies on FIRE subreddits drive clicks." First few real posts will tell us whether that's true.
- **Work the followups list** ([admin-tool-followups.md](admin-tool-followups.md)) once we have a few real-world replies in the bag. Top item: stat-card vs. Sankey savings disagreement on `/accumulation`.

### Phase 2 — public "describe your situation"

Different gate (anyone can use, IP-rate-limited), different audit shape, but reuses the entire extraction pipeline. The only new work is:
- New entry path on the home page next to the quiz
- Public-friendly review screen (different from admin, simpler)
- Polished disclosure that this sends to Anthropic

Estimated 2–3 days. Should not need to touch the system prompt.

### Phase 3 — in-app chat

The big one. SSE streaming, tool-use loop with `propose_scenario_patch` / `run_simulation` / `compare_scenarios`, diff-preview-then-accept, persistent chat sessions in Dexie. ~1–2 weeks.

### Pre-launch checklist

When this goes from "operator only" to "thousands of users" (Phase 2 public flow or Phase 3 chat):

- **Securities lawyer review** of the system prompt, disclosure copy, and any user-facing AI-generated text. This is non-optional. The architecture doc names the four layers of the financial-advice firewall (system prompt rules + tool-use architecture + standing disclaimer + off-ramps), but a lawyer needs to sign off on the actual copy.
- **Cost monitoring**. The `ai_calls` table aggregates everything we need; just need to wire up alerts on daily-spend thresholds.
- **Per-user daily token budgets**. The architecture doc spec'd these; not yet implemented because it's a Phase 3 (in-app chat) concern, not a Phase 1 (admin tool) one.

---

## Files of interest

- **Server-side AI**: [src/lib/ai/](../src/lib/ai/) — client, prompt, tool, schema, audit, mapper, reply template
- **Route handler**: [app/api/extract-scenario/route.ts](../app/api/extract-scenario/route.ts)
- **Admin UI**: [app/admin/scenario-from-text/page.tsx](../app/admin/scenario-from-text/page.tsx) + [src/components/admin/scenario-from-text.tsx](../src/components/admin/scenario-from-text.tsx)
- **Short links**: [src/lib/share/short-link.ts](../src/lib/share/short-link.ts) + [app/s/[shortId]/page.tsx](../app/s/[shortId]/page.tsx)
- **Admin auth**: [src/lib/supabase/admin.ts](../src/lib/supabase/admin.ts) (server) + [src/lib/supabase/admin-browser.ts](../src/lib/supabase/admin-browser.ts) (client)
