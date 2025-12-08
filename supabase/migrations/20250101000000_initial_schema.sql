-- ═══════════════════════════════════════════════════════════════════════════════
-- FlowTrade QuoteFlow AI - Initial Database Schema
-- Sprint 1 Week 1 - Foundation
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS & USERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    abn VARCHAR(11), -- Australian Business Number
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    suburb VARCHAR(100),
    state VARCHAR(10), -- NSW, VIC, QLD, etc.
    postcode VARCHAR(10),
    country VARCHAR(2) DEFAULT 'AU',
    
    -- Subscription
    subscription_tier VARCHAR(20) DEFAULT 'trial', -- trial, solo, team, pro
    subscription_status VARCHAR(20) DEFAULT 'active', -- active, cancelled, past_due
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    
    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#2563eb', -- Hex color
    
    -- Trade configuration
    primary_trade VARCHAR(20), -- hvac, electrical, plumbing
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Auth (linked to Supabase Auth)
    auth_user_id UUID UNIQUE, -- Supabase auth.users.id
    email VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'member', -- owner, admin, member
    
    -- Permissions
    can_create_quotes BOOLEAN DEFAULT TRUE,
    can_approve_quotes BOOLEAN DEFAULT FALSE,
    can_manage_billing BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- CUSTOMERS & PROPERTIES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Customer details
    customer_type VARCHAR(20) DEFAULT 'residential', -- residential, commercial
    company_name VARCHAR(255), -- For commercial
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    
    -- Primary address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    suburb VARCHAR(100),
    state VARCHAR(10),
    postcode VARCHAR(10),
    
    -- Metadata
    source VARCHAR(50), -- website, referral, google, etc.
    notes TEXT,
    tags TEXT[], -- Array of tags
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Property details
    property_name VARCHAR(255), -- "Main residence", "Investment property"
    property_type VARCHAR(50), -- house, apartment, commercial, industrial
    
    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    suburb VARCHAR(100) NOT NULL,
    state VARCHAR(10) NOT NULL,
    postcode VARCHAR(10) NOT NULL,
    
    -- Property characteristics
    year_built INTEGER,
    floor_area_sqm DECIMAL(10,2),
    num_bedrooms INTEGER,
    num_bathrooms INTEGER,
    num_stories INTEGER DEFAULT 1,
    
    -- Trade-specific
    existing_hvac_type VARCHAR(50), -- split, ducted, evaporative, none
    electrical_phase VARCHAR(20), -- single, three
    
    -- Notes
    access_notes TEXT, -- "Gate code 1234", "Dog in backyard"
    site_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUOTES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    property_id UUID REFERENCES customer_properties(id),
    created_by UUID REFERENCES users(id),
    
    -- Quote identification
    quote_number VARCHAR(50) NOT NULL, -- "Q-2025-001"
    quote_version INTEGER DEFAULT 1,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', 
    -- draft, sent, viewed, accepted, declined, expired
    
    -- Trade & job type
    trade VARCHAR(20) NOT NULL, -- hvac, electrical, plumbing
    job_type VARCHAR(50), -- installation, repair, maintenance, inspection
    job_description TEXT,
    
    -- Pricing
    subtotal DECIMAL(12,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0, -- 10% GST
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_type VARCHAR(20), -- percentage, fixed
    discount_value DECIMAL(10,2),
    total DECIMAL(12,2) DEFAULT 0,
    
    -- Margins
    total_cost DECIMAL(12,2) DEFAULT 0, -- Sum of line item costs
    gross_margin_percent DECIMAL(5,2), -- Calculated
    
    -- Validity
    valid_until DATE,
    payment_terms VARCHAR(100) DEFAULT 'Due on completion',
    
    -- Delivery
    sent_at TIMESTAMPTZ,
    sent_via VARCHAR(20), -- email, sms, both
    viewed_at TIMESTAMPTZ,
    
    -- Response
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    
    -- Signature
    signature_url VARCHAR(500),
    signed_at TIMESTAMPTZ,
    signed_by_name VARCHAR(255),
    
    -- PDF
    pdf_url VARCHAR(500),
    
    -- Notes
    internal_notes TEXT, -- Not visible to customer
    customer_notes TEXT, -- Visible on quote
    terms_and_conditions TEXT,
    
    -- Follow-up
    follow_up_count INTEGER DEFAULT 0,
    last_follow_up_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quote_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Item details
    item_order INTEGER DEFAULT 0, -- For sorting
    item_type VARCHAR(20) NOT NULL, -- material, labor, equipment, other
    category VARCHAR(50), -- HVAC: refrigerant, ductwork, etc.
    
    -- Description
    description TEXT NOT NULL,
    detailed_notes TEXT, -- Additional details
    
    -- Quantities
    quantity DECIMAL(10,2) DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'each', -- each, hour, meter, sqm, etc.
    
    -- Pricing
    unit_cost DECIMAL(10,2) DEFAULT 0, -- Our cost
    unit_price DECIMAL(10,2) NOT NULL, -- Customer price
    markup_percent DECIMAL(5,2), -- Calculated or manual
    
    -- Totals
    line_total DECIMAL(12,2) NOT NULL, -- quantity * unit_price
    line_cost DECIMAL(12,2), -- quantity * unit_cost
    
    -- Optional: supplier reference
    supplier_name VARCHAR(100),
    supplier_sku VARCHAR(100),
    
    -- Tax
    is_taxable BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote events for tracking (viewed, accepted, etc.)
CREATE TABLE quote_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    
    event_type VARCHAR(30) NOT NULL,
    -- created, sent, viewed, reminder_sent, accepted, declined, expired
    
    event_data JSONB, -- Additional context
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRADE-SPECIFIC: FORMULA TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE formula_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Categorization
    trade VARCHAR(20) NOT NULL, -- hvac, electrical, plumbing
    category VARCHAR(50) NOT NULL, -- installation, repair, sizing
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Formula definition (JSON)
    inputs JSONB NOT NULL, -- Array of input definitions
    formula JSONB NOT NULL, -- Calculation rules
    outputs JSONB NOT NULL, -- Output definitions
    
    -- Defaults
    default_values JSONB, -- Pre-filled defaults
    
    -- Pricing guidance
    labor_rate_per_hour DECIMAL(10,2),
    typical_hours_min DECIMAL(5,2),
    typical_hours_max DECIMAL(5,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT TRUE, -- System template vs org-created
    org_id UUID REFERENCES organizations(id), -- NULL for system templates
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MATERIAL COSTS (SUPPLIER PRICING)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE material_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id), -- NULL for system catalog
    
    -- Product details
    trade VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Identifiers
    sku VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    
    -- Pricing
    unit_cost DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'each',
    default_markup_percent DECIMAL(5,2) DEFAULT 30,
    
    -- Supplier
    supplier_name VARCHAR(100),
    supplier_url VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_price_update TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- JOBS (FROM ACCEPTED QUOTES)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id),
    customer_id UUID REFERENCES customers(id),
    property_id UUID REFERENCES customer_properties(id),
    
    -- Job identification
    job_number VARCHAR(50) NOT NULL, -- "J-2025-001"
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled',
    -- scheduled, in_progress, completed, invoiced, paid
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time_start TIME,
    scheduled_time_end TIME,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    
    -- Financials (copied from quote, may differ)
    quoted_total DECIMAL(12,2),
    actual_total DECIMAL(12,2),
    
    -- Invoicing
    invoice_number VARCHAR(50),
    invoiced_at TIMESTAMPTZ,
    xero_invoice_id VARCHAR(255),
    
    -- Payment
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50),
    
    -- Notes
    job_notes TEXT,
    completion_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Organizations
