# FlowTrade Environment Configuration

## Required Environment Variables

### Public (set in wrangler.toml)
- `NEXT_PUBLIC_APP_NAME` - App display name
- `NEXT_PUBLIC_APP_URL` - Production URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### Secrets (set via CloudFlare API)
- `STRIPE_SECRET_KEY` - Stripe secret key for server-side operations
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role for admin operations

## Setting Secrets

Secrets configured via CloudFlare API (2025-12-13T20:55:00+11:00)

## Deployment Notes

Secrets set via CloudFlare API PATCH to deployment_configs.production.env_vars
Triggering redeploy to apply secret bindings.

Last updated: 2025-12-13T20:55:00+11:00
