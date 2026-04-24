# Cloud Sync — Design Doc

**Status:** Design only. No implementation yet.  
**Target release:** Pro tier (post-MVP)  
**Schema prereqs:** `ownerId` field in place since v2 ✅

---

## Goal

Let signed-in Pro users access their scenarios on any device. Local-only behavior stays the default — no account required to use the app.

---

## Tech Choice: Supabase

Auth + Postgres + row-level security in one service. Rationale:

- Auth (magic link + Google OAuth) and DB are one vendor, not two
- Row-level security (RLS) enforces `ownerId = auth.uid()` at the DB layer — no app-level auth checks needed on reads/writes
- Realtime subscriptions available if we later want live cross-device sync
- Next.js SDK (`@supabase/ssr`) handles cookie-based sessions cleanly in server components and API routes
- Free tier covers early Pro users; scales to paid plans without migration

---

## Data Model

### Supabase table: `scenarios`

```sql
create table scenarios (
  id           text primary key,          -- Scenario.id (nanoid, already set)
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  data         jsonb not null,            -- full Scenario blob
  schema_ver   int not null default 2,    -- Scenario.version, for future migrations
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Row-level security: users can only touch their own rows
alter table scenarios enable row level security;

create policy "owner access"
  on scenarios for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Fast lookup for "give me all my scenarios"
create index on scenarios (owner_id, updated_at desc);
```

The `data` column is the full `Scenario` JSON. No column-per-field decomposition — the shape evolves with schema versions and keeping it as a blob avoids a migration per field addition.

---

## Auth Flow

```
User clicks "Sign in" (header, Pro page, or sync nudge)
  → Supabase magic link or Google OAuth
  → On success: session cookie set by @supabase/ssr middleware
  → userId available in app as supabase.auth.getUser()

On sign-out:
  → Session cleared, app reverts to local-only mode
  → Local IndexedDB data untouched (scenarios stay on device)
```

No account = no change to current behavior. The `ownerId: null` scenarios in Dexie remain local indefinitely.

---

## Sync Architecture

**Principle: local-first.** Dexie (IndexedDB) is always the write layer. Supabase is the sync target, not the source of truth during a session.

### On sign-in

```
1. Load all local scenarios where ownerId === null
2. Stamp ownerId = userId on each (in Dexie)
3. Upsert all to Supabase (id + owner_id + data + updated_at)
4. Pull any scenarios from Supabase not in local Dexie
   (i.e., created on another device) → insert into Dexie
```

### On scenario save (auto-save, 250ms debounce)

```
Current: Dexie write (unchanged)
Add: if signed in → queue Supabase upsert for this scenario id
```

Use a lightweight write queue (in-memory array + `navigator.sendBeacon` or a `setTimeout` flush) so the Supabase write doesn't block the UI.

### On app load (returning signed-in user)

```
1. Hydrate from Dexie immediately (no latency)
2. In background: fetch updated_at for all user's scenarios from Supabase
3. For any scenario where Supabase.updated_at > Dexie.updatedAt → pull full blob, update Dexie
```

This gives instant load with eventual consistency from other devices.

### On new device (fresh install, sign in)

```
1. Dexie is empty
2. Pull all scenarios from Supabase by owner_id
3. Insert into Dexie
4. App loads normally
```

---

## Conflict Resolution

**Last-write-wins by `updated_at`.** No CRDT, no three-way merge.

Rationale: scenarios are planning documents, not collaborative. The realistic conflict case is "edited on phone, then laptop before sync completed." Last-write-wins is correct behavior — the user's most recent intent wins.

If a conflict is detected at sync time (both Dexie and Supabase have newer `updated_at` than the last known sync point), show a one-time toast:

> "We found a newer version of [Scenario name] from another device. Using the most recently edited version."

No modal, no diff UI — too much friction for a planning tool.

---

## Pro Gating

| Feature | Free | Pro |
|---|---|---|
| Local scenarios | ✅ unlimited | ✅ unlimited |
| Cloud sync | ❌ | ✅ |
| Multi-device access | ❌ | ✅ |
| Scenario history / versions | ❌ | Future |

Gate check: on sign-in, check `profiles.plan` in Supabase. If `free`, show a "Upgrade to Pro to sync" nudge but don't block local use. Never delete local data for free users.

### `profiles` table

```sql
create table profiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  plan     text not null default 'free',   -- 'free' | 'pro'
  email    text,
  created_at timestamptz default now()
);
```

Plan is set server-side (Stripe webhook → update `profiles.plan`). Never trust client-side plan state for access decisions.

---

## Stripe Integration (sketch, not scoped yet)

```
User clicks "Upgrade" → Stripe Checkout session (server-side)
  → On success: Stripe webhook → POST /api/webhooks/stripe
  → Update profiles.plan = 'pro' where id = customer.metadata.userId
  → Redirect to app with success toast
```

Pricing: monthly or annual, TBD. One Pro tier to start — no per-seat, no teams.

---

## Implementation Phases

### Phase 1 — Auth only (~4 hrs)
- Install `@supabase/ssr`, configure middleware for cookie sessions
- Sign-in page / modal (magic link + Google)
- Header shows avatar + "Sign out" when signed in
- No sync yet — just auth plumbing and `profiles` table

### Phase 2 — Sync (~6 hrs)
- `scenarios` table + RLS policies
- Sign-in trigger: stamp `ownerId` on local scenarios, initial upsert to Supabase
- Auto-save hook: queue Supabase upsert on every Dexie write
- App-load background pull: fetch remote `updated_at`, pull stale scenarios
- Conflict toast

### Phase 3 — Pro gating + Stripe (~4 hrs)
- `profiles.plan` check on sign-in
- Stripe Checkout integration
- Webhook handler to flip plan
- "Upgrade to Pro" surfaces in app when sync is attempted by free user

### Phase 4 — Polish (~2 hrs)
- Sync status indicator in header (synced / syncing / offline)
- "Sign in to back up your plan" nudge for local-only users (dismissible)
- Error handling: Supabase unreachable → silent fallback to local, retry on reconnect

---

## Open Questions

1. **Export on downgrade** — if a Pro user cancels, do their cloud scenarios stay readable? Recommendation: yes, read-only pull for 30 days, then local-only. Don't delete.
2. **Anonymous scenarios** — should we support upgrading an anonymous session? Probably not for v1 — just prompt to sign in.
3. **Scenario limit for free tier** — local is unlimited; is there a cloud limit for free? Probably moot since free = local-only.
4. **SSR data fetching** — do we ever server-render scenario data? Currently no (all client-side Dexie). Keep it that way for v1 to avoid session complexity on the server.

---

## Files That Will Change

| File | Change |
|---|---|
| `src/lib/store/use-scenario-store.ts` | Add sync queue flush after Dexie writes |
| `src/lib/domain/types.ts` | `ownerId` already present ✅ |
| `src/lib/domain/migrations.ts` | `ownerId` already in v2 ✅ |
| `src/middleware.ts` | Add Supabase session refresh |
| `src/lib/supabase/` | New: client, server, and sync helpers |
| `src/components/auth/` | New: sign-in modal, avatar menu |
| `src/app/api/webhooks/stripe/` | New: Stripe webhook handler |
