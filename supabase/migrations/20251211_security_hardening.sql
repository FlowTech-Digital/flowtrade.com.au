-- ═══════════════════════════════════════════════════════════════════════
-- FLOWTRADE SECURITY HARDENING MIGRATION
-- Date: 2025-12-11
-- Purpose: Fix "mutable search_path" vulnerability on all functions
-- Issue: 12 security warnings in Supabase dashboard
-- Fix: SET search_path = '' on all 11 affected functions
-- ═══════════════════════════════════════════════════════════════════════

-- 4 functions already OK (have search_path set):
-- - create_organization_for_user(varchar, varchar, varchar, varchar, varchar)
-- - get_user_org_id()
-- - handle_new_auth_user()
-- - invite_user_to_org(varchar, varchar, boolean, boolean)

-- 11 functions need fix:

-- 1. calculate_quote_totals(quote_uuid uuid)
ALTER FUNCTION public.calculate_quote_totals(quote_uuid uuid) SET search_path = '';

-- 2. create_job_from_quote(quote_uuid uuid)
ALTER FUNCTION public.create_job_from_quote(quote_uuid uuid) SET search_path = '';

-- 3. create_org_settings()
ALTER FUNCTION public.create_org_settings() SET search_path = '';

-- 4. generate_job_number(org_uuid uuid)
ALTER FUNCTION public.generate_job_number(org_uuid uuid) SET search_path = '';

-- 5. generate_next_invoice_number(p_org_id uuid)
ALTER FUNCTION public.generate_next_invoice_number(p_org_id uuid) SET search_path = '';

-- 6. generate_next_job_number(p_org_id uuid)
ALTER FUNCTION public.generate_next_job_number(p_org_id uuid) SET search_path = '';

-- 7. generate_next_quote_number(p_org_id uuid)
ALTER FUNCTION public.generate_next_quote_number(p_org_id uuid) SET search_path = '';

-- 8. generate_quote_number(org_uuid uuid)
ALTER FUNCTION public.generate_quote_number(org_uuid uuid) SET search_path = '';

-- 9. trigger_recalculate_quote_totals()
ALTER FUNCTION public.trigger_recalculate_quote_totals() SET search_path = '';

-- 10. update_invoice_amount_paid()
ALTER FUNCTION public.update_invoice_amount_paid() SET search_path = '';

-- 11. update_updated_at_column()
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════
-- After running, all 15 functions should show search_path in proconfig
-- Expected: 12 security warnings resolved in Supabase dashboard
