# FlowTrade Database Migrations

## Automated Migration System

Migrations in this folder are automatically executed via GitHub Actions when pushed to `main`.

## How It Works

1. Create a new `.sql` file in this folder
2. Name it with date prefix: `YYYYMMDD_description.sql`
3. Push to `main` branch
4. GitHub Actions automatically runs the migration

## Manual Trigger

You can also trigger migrations manually:
1. Go to Actions → "Run Database Migration"
2. Click "Run workflow"
3. Optionally specify a specific migration file

## Secret Required

`SUPABASE_DATABASE_URL` must be configured in repository secrets.

Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

## Migration Files

| File | Description | Date |
|------|-------------|------|
| `20251211_auth_automation.sql` | Auth automation: trigger, RLS, functions | 2025-12-11 |

## Verification

After migration, verify with:
```sql
-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Check RLS
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- Check trigger
SELECT tgname FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

## Changelog

- 2025-12-11: Initial auth automation migration
- 2025-12-11: Secret configured, workflow re-triggered
