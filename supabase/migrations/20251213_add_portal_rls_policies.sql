-- ═══════════════════════════════════════════════════════════════════════
-- FlowTrade Portal RLS Policies - Public Access via Valid Tokens
-- Created: 2025-12-13T06:20:00+11:00
-- 
-- ROOT CAUSE: Portal pages return 404/500 because anon key Supabase client
--             cannot access tables with org-based RLS policies.
--             portal_tokens has public access, but related tables don't.
--
-- SOLUTION: Add RLS policies allowing public SELECT on resources
--           when accessed via valid, non-expired, non-revoked portal tokens.
--
-- NOTE: These policies were applied directly to the database.
--       This file serves as documentation for the migration.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. QUOTES - Allow public access via valid quote tokens
CREATE POLICY "Portal can view quotes via valid token" 
ON quotes FOR SELECT
TO public
USING (
  id IN (
    SELECT resource_id FROM portal_tokens 
    WHERE token_type = 'quote' 
    AND is_revoked = false 
    AND expires_at > now()
  )
);

-- 2. INVOICES - Allow public access via valid invoice tokens
CREATE POLICY "Portal can view invoices via valid token" 
ON invoices FOR SELECT
TO public
USING (
  id IN (
    SELECT resource_id FROM portal_tokens 
    WHERE token_type = 'invoice' 
    AND is_revoked = false 
    AND expires_at > now()
  )
);

-- 3. QUOTE_LINE_ITEMS - Allow public access for quotes with valid tokens
CREATE POLICY "Portal can view quote line items via valid token" 
ON quote_line_items FOR SELECT
TO public
USING (
  quote_id IN (
    SELECT resource_id FROM portal_tokens 
    WHERE token_type = 'quote' 
    AND is_revoked = false 
    AND expires_at > now()
  )
);

-- 4. INVOICE_LINE_ITEMS - Allow public access for invoices with valid tokens
CREATE POLICY "Portal can view invoice line items via valid token" 
ON invoice_line_items FOR SELECT
TO public
USING (
  invoice_id IN (
    SELECT resource_id FROM portal_tokens 
    WHERE token_type = 'invoice' 
    AND is_revoked = false 
    AND expires_at > now()
  )
);

-- 5. CUSTOMERS - Allow public access for customers linked to valid tokens
CREATE POLICY "Portal can view customers via valid token" 
ON customers FOR SELECT
TO public
USING (
  id IN (
    SELECT customer_id FROM quotes 
    WHERE id IN (
      SELECT resource_id FROM portal_tokens 
      WHERE token_type = 'quote' 
      AND is_revoked = false 
      AND expires_at > now()
    )
    UNION
    SELECT customer_id FROM invoices 
    WHERE id IN (
      SELECT resource_id FROM portal_tokens 
      WHERE token_type = 'invoice' 
      AND is_revoked = false 
      AND expires_at > now()
    )
  )
);

-- 6. ORGANIZATIONS - Allow public access for orgs linked to valid tokens
CREATE POLICY "Portal can view organizations via valid token" 
ON organizations FOR SELECT
TO public
USING (
  id IN (
    SELECT org_id FROM quotes 
    WHERE id IN (
      SELECT resource_id FROM portal_tokens 
      WHERE token_type = 'quote' 
      AND is_revoked = false 
      AND expires_at > now()
    )
    UNION
    SELECT org_id FROM invoices 
    WHERE id IN (
      SELECT resource_id FROM portal_tokens 
      WHERE token_type = 'invoice' 
      AND is_revoked = false 
      AND expires_at > now()
    )
  )
);

-- 7. PAYMENTS - Allow public access for invoice payments via valid tokens
CREATE POLICY "Portal can view payments via valid token" 
ON payments FOR SELECT
TO public
USING (
  invoice_id IN (
    SELECT resource_id FROM portal_tokens 
    WHERE token_type = 'invoice' 
    AND is_revoked = false 
    AND expires_at > now()
  )
);

-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK (if needed)
-- ═══════════════════════════════════════════════════════════════════════
-- DROP POLICY IF EXISTS "Portal can view quotes via valid token" ON quotes;
-- DROP POLICY IF EXISTS "Portal can view invoices via valid token" ON invoices;
-- DROP POLICY IF EXISTS "Portal can view quote line items via valid token" ON quote_line_items;
-- DROP POLICY IF EXISTS "Portal can view invoice line items via valid token" ON invoice_line_items;
-- DROP POLICY IF EXISTS "Portal can view customers via valid token" ON customers;
-- DROP POLICY IF EXISTS "Portal can view organizations via valid token" ON organizations;
-- DROP POLICY IF EXISTS "Portal can view payments via valid token" ON payments;