CREATE INDEX idx_organizations_stripe ON organizations(stripe_customer_id);

-- Users
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_auth ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);

-- Customers
CREATE INDEX idx_customers_org ON customers(org_id);
CREATE INDEX idx_customers_email ON customers(email);

-- Properties
CREATE INDEX idx_properties_customer ON customer_properties(customer_id);

-- Quotes
CREATE INDEX idx_quotes_org ON quotes(org_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX idx_quotes_number ON quotes(quote_number);

-- Line items
CREATE INDEX idx_line_items_quote ON quote_line_items(quote_id);

-- Events
CREATE INDEX idx_quote_events_quote ON quote_events(quote_id);
CREATE INDEX idx_quote_events_created ON quote_events(created_at DESC);

-- Formula templates
CREATE INDEX idx_formulas_trade ON formula_templates(trade);
CREATE INDEX idx_formulas_active ON formula_templates(is_active) WHERE is_active = TRUE;

-- Materials
CREATE INDEX idx_materials_trade ON material_catalog(trade);
CREATE INDEX idx_materials_org ON material_catalog(org_id);

-- Jobs
CREATE INDEX idx_jobs_org ON jobs(org_id);
CREATE INDEX idx_jobs_quote ON jobs(quote_id);
CREATE INDEX idx_jobs_status ON jobs(status);
