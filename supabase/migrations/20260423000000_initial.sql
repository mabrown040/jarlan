-- Initial Supabase schema for Calcifer/FIRECALC cloud sync.
--
-- Run once in the Supabase SQL Editor (Dashboard → SQL → New Query).
-- Safe to re-run — every statement is idempotent.

-- ── profiles ────────────────────────────────────────────────────────
-- One row per authenticated user. Created automatically on sign-up via
-- trigger below. Stores Pro plan state + Stripe linkage.

create table if not exists public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text,
  plan                    text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile. Writes happen server-side (webhook
-- or auth trigger) using the service role, which bypasses RLS.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up in Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── scenarios ──────────────────────────────────────────────────────
-- Full Scenario JSON blob per row, one row per (user, scenarioId).
-- See docs/cloud-sync.md for the sync strategy.

create table if not exists public.scenarios (
  id          text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  data        jsonb not null,
  schema_ver  int not null default 2,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists scenarios_owner_updated_idx
  on public.scenarios (owner_id, updated_at desc);

alter table public.scenarios enable row level security;

-- RLS: users can only touch their own rows. This is the entire auth
-- layer for scenario data — no app-level checks needed on reads/writes.
drop policy if exists "scenarios_owner_access" on public.scenarios;
create policy "scenarios_owner_access"
  on public.scenarios for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());


-- ── updated_at trigger ─────────────────────────────────────────────
-- Auto-bump updated_at on every UPDATE. Used by the sync layer to
-- detect newer-on-server vs newer-on-client.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists scenarios_touch_updated_at on public.scenarios;
create trigger scenarios_touch_updated_at
  before update on public.scenarios
  for each row execute function public.touch_updated_at();
