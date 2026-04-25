-- Audit table for admin-paste scenario extractions.
--
-- The growth tool at /admin/scenario-from-text accepts pasted forum /
-- Reddit content and runs AI extraction to produce a draft Scenario.
-- This table records each paste for QA, learning what assumptions the
-- model gets wrong, and (if we automate Reddit ingestion later) as
-- training-data candidates.
--
-- `source_text` should be cleared after 90 days via a cron sweep —
-- only the extracted_scenario_id reference is preserved indefinitely.

create table if not exists public.admin_extractions (
  id                     uuid primary key default gen_random_uuid(),
  operator_id            uuid not null references auth.users(id) on delete cascade,
  source_text            text not null,
  source_type            text not null,
  extracted_scenario_id  text references public.scenarios(id) on delete set null,
  assumption_count       int not null,
  created_at             timestamptz not null default now()
);

create index if not exists admin_extractions_operator_created_at_idx
  on public.admin_extractions (operator_id, created_at desc);

alter table public.admin_extractions enable row level security;

-- Operator must be the row's operator_id AND have the admin role
-- in their app_metadata claim. The role is a server-set value on
-- the user's auth.users row — clients cannot mutate it through
-- the JS SDK, so this gate is real authorization.
drop policy if exists "admin_extractions_admin_only" on public.admin_extractions;
create policy "admin_extractions_admin_only"
  on public.admin_extractions for all
  using (
    auth.uid() = operator_id
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    auth.uid() = operator_id
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
