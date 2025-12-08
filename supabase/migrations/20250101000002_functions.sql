-- ═══════════════════════════════════════════════════════════════════════════════
-- FlowTrade QuoteFlow AI - Database Functions
-- Utility functions for quotes, numbering, and calculations
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE TIMESTAMPS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON customer_properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_items_updated_at
    BEFORE UPDATE ON quote_line_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formulas_updated_at
    BEFORE UPDATE ON formula_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON material_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUOTE NUMBER GENERATION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_quote_number(org_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    quote_count INTEGER;
    quote_num TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Count existing quotes for this org this year
    SELECT COUNT(*) + 1 INTO quote_count
    FROM quotes
    WHERE org_id = org_uuid
    AND EXTRACT(YEAR FROM created_at) = current_year;
    
    -- Format: Q-2025-001
    quote_num := 'Q-' || current_year || '-' || LPAD(quote_count::TEXT, 3, '0');
    
    RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- JOB NUMBER GENERATION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_job_number(org_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    job_count INTEGER;
    job_num TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Count existing jobs for this org this year
    SELECT COUNT(*) + 1 INTO job_count
    FROM jobs
    WHERE org_id = org_uuid
    AND EXTRACT(YEAR FROM created_at) = current_year;
    
    -- Format: J-2025-001
    job_num := 'J-' || current_year || '-' || LPAD(job_count::TEXT, 3, '0');
    
    RETURN job_num;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUOTE TOTALS CALCULATION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_quote_totals(quote_uuid UUID)
RETURNS VOID AS $$
DECLARE
    calc_subtotal DECIMAL(12,2);
    calc_total_cost DECIMAL(12,2);
    calc_gst DECIMAL(12,2);
    calc_total DECIMAL(12,2);
    calc_margin DECIMAL(5,2);
    quote_discount_type VARCHAR(20);
    quote_discount_value DECIMAL(10,2);
    calc_discount DECIMAL(12,2);
BEGIN
    -- Calculate subtotal from line items
    SELECT 
        COALESCE(SUM(line_total), 0),
        COALESCE(SUM(line_cost), 0)
    INTO calc_subtotal, calc_total_cost
    FROM quote_line_items
    WHERE quote_id = quote_uuid;
    
    -- Get discount info
    SELECT discount_type, discount_value
    INTO quote_discount_type, quote_discount_value
    FROM quotes
    WHERE id = quote_uuid;
    
    -- Calculate discount
    IF quote_discount_type = 'percentage' AND quote_discount_value IS NOT NULL THEN
        calc_discount := calc_subtotal * (quote_discount_value / 100);
    ELSIF quote_discount_type = 'fixed' AND quote_discount_value IS NOT NULL THEN
        calc_discount := quote_discount_value;
    ELSE
        calc_discount := 0;
    END IF;
    
    -- Calculate GST (10% Australian GST on subtotal minus discount)
    calc_gst := (calc_subtotal - calc_discount) * 0.10;
    
    -- Calculate total
    calc_total := calc_subtotal - calc_discount + calc_gst;
    
    -- Calculate gross margin percentage
    IF calc_subtotal > 0 THEN
        calc_margin := ((calc_subtotal - calc_total_cost) / calc_subtotal) * 100;
    ELSE
        calc_margin := 0;
    END IF;
    
    -- Update quote
    UPDATE quotes
    SET 
        subtotal = calc_subtotal,
        total_cost = calc_total_cost,
        discount_amount = calc_discount,
        gst_amount = calc_gst,
        total = calc_total,
        gross_margin_percent = calc_margin,
        updated_at = NOW()
    WHERE id = quote_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate totals when line items change
CREATE OR REPLACE FUNCTION trigger_recalculate_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_quote_totals(OLD.quote_id);
        RETURN OLD;
    ELSE
        PERFORM calculate_quote_totals(NEW.quote_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_quote_on_line_item_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_line_items
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_quote_totals();

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE JOB FROM ACCEPTED QUOTE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_job_from_quote(quote_uuid UUID)
RETURNS UUID AS $$
DECLARE
    new_job_id UUID;
    quote_record RECORD;
BEGIN
    -- Get quote details
    SELECT * INTO quote_record FROM quotes WHERE id = quote_uuid;
    
    -- Create job
    INSERT INTO jobs (
        org_id,
        quote_id,
        customer_id,
        property_id,
        job_number,
        status,
        quoted_total
    ) VALUES (
        quote_record.org_id,
        quote_uuid,
        quote_record.customer_id,
        quote_record.property_id,
        generate_job_number(quote_record.org_id),
        'scheduled',
        quote_record.total
    )
    RETURNING id INTO new_job_id;
    
    RETURN new_job_id;
END;
$$ LANGUAGE plpgsql;
