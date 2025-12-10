-- ═══════════════════════════════════════════════════════════════════════
-- FLOWTRADE SCHEMA EXPANSION
-- Migration: 20251211_schema_expansion.sql
-- Date: 2025-12-11
-- Description: Add invoicing, payments, job tracking, settings, and templates
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 1: CREATE NEW TABLES
-- ═══════════════════════════════════════════════════════════════════════

-- 1. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    invoice_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void', 'written_off')),
    
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_due DECIMAL(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
    
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    xero_invoice_id TEXT,
    xero_synced_at TIMESTAMPTZ,
    
    payment_terms TEXT DEFAULT 'Due within 14 days',
    notes TEXT,
    footer_text TEXT,
    pdf_url TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(org_id, invoice_number)
);

-- 2. INVOICE LINE ITEMS
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    item_order INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'each',
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    is_taxable BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'eft', 'cheque', 'other')),
    reference TEXT,
    notes TEXT,
    
    xero_payment_id TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. JOB MATERIALS USED
CREATE TABLE IF NOT EXISTS job_materials_used (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    material_id UUID REFERENCES material_catalog(id) ON DELETE SET NULL,
    
    description TEXT NOT NULL,
    quantity_used DECIMAL(10,2) NOT NULL,
    unit TEXT DEFAULT 'each',
    unit_cost DECIMAL(12,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    
    quoted_quantity DECIMAL(10,2),
    variance_quantity DECIMAL(10,2) GENERATED ALWAYS AS (quantity_used - COALESCE(quoted_quantity, quantity_used)) STORED,
    
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. JOB PHOTOS
CREATE TABLE IF NOT EXISTS job_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'during', 'after', 'issue', 'other')),
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    caption TEXT,
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. JOB ACTIVITY LOG
CREATE TABLE IF NOT EXISTS job_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ORG SETTINGS
CREATE TABLE IF NOT EXISTS org_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    
    quote_prefix TEXT DEFAULT 'Q-',
    quote_next_number INTEGER DEFAULT 1001,
    invoice_prefix TEXT DEFAULT 'INV-',
    invoice_next_number INTEGER DEFAULT 1001,
    job_prefix TEXT DEFAULT 'JOB-',
    job_next_number INTEGER DEFAULT 1001,
    
    default_payment_terms TEXT DEFAULT 'Due within 14 days',
    default_quote_validity_days INTEGER DEFAULT 30,
    default_gst_rate DECIMAL(5,2) DEFAULT 10.00,
    
    quote_header_text TEXT,
    quote_footer_text TEXT,
    invoice_header_text TEXT,
    invoice_footer_text TEXT,
    
    xero_tenant_id TEXT,
    xero_connected_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    template_type TEXT NOT NULL CHECK (template_type IN ('quote_send', 'quote_followup', 'quote_accepted', 'invoice_send', 'invoice_reminder', 'payment_receipt', 'job_scheduled', 'job_completed')),
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(org_id, template_type)
);

-- 9. ATTACHMENTS
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    entity_type TEXT NOT NULL CHECK (entity_type IN ('quote', 'job', 'invoice', 'customer', 'property')),
    entity_id UUID NOT NULL,
    
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 2: CREATE INDEXES
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials_used(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_activity_job_id ON job_activity_log(job_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 3: ENABLE RLS
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 4: RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════

-- INVOICES
CREATE POLICY "Users can view own org invoices" ON invoices
    FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can create invoices in own org" ON invoices
    FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can update own org invoices" ON invoices
    FOR UPDATE USING (org_id = get_user_org_id());
CREATE POLICY "Users can delete own org invoices" ON invoices
    FOR DELETE USING (org_id = get_user_org_id());

-- INVOICE LINE ITEMS
CREATE POLICY "Users can manage invoice line items" ON invoice_line_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.org_id = get_user_org_id())
    );

-- PAYMENTS
CREATE POLICY "Users can view own org payments" ON payments
    FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can create payments in own org" ON payments
    FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can update own org payments" ON payments
    FOR UPDATE USING (org_id = get_user_org_id());

-- JOB MATERIALS USED
CREATE POLICY "Users can manage job materials" ON job_materials_used
    FOR ALL USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_materials_used.job_id AND jobs.org_id = get_user_org_id())
    );

-- JOB PHOTOS
CREATE POLICY "Users can manage job photos" ON job_photos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_photos.job_id AND jobs.org_id = get_user_org_id())
    );

-- JOB ACTIVITY LOG
CREATE POLICY "Users can manage job activity" ON job_activity_log
    FOR ALL USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_activity_log.job_id AND jobs.org_id = get_user_org_id())
    );

