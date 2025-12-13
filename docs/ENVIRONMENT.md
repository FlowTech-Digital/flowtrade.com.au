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

## Setting Secrets

```bash
wrangler pages secret put STRIPE_SECRET_KEY --project-name flowtrade-com-au
wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name flowtrade-com-au
wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name flowtrade-com-au
```

## Deployment Notes

Secrets set via Wrangler CLI should be picked up on next deployment.
If secrets aren't propagating, try:
1. Retry deployment from CloudFlare Dashboard → Pages → flowtrade-com-au
2. Or push a new commit to trigger fresh build

Last updated: 2025-12-13T20:28:00+11:00
Deployment trigger: 2025-12-13 20:28 - Secret binding refresh
