-- Audit table for AI API calls (chat + scenario extraction).
--
-- Every call to the Anthropic API is logged here with token counts,
-- estimated cost, and duration. Used for:
--   - Per-user daily budget enforcement (aggregate input_tokens +
--     output_tokens over the trailing 24h before allowing a new call).
--   - Cost tracking and anomaly detection.
--   - Debugging tool-call patterns and regression analysis.
--
-- Service-role only — users never read or write this table directly.
-- See docs/ai-chat-architecture.md for the broader cost-control posture.

create table if not exists public.ai_calls (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  route               text not null,
  model               text not null,
  input_tokens        int not null,
  output_tokens       int not null,
  cache_read_tokens   int not null default 0,
  cache_write_tokens  int not null default 0,
  cost_usd            numeric(10, 6) not null,
  duration_ms         int not null,
  tool_calls          jsonb not null default '[]'::jsonb,
  error               text,
  created_at          timestamptz not null default now()
);

create index if not exists ai_calls_user_id_created_at_idx
  on public.ai_calls (user_id, created_at desc);

create index if not exists ai_calls_route_created_at_idx
  on public.ai_calls (route, created_at desc);

-- No RLS policies — this table is only ever touched by the
-- chat / extraction handlers using the service role, which bypasses
-- RLS by design. Enabling RLS here is a belt-and-suspenders default
-- that ensures any accidental anon-key access returns zero rows.
alter table public.ai_calls enable row level security;
