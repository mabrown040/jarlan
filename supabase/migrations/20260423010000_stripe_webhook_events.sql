-- Idempotency table for Stripe webhooks.
--
-- Stripe retries webhook delivery on non-2xx responses (and occasionally
-- on 2xx if the ack is slow). Without dedup, a retry of
-- `checkout.session.completed` would re-apply profile updates, double-
-- process anything we later add (emails, credits, etc.).
--
-- Strategy: insert the event id with `on conflict do nothing` before
-- doing any work. If the insert reports zero rows affected, we've
-- already processed this event and return 200 immediately.

create table if not exists public.stripe_webhook_events (
  event_id     text primary key,
  event_type   text not null,
  received_at  timestamptz not null default now()
);

-- No RLS policies needed — this table is only ever touched by the
-- webhook handler with the service role.
alter table public.stripe_webhook_events enable row level security;
