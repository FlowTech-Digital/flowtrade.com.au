# FlowTrade — Quote · Schedule · Invoice

[![CI](https://github.com/FlowTech-Digital/flowtrade.com.au/actions/workflows/test.yml/badge.svg)](https://github.com/FlowTech-Digital/flowtrade.com.au/actions/workflows/test.yml)

Job-management software for Australian trades businesses — quoting, scheduling, invoicing and job tracking, from first quote to paid invoice.

## Overview

FlowTrade helps tradies run the day-to-day of the business from their phone:

- **Quoting** — professional, branded quotes in minutes, with templates, photos and material lists.
- **Scheduling** — drag-and-drop job scheduling, team dispatch and real-time status, online or offline.
- **Invoicing** — one-tap quote-to-invoice, Xero/MYOB sync, on-site card payments and automatic reminders.

## Links

| Environment | URL |
|-------------|-----|
| Production | [flowtrade.com.au](https://flowtrade.com.au) |
| Preview | [flowtrade-com-au.pages.dev](https://flowtrade-com-au.pages.dev) |

## Quick Start

```bash
# Clone repository
git clone https://github.com/FlowTech-Digital/flowtrade.com.au.git
cd flowtrade.com.au

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Database | Supabase (PostgreSQL, RLS enforced) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |
| Hosting | CloudFlare Pages (via OpenNext) |
| CI/CD | GitHub Actions |

## Deployment

Production deploys are driven by **CloudFlare Pages Git-integration**: every push to `main`
triggers an OpenNext build (`nodejs_compat`) and deploy of the `flowtrade` Pages project.
Branch pushes produce CloudFlare **preview** deployments for review before merge.

Notes:
- `.github/workflows/deploy.yml` is an intentional empty placeholder — deploys are handled by
  CloudFlare's Git-integration, not by a GitHub Actions deploy job. (`test.yml` runs CI;
  `migrate.yml` runs Supabase migrations.)
- `.redeploy-trigger` and `.cloudflare-rebuild` are no-op marker files; touching one and pushing
  forces CloudFlare to run a fresh build when a content-free rebuild is needed.

## Project Structure

```
flowtrade.com.au/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── contexts/      # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility libraries
│   ├── providers/     # App-level providers
│   ├── services/      # API service layer
│   └── types/         # TypeScript definitions
├── supabase/
│   ├── migrations/    # Database migrations (RLS enforced)
│   └── config.toml    # Supabase config
├── public/            # Static assets
├── tests/             # Test files
└── docs/              # Documentation
```

## Brand (v3.2 — FlowTrade green · v4.1 TRADE mark)

| Element | Value |
|---------|-------|
| Gradient (deep → mid → bright) | `#0A5C3A` → `#00955A` → `#1FC56F` |
| Obsidian (background) | `#0B1114` |
| Ink (cards) | `#1A2230` |
| Slate | `#5B6675` |
| Mist (text on dark) | `#E7ECF2` |
| Wordmark / short caps | Michroma |
| Headings / body / UI | IBM Plex Sans |
| Tagline (LOCKED) | Quote · Schedule · Invoice |

Canonical brand source: FlowTech Group Brand Guideline (v3.2 colour §5, typography §6;
v4-final · TRADE v4.1 logo system).

## Analytics

- **GA4 Property ID**: 515655688
- **GA4 Measurement ID**: G-R3HQCBF6JC
- **GA4 Stream ID**: 13106734136

## Part of FlowTech AI

FlowTrade is a division of [FlowTech AI](https://flowtechai.com.au) — *Intelligence Behind the System*.

---

© 2026 FlowTech AI PTY LTD | ABN: 76689878420
