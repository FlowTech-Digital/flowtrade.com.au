# FlowTrade Development Guide

Local development setup and contribution guidelines.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Development Workflow](#development-workflow)
4. [Testing](#testing)
5. [Code Style](#code-style)
6. [Contributing](#contributing)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|----------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Git | 2.30+ | Version control |

### Recommended Tools

| Tool | Purpose |
|------|----------|
| VS Code | Code editor |
| Supabase CLI | Local database |
| Postman | API testing |

### VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer

---

## Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/FlowTech-Digital/flowtrade.com.au.git
cd flowtrade.com.au
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Analytics (optional for dev)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-R3HQCBF6JC
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Local Supabase (Optional)

For full local development with database:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

---

## Development Workflow

### Branch Strategy

| Branch | Purpose |
|--------|----------|
| `main` | Production (auto-deploys) |
| `develop` | Integration branch |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation |

### Creating a Feature

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push and create PR
git push origin feature/my-feature
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Purpose |
|--------|----------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `style:` | Formatting |
| `refactor:` | Code restructure |
| `test:` | Tests |
| `chore:` | Maintenance |

---

## Testing

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── components/    # Component tests
│   ├── hooks/         # Hook tests
│   └── utils/         # Utility tests
└── e2e/               # End-to-end tests
    ├── auth.spec.ts   # Auth flows
    └── quotes.spec.ts # Quote workflows
```

---

## Code Style

### Linting

```bash
# Check for issues
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Formatting

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### TypeScript

```bash
# Type check
npm run type-check
```

### Pre-commit Hooks

Husky runs linting and type-checking before commits.

---

## Contributing

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes with tests
3. Ensure all checks pass:
   - `npm run lint`
   - `npm run type-check`
   - `npm run test`
4. Push and create PR to `develop`
5. Request review
6. Address feedback
7. Merge when approved

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Conventional commit messages
- [ ] PR description explains changes

### Code Review Guidelines

- Focus on logic and architecture
- Suggest improvements constructively
- Approve when satisfied
- Request changes for blocking issues

---

## Troubleshooting

### Common Issues

**Port 3000 in use:**
```bash
npm run dev -- -p 3001
```

**Node modules issues:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Supabase connection errors:**
- Check `.env.local` credentials
- Verify Supabase project is active
- Check network/firewall

**TypeScript errors after pull:**
```bash
npm run type-check
# Fix any type issues
```

---

## Resources

| Resource | Link |
|----------|------|
| Next.js Docs | [nextjs.org/docs](https://nextjs.org/docs) |
| Supabase Docs | [supabase.com/docs](https://supabase.com/docs) |
| Tailwind Docs | [tailwindcss.com/docs](https://tailwindcss.com/docs) |
| TypeScript Handbook | [typescriptlang.org/docs](https://www.typescriptlang.org/docs) |

---

© 2025 FlowTech AI PTY LTD
