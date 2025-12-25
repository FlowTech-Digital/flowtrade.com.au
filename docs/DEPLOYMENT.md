# FlowTrade Deployment Guide

CloudFlare Pages deployment and CI/CD pipeline.

## Table of Contents

1. [Overview](#overview)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Environments](#environments)
4. [Manual Deployment](#manual-deployment)
5. [Rollback](#rollback)
6. [Monitoring](#monitoring)

---

## Overview

### Hosting

FlowTrade is hosted on CloudFlare Pages with automatic deployments from GitHub.

### URLs

| Environment | URL |
|-------------|-----|
| Production | [flowtrade.com.au](https://flowtrade.com.au) |
| Preview | [flowtrade-com-au.pages.dev](https://flowtrade-com-au.pages.dev) |

### Stack

- **Build**: OpenNext (Next.js → CloudFlare compatible)
- **Hosting**: CloudFlare Pages
- **CDN**: CloudFlare (automatic)
- **SSL**: CloudFlare (automatic)

---

## CI/CD Pipeline

### Workflow

```
git push to main
      │
      ▼
GitHub Actions triggered
      │
      ▼
┌─────────────────┐
│ Install deps    │
│ npm ci          │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Run linting     │
│ npm run lint    │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Type check      │
│ npm run type-check│
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Run tests       │
│ npm run test    │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Build           │
│ npm run build   │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Deploy to CF    │
│ wrangler pages  │
└─────────────────┘
      │
      ▼
   Live on CloudFlare
```

### GitHub Actions File

Location: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
      - name: Deploy to CloudFlare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .open-next --project-name=flowtrade-com-au
```

---

## Environments

### Production

- **Branch**: `main`
- **URL**: flowtrade.com.au
- **Auto-deploy**: Yes
- **Environment Variables**: Production secrets

### Preview

- **Branch**: Pull requests
- **URL**: `<branch>.flowtrade-com-au.pages.dev`
- **Auto-deploy**: Yes
- **Environment Variables**: Same as production

### Environment Variables

Set in CloudFlare Pages dashboard:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics ID |

---

## Manual Deployment

### Force Rebuild

To trigger a rebuild without code changes:

```bash
# Update trigger file
echo "Rebuild: $(date)" > .cloudflare-rebuild
git add .cloudflare-rebuild
git commit -m "chore: trigger rebuild"
git push
```

### Local Build Test

```bash
# Build locally
npm run build

# Preview build
npm run start
```

### Wrangler Deploy

```bash
# Install wrangler
npm install -g wrangler

# Login to CloudFlare
wrangler login

# Deploy
wrangler pages deploy .open-next --project-name=flowtrade-com-au
```

---

## Rollback

### Via CloudFlare Dashboard

1. Go to CloudFlare Pages dashboard
2. Select "flowtrade-com-au" project
3. Go to "Deployments"
4. Find previous working deployment
5. Click "..." → "Rollback to this deployment"

### Via Git

```bash
# Revert to previous commit
git revert HEAD
git push

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force  # Use with caution
```

---

## Monitoring

### GitHub Actions

Monitor build status at:
- [Actions Tab](https://github.com/FlowTech-Digital/flowtrade.com.au/actions)

### CloudFlare Analytics

View in CloudFlare dashboard:
- Request volume
- Bandwidth usage
- Error rates
- Cache hit ratio

### Google Analytics

- **Property ID**: 515655688
- **Measurement ID**: G-R3HQCBF6JC
- **Dashboard**: [analytics.google.com](https://analytics.google.com)

### Uptime Monitoring

Recommended tools:
- CloudFlare Health Checks (built-in)
- UptimeRobot (free tier)
- Better Uptime (if needed)

---

## Troubleshooting

### Build Failures

**TypeScript errors:**
```bash
npm run type-check
# Fix any errors locally before pushing
```

**Dependency issues:**
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "chore: refresh dependencies"
```

**OpenNext issues:**
- Check `open-next.config.ts`
- Verify Next.js version compatibility
- Check CloudFlare Pages limits

### Deployment Stuck

1. Check GitHub Actions logs
2. Check CloudFlare Pages logs
3. Verify secrets are set correctly
4. Try manual redeploy from dashboard

### Domain Issues

1. Verify DNS records in CloudFlare
2. Check SSL certificate status
3. Purge CloudFlare cache if needed

---

## Security

### Secrets Management

- Never commit secrets to git
- Use GitHub Secrets for CI/CD
- Use CloudFlare environment variables
- Rotate keys periodically

### Required Secrets

| Secret | Where | Purpose |
|--------|-------|----------|
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets | Deploy access |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets | Account identifier |
| `SUPABASE_SERVICE_ROLE_KEY` | CloudFlare | Server-side DB access |

---

© 2025 FlowTech AI PTY LTD
