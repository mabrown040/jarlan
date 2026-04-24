# Backend Setup — Supabase + Stripe

One-time setup for cloud sync + Pro subscriptions. The app runs fully
in local-only mode without any of this configured, so you can do this
whenever you're ready to enable accounts.

## 1. Supabase (accounts + cloud sync)

**Create the project:**

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it whatever (e.g., `calcifer-prod`), set a strong DB password, pick a region close to your users
3. Wait ~2 min for provisioning

**Run the schema:**

1. Dashboard → **SQL Editor** → **New Query**
2. Paste the contents of `supabase/migrations/20260423000000_initial.sql`
3. Click **Run**
4. Verify under **Database → Tables** you see `profiles` and `scenarios`

**Configure auth providers:**

- **Magic link** is enabled by default — no config needed.
- **Google OAuth** (optional): Dashboard → **Authentication → Providers → Google → Enable**, then follow Supabase's instructions to create OAuth credentials in Google Cloud Console.

**Copy API keys:**

Dashboard → **Settings → API**. Copy these three values into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  (anon / public)
SUPABASE_SERVICE_ROLE_KEY=eyJ...      (service_role — server-only!)
```

**Configure redirect URLs** (for magic link + OAuth return):

Dashboard → **Authentication → URL Configuration**:
- Site URL: `https://your-domain.com` (or `http://localhost:3000` for dev)
- Redirect URLs: add `http://localhost:3000/auth/callback` and your prod `/auth/callback`

## 2. Stripe (Pro subscriptions)

**Create the product:**

1. [dashboard.stripe.com/products](https://dashboard.stripe.com/products) → **Add product**
2. Name: `Calcifer Pro` (or whatever)
3. Add two recurring prices:
   - Monthly: $12/mo
   - Yearly: $96/yr
4. Save. Copy both **Price IDs** (look like `price_1AbCdE...`).

**Get API keys:**

[dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) — copy the **Publishable key** and **Secret key** (use *test mode* keys for dev).

**Set up the webhook:**

1. [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. URL: `https://your-domain.com/api/webhooks/stripe` (or use [stripe CLI](https://stripe.com/docs/stripe-cli) to forward locally for testing)
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. After creating, reveal the **Signing secret** — you'll paste it as `STRIPE_WEBHOOK_SECRET`.

**Add to `.env.local`:**

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_...
```

## 3. Local testing

```bash
# 1. Copy example env → local env
cp .env.example .env.local
# 2. Fill in the values from steps 1 & 2 above
# 3. Start the dev server
npm run dev
# 4. (Optional) forward Stripe webhooks to localhost for testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 4. Production deploy

Whatever platform you deploy to (Vercel, Netlify, Railway, etc.), set the
same env vars in the platform's environment config. Make sure
`NEXT_PUBLIC_SITE_URL` points at the production domain (used in Stripe
success/cancel URLs and Supabase auth redirects).

## Troubleshooting

- **"Auth provider not configured"** — Env vars missing. Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Magic link email not arriving** — In dev, Supabase uses a shared SMTP with a daily limit. Configure custom SMTP in Dashboard → Authentication → SMTP for reliable delivery.
- **Webhook signature verification fails** — `STRIPE_WEBHOOK_SECRET` must match the endpoint exactly (not the CLI-forwarded one — they're different secrets).
- **"Invalid row-level security policy"** — Re-run the migration SQL; the policies may not have applied cleanly.
