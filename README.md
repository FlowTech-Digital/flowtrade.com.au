# FlowTrade - Trade Automation, Simplified

[![Deploy](https://github.com/FlowTech-Digital/flowtrade.com.au/actions/workflows/deploy.yml/badge.svg)](https://github.com/FlowTech-Digital/flowtrade.com.au/actions/workflows/deploy.yml)

AI-powered automation platform for Australian trades businesses.

## Overview

FlowTrade streamlines operations for trades businesses with intelligent automation:

- **Smart Quoting** - 75% faster estimates with AI-powered calculations
- **Route Optimization** - 30% reduction in travel time and fuel costs  
- **Compliance** - Automated safety, licensing, and payroll management

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
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |
| Hosting | CloudFlare Pages |
| CI/CD | GitHub Actions |

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
│   ├── migrations/    # Database migrations
│   └── config.toml    # Supabase config
├── public/            # Static assets
├── tests/             # Test files
└── docs/              # Documentation
```

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/USER_GUIDE.md) | End-user features and workflows |
| [Architecture](docs/ARCHITECTURE.md) | System design and data flow |
| [Database Schema](docs/DATABASE_SCHEMA.md) | Supabase tables and relationships |
| [Development](docs/DEVELOPMENT.md) | Local setup and contribution guide |
| [Deployment](docs/DEPLOYMENT.md) | CloudFlare Pages and CI/CD |
| [API Reference](docs/API.md) | API endpoints and usage |
| [Environment](docs/ENVIRONMENT.md) | Environment variables |

## Brand

| Element | Value |
|---------|-------|
| Primary Cyan | `#00D4FF` |
| Secondary Teal | `#00B4D8` |
| Dark Background | `#0A1628` |
| Heading Font | Montserrat |
| Body Font | Inter |

## Analytics

- **GA4 Property ID**: 515655688
- **GA4 Measurement ID**: G-R3HQCBF6JC
- **GA4 Stream ID**: 13106734136

## Part of FlowTech AI

FlowTrade is a division of [FlowTech AI](https://flowtechai.com.au) - Multi-Agent Automation.

---

© 2025 FlowTech AI PTY LTD | ABN: 76689878420
