# FlowTrade Architecture

System design and technical architecture overview.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Data Flow](#data-flow)
5. [Authentication](#authentication)
6. [Security](#security)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CloudFlare Pages                          │
│                    (Static + Edge Functions)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js 14                               │
│                       (App Router)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │ Components  │  │     Server Actions      │  │
│  │  /app/*     │  │  /components│  │    (Data Mutations)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  PostgreSQL │  │    Auth     │  │    Row Level Security   │  │
│  │  Database   │  │   (Magic    │  │       (RLS Policies)    │  │
│  │             │  │    Links)   │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Purpose |
|------------|----------|
| Next.js 14 | React framework with App Router |
| React 18 | UI component library |
| Tailwind CSS | Utility-first styling |
| TypeScript | Type safety |

### Backend

| Technology | Purpose |
|------------|----------|
| Supabase | Backend-as-a-Service |
| PostgreSQL | Relational database |
| Supabase Auth | Authentication |
| Row Level Security | Data access control |

### Infrastructure

| Technology | Purpose |
|------------|----------|
| CloudFlare Pages | Hosting and CDN |
| GitHub Actions | CI/CD pipeline |
| GitHub | Source control |

### Development

| Technology | Purpose |
|------------|----------|
| Vitest | Unit testing |
| Playwright | E2E testing |
| ESLint | Code linting |
| Prettier | Code formatting |

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── (dashboard)/       # Dashboard route group  
│   ├── (marketing)/       # Public marketing pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
│
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   └── features/         # Feature-specific components
│
├── contexts/             # React Context providers
│   └── auth-context.tsx  # Auth state management
│
├── hooks/                # Custom React hooks
│   ├── use-auth.ts       # Auth hook
│   └── use-supabase.ts   # Supabase client hook
│
├── lib/                  # Utility libraries
│   ├── supabase/         # Supabase client configs
│   ├── utils.ts          # General utilities
│   └── constants.ts      # App constants
│
├── providers/            # App-level providers
│   └── providers.tsx     # Combined providers wrapper
│
├── services/             # API service layer
│   ├── quotes.ts         # Quote operations
│   ├── customers.ts      # Customer operations
│   └── jobs.ts           # Job operations
│
└── types/                # TypeScript definitions
    ├── database.ts       # Database types
    └── api.ts            # API types
```

---

## Data Flow

### Read Operations

```
User Action → React Component → Custom Hook → Service Layer → Supabase Client → PostgreSQL
                                                                        │
     ←──────────── Data Response ──────────────────────────────────────┘
```

### Write Operations

```
User Action → Form Component → Server Action → Service Layer → Supabase Client → PostgreSQL
                                                                        │
     ←──────────── Mutation Result ────────────────────────────────────┘
```

### Authentication Flow

```
1. User enters email
2. Supabase sends magic link
3. User clicks link
4. Supabase validates token
5. Session created in browser
6. Auth context updated
7. Protected routes accessible
```

---

## Authentication

### Method

Magic Link authentication via Supabase Auth.

### Session Management

- Sessions stored in browser cookies
- Automatic refresh handling
- Server-side session validation

### Protected Routes

Routes under `(dashboard)` group require authentication.

```typescript
// Middleware checks session
export async function middleware(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.redirect('/login')
  }
}
```

---

## Security

### Row Level Security (RLS)

All database tables protected by RLS policies:

- Users can only access their own data
- Business members access shared business data
- Customers access their portal data only

### Environment Variables

Sensitive credentials stored as environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

### HTTPS

All traffic encrypted via CloudFlare SSL.

### Input Validation

- Client-side form validation
- Server-side data validation
- SQL injection prevention via Supabase client

---

## Scaling Considerations

### Current Architecture

Suitable for small-medium trades businesses (1-50 users).

### Future Scaling

| Concern | Solution |
|---------|----------|
| Database load | Supabase connection pooling, read replicas |
| Static assets | CloudFlare CDN (already in place) |
| API rate limits | Edge caching, request batching |
| Real-time updates | Supabase Realtime subscriptions |

---

© 2025 FlowTech AI PTY LTD
