# FlowTrade Database Schema

Supabase PostgreSQL database structure and relationships.

## Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Relationships](#relationships)
4. [Row Level Security](#row-level-security)
5. [Migrations](#migrations)

---

## Overview

FlowTrade uses Supabase (PostgreSQL) with Row Level Security enabled on all tables.

### Schema Versioning

Migrations are stored in `supabase/migrations/` and applied in order:

| Migration | Purpose |
|-----------|----------|
| `20250101000000_initial_schema.sql` | Core tables |
| `20250101000001_row_level_security.sql` | RLS policies |
| `20250101000002_functions.sql` | Database functions |
| `20250101000003_seed_formulas.sql` | Seed data |
| `20251211_auth_automation.sql` | Auth triggers |
| `20251211_schema_expansion.sql` | Extended fields |
| `20251211_security_hardening.sql` | Security updates |
| `20251213_portal_tables.sql` | Customer portal |
| `20251213_add_portal_rls_policies.sql` | Portal RLS |

---

## Core Tables

### businesses

Trades business accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Business name |
| abn | text | Australian Business Number |
| email | text | Contact email |
| phone | text | Contact phone |
| address | jsonb | Business address |
| settings | jsonb | Business configuration |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### users

Business users/technicians.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (matches auth.users) |
| business_id | uuid | FK to businesses |
| email | text | User email |
| name | text | Display name |
| role | text | admin, technician, office |
| permissions | jsonb | Role-based permissions |
| created_at | timestamptz | Creation timestamp |

### customers

Business customers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| business_id | uuid | FK to businesses |
| name | text | Customer name |
| email | text | Contact email |
| phone | text | Contact phone |
| address | jsonb | Customer address |
| notes | text | Internal notes |
| created_at | timestamptz | Creation timestamp |

### quotes

Job quotes/estimates.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| business_id | uuid | FK to businesses |
| customer_id | uuid | FK to customers |
| quote_number | text | Display number (e.g., Q-2025-001) |
| status | text | draft, sent, accepted, declined, expired |
| line_items | jsonb | Array of line items |
| subtotal | numeric | Before tax |
| tax | numeric | GST amount |
| total | numeric | Final amount |
| valid_until | date | Expiry date |
| notes | text | Quote notes |
| created_at | timestamptz | Creation timestamp |
| sent_at | timestamptz | When sent to customer |

### jobs

Scheduled/completed work.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| business_id | uuid | FK to businesses |
| customer_id | uuid | FK to customers |
| quote_id | uuid | FK to quotes (optional) |
| assigned_to | uuid | FK to users |
| status | text | scheduled, in_progress, completed, cancelled |
| scheduled_date | date | Job date |
| scheduled_time | time | Start time |
| estimated_duration | interval | Expected duration |
| address | jsonb | Job location |
| description | text | Job details |
| notes | text | Internal notes |
| completed_at | timestamptz | Completion timestamp |

### invoices

Billing records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| business_id | uuid | FK to businesses |
| customer_id | uuid | FK to customers |
| job_id | uuid | FK to jobs |
| invoice_number | text | Display number |
| status | text | draft, sent, paid, overdue |
| line_items | jsonb | Array of line items |
| subtotal | numeric | Before tax |
| tax | numeric | GST amount |
| total | numeric | Final amount |
| due_date | date | Payment due date |
| paid_at | timestamptz | Payment timestamp |

### compliance_items

Licenses and certifications.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| business_id | uuid | FK to businesses |
| user_id | uuid | FK to users (optional) |
| type | text | license, insurance, certification |
| name | text | Item name |
| number | text | License/cert number |
| issuer | text | Issuing authority |
| issue_date | date | When issued |
| expiry_date | date | When expires |
| document_url | text | Uploaded document |
| status | text | valid, expiring, expired |

---

## Relationships

```
businesses
    │
    ├── users (1:many)
    │
    ├── customers (1:many)
    │       │
    │       ├── quotes (1:many)
    │       │       │
    │       │       └── jobs (1:1 optional)
    │       │               │
    │       │               └── invoices (1:1)
    │       │
    │       └── jobs (1:many)
    │
    └── compliance_items (1:many)
            │
            └── users (many:1 optional)
```

---

## Row Level Security

### Policy Pattern

All tables use consistent RLS patterns:

```sql
-- Users can only see their business's data
CREATE POLICY "business_isolation" ON table_name
  FOR ALL
  USING (business_id = get_user_business_id());

-- Customers can only see their own portal data  
CREATE POLICY "customer_portal_access" ON table_name
  FOR SELECT
  USING (customer_id = get_portal_customer_id());
```

### Helper Functions

| Function | Purpose |
|----------|----------|
| `get_user_business_id()` | Returns current user's business ID |
| `get_portal_customer_id()` | Returns portal customer's ID |
| `is_business_admin()` | Checks if user is business admin |

---

## Migrations

### Running Migrations

```bash
# Apply all pending migrations
npx supabase db push

# Create new migration
npx supabase migration new migration_name

# Reset database (development only)
npx supabase db reset
```

### Migration Best Practices

1. Always test locally first
2. Include rollback SQL in comments
3. Never modify applied migrations
4. Use descriptive names with dates

---

## Indexes

Key indexes for performance:

```sql
-- Business isolation (all tables)
CREATE INDEX idx_[table]_business_id ON [table](business_id);

-- Common lookups
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_compliance_expiry ON compliance_items(expiry_date);
```

---

© 2025 FlowTech AI PTY LTD
