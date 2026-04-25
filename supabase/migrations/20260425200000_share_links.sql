-- Short-link service for shareable scenarios.
--
-- Used by the admin growth tool (and future user-facing share
-- features) to produce short URLs like /s/abc123 instead of the
-- ~3KB compressed-in-URL share links. The recipient hits the
-- short URL, the server looks up the scenario by short_id, and
-- redirects to /?scenario=... with the scenario hydrated.
--
-- The short_id is the access-control mechanism: 10-character
-- random alphanumeric = ~62^10 (~8e17) entropy, unguessable in
-- practice. RLS allows public SELECT because the link itself is
-- meant to be public — anyone the operator shares it with should
-- be able to load the scenario.
--
-- Inserts go through the service role (chat / extraction handlers
-- with SUPABASE_SERVICE_ROLE_KEY).

create table if not exists public.share_links (
  short_id      text primary key,
  scenario_data jsonb not null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,
  view_count    int not null default 0
);

create index if not exists share_links_created_by_created_at_idx
  on public.share_links (created_by, created_at desc);

alter table public.share_links enable row level security;

-- Public read: knowing the short_id is sufficient. There's nothing
-- in the scenario blob that's PII beyond what the operator chose
-- to share, and the whole point of a share link is "anyone with
-- this URL can view it."
drop policy if exists "share_links_public_read" on public.share_links;
create policy "share_links_public_read"
  on public.share_links for select
  using (true);