-- ORG SETTINGS
CREATE POLICY "Users can view own org settings" ON org_settings
    FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can update own org settings" ON org_settings
    FOR UPDATE USING (org_id = get_user_org_id());
CREATE POLICY "Users can insert own org settings" ON org_settings
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- EMAIL TEMPLATES
CREATE POLICY "Users can view own org or system templates" ON email_templates
    FOR SELECT USING (org_id = get_user_org_id() OR org_id IS NULL);
CREATE POLICY "Users can manage own org templates" ON email_templates
    FOR ALL USING (org_id = get_user_org_id() AND is_system = false);

-- ATTACHMENTS
CREATE POLICY "Users can view own org attachments" ON attachments
    FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can create attachments in own org" ON attachments
    FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can delete own org attachments" ON attachments
    FOR DELETE USING (org_id = get_user_org_id());

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 5: FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update invoice amount_paid when payment added
CREATE OR REPLACE FUNCTION update_invoice_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices 
    SET amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id),
        status = CASE 
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) >= total THEN 'paid'
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) > 0 THEN 'partial'
            ELSE status
        END,
        paid_at = CASE 
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) >= total THEN NOW()
            ELSE NULL
        END
    WHERE id = NEW.invoice_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create org_settings when organization created
CREATE OR REPLACE FUNCTION create_org_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO org_settings (org_id) 
    VALUES (NEW.id)
    ON CONFLICT (org_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate next invoice number
CREATE OR REPLACE FUNCTION generate_next_invoice_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INTEGER;
    v_result TEXT;
BEGIN
    SELECT invoice_prefix, invoice_next_number 
    INTO v_prefix, v_next_num
    FROM org_settings WHERE org_id = p_org_id FOR UPDATE;
    
    IF v_prefix IS NULL THEN
        v_prefix := 'INV-';
        v_next_num := 1001;
        INSERT INTO org_settings (org_id, invoice_prefix, invoice_next_number) 
        VALUES (p_org_id, v_prefix, v_next_num + 1)
        ON CONFLICT (org_id) DO UPDATE SET invoice_next_number = v_next_num + 1;
    ELSE
        UPDATE org_settings SET invoice_next_number = v_next_num + 1 WHERE org_id = p_org_id;
    END IF;
    
    RETURN v_prefix || v_next_num::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate next quote number
CREATE OR REPLACE FUNCTION generate_next_quote_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INTEGER;
BEGIN
    SELECT quote_prefix, quote_next_number 
    INTO v_prefix, v_next_num
    FROM org_settings WHERE org_id = p_org_id FOR UPDATE;
    
    IF v_prefix IS NULL THEN
        v_prefix := 'Q-';
        v_next_num := 1001;
        INSERT INTO org_settings (org_id, quote_prefix, quote_next_number) 
        VALUES (p_org_id, v_prefix, v_next_num + 1)
        ON CONFLICT (org_id) DO UPDATE SET quote_next_number = v_next_num + 1;
    ELSE
        UPDATE org_settings SET quote_next_number = v_next_num + 1 WHERE org_id = p_org_id;
    END IF;
    
    RETURN v_prefix || v_next_num::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate next job number
CREATE OR REPLACE FUNCTION generate_next_job_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INTEGER;
BEGIN
    SELECT job_prefix, job_next_number 
    INTO v_prefix, v_next_num
    FROM org_settings WHERE org_id = p_org_id FOR UPDATE;
    
    IF v_prefix IS NULL THEN
        v_prefix := 'JOB-';
        v_next_num := 1001;
        INSERT INTO org_settings (org_id, job_prefix, job_next_number) 
        VALUES (p_org_id, v_prefix, v_next_num + 1)
        ON CONFLICT (org_id) DO UPDATE SET job_next_number = v_next_num + 1;
    ELSE
        UPDATE org_settings SET job_next_number = v_next_num + 1 WHERE org_id = p_org_id;
    END IF;
    
    RETURN v_prefix || v_next_num::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 6: TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS update_org_settings_updated_at ON org_settings;
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
DROP TRIGGER IF EXISTS on_payment_created ON payments;
DROP TRIGGER IF EXISTS on_organization_created ON organizations;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_org_settings_updated_at BEFORE UPDATE ON org_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_payment_created AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_amount_paid();
CREATE TRIGGER on_organization_created AFTER INSERT ON organizations
    FOR EACH ROW EXECUTE FUNCTION create_org_settings();

-- ═══════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════
