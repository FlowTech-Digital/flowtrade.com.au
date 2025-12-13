# FlowTrade Environment Configuration

## Required Environment Variables

### Public (set in wrangler.toml)
- `NEXT_PUBLIC_APP_NAME` - App display name
- `NEXT_PUBLIC_APP_URL` - Production URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### Secrets (set via Wrangler CLI)
- `STRIPE_SECRET_KEY` - Stripe secret key for server-side operations
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role for admin operations
- `RESEND_API_KEY` - Email service API key
- `STRIPE_PUBLISHABLE_KEY` - (legacy, use NEXT_PUBLIC version)

## Secrets Status

All 5 secrets verified via `wrangler pages secret list` (2025-12-13T21:10:00+11:00):
- RESEND_API_KEY: ✓ Encrypted
- STRIPE_PUBLISHABLE_KEY: ✓ Encrypted
- STRIPE_SECRET_KEY: ✓ Encrypted
- STRIPE_WEBHOOK_SECRET: ✓ Encrypted
- SUPABASE_SERVICE_ROLE_KEY: ✓ Encrypted

Triggering fresh deployment to bind secrets to runtime.

Last updated: 2025-12-13T21:10:00+11:00
