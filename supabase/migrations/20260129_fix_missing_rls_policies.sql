-- ═══════════════════════════════════════════════════════════════════════
-- FLOWTRADE RLS SECURITY FIX
-- Migration: 20260129_fix_missing_rls_policies.sql
-- Date: 2026-01-29
-- Project: flowtrade-quoteflow-ai (cxrjdasltwlpevgnoemz)
-- 
-- SECURITY FIX: Enable RLS on 3 tables missing protection
-- Tables: organization_integrations, webhook_events, trade_default_categories
--
-- ⚠️ MANUAL EXECUTION REQUIRED:
-- Run this SQL in Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 1: ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════

-- Enable RLS on organization_integrations
-- Purpose: Stores integration configs (Xero, Stripe, etc.) per organization
ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on webhook_events
-- Purpose: Audit log of webhook events received per organization
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on trade_default_categories
-- Purpose: Default category templates - may be global (system) or org-specific
ALTER TABLE trade_default_categories ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 2: RLS POLICIES - ORGANIZATION_INTEGRATIONS
-- Pattern: Standard org_id isolation using get_user_org_id()
-- ═══════════════════════════════════════════════════════════════════════

-- View own org integrations
CREATE POLICY "Users can view own org integrations" ON organization_integrations
    FOR SELECT USING (org_id = get_user_org_id());

-- Create integrations in own org
CREATE POLICY "Users can create integrations in own org" ON organization_integrations
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- Update own org integrations
CREATE POLICY "Users can update own org integrations" ON organization_integrations
    FOR UPDATE USING (org_id = get_user_org_id());

-- Delete own org integrations
CREATE POLICY "Users can delete own org integrations" ON organization_integrations
    FOR DELETE USING (org_id = get_user_org_id());

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 3: RLS POLICIES - WEBHOOK_EVENTS
-- Pattern: Standard org_id isolation using get_user_org_id()
-- ═══════════════════════════════════════════════════════════════════════

-- View own org webhook events (audit trail)
CREATE POLICY "Users can view own org webhook events" ON webhook_events
    FOR SELECT USING (org_id = get_user_org_id());

-- Create webhook events in own org (typically done by service role)
CREATE POLICY "Users can create webhook events in own org" ON webhook_events
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- Note: Webhook events should not be updated or deleted by users
-- They are immutable audit records. Service role bypasses RLS if needed.

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 4: RLS POLICIES - TRADE_DEFAULT_CATEGORIES
-- Pattern: Hybrid - system templates (org_id IS NULL) visible to all,
--          custom categories restricted to owning org
-- ═══════════════════════════════════════════════════════════════════════

-- Option A: If table has org_id column (org-specific categories)
-- Uncomment this section if org_id exists:

/*
-- View system categories (org_id IS NULL) OR own org categories
CREATE POLICY "Users can view system or own org categories" ON trade_default_categories
    FOR SELECT USING (org_id IS NULL OR org_id = get_user_org_id());

-- Create categories in own org only
CREATE POLICY "Users can create categories in own org" ON trade_default_categories
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- Update own org categories only (not system)
CREATE POLICY "Users can update own org categories" ON trade_default_categories
    FOR UPDATE USING (org_id = get_user_org_id() AND org_id IS NOT NULL);

-- Delete own org categories only (not system)
CREATE POLICY "Users can delete own org categories" ON trade_default_categories
    FOR DELETE USING (org_id = get_user_org_id() AND org_id IS NOT NULL);
*/

-- Option B: If table is global reference data (no org_id column)
-- This allows all authenticated users to read, but only admins can modify
-- Uncomment this section if no org_id:

-- /*
-- All authenticated users can view categories (reference data)
CREATE POLICY "Authenticated users can view trade categories" ON trade_default_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role manages categories (admin only via dashboard/API)
-- No INSERT/UPDATE/DELETE policies for regular users
-- */

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (Run after applying policies)
-- ═══════════════════════════════════════════════════════════════════════

/*
-- Verify RLS is enabled on all 3 tables:
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('organization_integrations', 'webhook_events', 'trade_default_categories')
AND schemaname = 'public';

-- Verify policies exist:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('organization_integrations', 'webhook_events', 'trade_default_categories')
ORDER BY tablename, policyname;

-- Check table structure (to verify which option to use for trade_default_categories):
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trade_default_categories';
*/

-- ═══════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════
