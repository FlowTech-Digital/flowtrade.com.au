-- ═══════════════════════════════════════════════════════════════════════════════
-- FlowTrade QuoteFlow AI - Row Level Security Policies
-- Multi-tenant isolation: Users can only access their organization's data
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Get current user's org_id
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Users can read their own organization
CREATE POLICY "org_select_own" ON organizations
    FOR SELECT
    USING (id = get_user_org_id());

-- Owners can update their organization
CREATE POLICY "org_update_owner" ON organizations
    FOR UPDATE
    USING (id = get_user_org_id())
    WITH CHECK (id = get_user_org_id());

-- Allow insert during signup (no org yet)
CREATE POLICY "org_insert_signup" ON organizations
    FOR INSERT
    WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════════
-- USERS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Users can see members of their organization
CREATE POLICY "users_select_org" ON users
    FOR SELECT
    USING (org_id = get_user_org_id());

-- Users can update their own profile
CREATE POLICY "users_update_self" ON users
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Allow insert during signup
CREATE POLICY "users_insert_signup" ON users
    FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- CUSTOMERS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "customers_select_org" ON customers
    FOR SELECT
    USING (org_id = get_user_org_id());

CREATE POLICY "customers_insert_org" ON customers
    FOR INSERT
    WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "customers_update_org" ON customers
    FOR UPDATE
    USING (org_id = get_user_org_id())
    WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "customers_delete_org" ON customers
    FOR DELETE
    USING (org_id = get_user_org_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- CUSTOMER PROPERTIES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "properties_select_org" ON customer_properties
    FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE org_id = get_user_org_id()
        )
    );

CREATE POLICY "properties_insert_org" ON customer_properties
    FOR INSERT
    WITH CHECK (
        customer_id IN (
            SELECT id FROM customers WHERE org_id = get_user_org_id()
        )
    );

CREATE POLICY "properties_update_org" ON customer_properties
    FOR UPDATE
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE org_id = get_user_org_id()
        )
    );

CREATE POLICY "properties_delete_org" ON customer_properties
    FOR DELETE
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE org_id = get_user_org_id()
        )
    );

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUOTES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "quotes_select_org" ON quotes
    FOR SELECT
    USING (org_id = get_user_org_id());

CREATE POLICY "quotes_insert_org" ON quotes
    FOR INSERT
    WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "quotes_update_org" ON quotes
    FOR UPDATE
    USING (org_id = get_user_org_id())
    WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "quotes_delete_org" ON quotes
    FOR DELETE
    USING (org_id = get_user_org_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUOTE LINE ITEMS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "line_items_select_org" ON quote_line_items
    FOR SELECT
    USING (
        quote_id IN (
            SELECT id FROM quotes WHERE org_id = get_user_org_id()
        )
    );

CREATE POLICY "line_items_insert_org" ON quote_line_items
    FOR INSERT
    WITH CHECK (
        quote_id IN (
            SELECT id FROM quotes WHERE org_id = get_user_org_id()
        )
    );

CREATE POLICY "line_items_update_org" ON quote_line_items
    FOR UPDATE
    USING (
        quote_id IN (
            SELECT id FROM quotes WHERE org_id = get_user_org_id()
        )
    );

CREATE POLICY "line_items_delete_org" ON quote_line_items
    FOR DELETE
    USING (
        quote_id IN (
            SELECT id FROM quotes WHERE org_id = get_user_org_id()
        )
    );

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUOTE EVENTS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "events_select_org" ON quote_events
    FOR SELECT
    USING (
        quote_id IN (
            SELECT id FROM quotes WHERE org_id = get_user_org_id()
        )
    );

CREATE POLICY "events_insert_org" ON quote_events
    FOR INSERT
    WITH CHECK (
        quote_id IN (
            SELECT id FROM quotes WHERE org_id = get_user_org_id()
        )
    );

-- ═══════════════════════════════════════════════════════════════════════════════
-- FORMULA TEMPLATES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- System templates (org_id IS NULL) readable by all authenticated users
-- Org-specific templates only visible to that org
CREATE POLICY "formulas_select" ON formula_templates
    FOR SELECT
    USING (
        is_system = TRUE 
        OR org_id = get_user_org_id()
    );

CREATE POLICY "formulas_insert_org" ON formula_templates
    FOR INSERT
    WITH CHECK (
        org_id = get_user_org_id()
        AND is_system = FALSE
    );

CREATE POLICY "formulas_update_org" ON formula_templates
    FOR UPDATE
    USING (
        org_id = get_user_org_id()
        AND is_system = FALSE
    );

-- ═══════════════════════════════════════════════════════════════════════════════
-- MATERIAL CATALOG POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- System materials (org_id IS NULL) readable by all
-- Org-specific materials only visible to that org
CREATE POLICY "materials_select" ON material_catalog
    FOR SELECT
    USING (
        org_id IS NULL 
        OR org_id = get_user_org_id()
    );

CREATE POLICY "materials_insert_org" ON material_catalog
    FOR INSERT
    WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "materials_update_org" ON material_catalog
    FOR UPDATE
    USING (org_id = get_user_org_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- JOBS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "jobs_select_org" ON jobs
    FOR SELECT
    USING (org_id = get_user_org_id());

CREATE POLICY "jobs_insert_org" ON jobs
    FOR INSERT
    WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "jobs_update_org" ON jobs
    FOR UPDATE
    USING (org_id = get_user_org_id())
    WITH CHECK (org_id = get_user_org_id());
