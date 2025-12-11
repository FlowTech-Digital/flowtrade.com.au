-- FlowTrade Customer Portal Tables
-- Phase 5.1: Foundation
-- Created: 2025-12-13

-- Portal access tokens
CREATE TABLE IF NOT EXISTS portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('quote', 'invoice', 'job', 'dashboard')),
  resource_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  is_revoked BOOLEAN DEFAULT FALSE
);

-- Indexes for portal_tokens
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_customer ON portal_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_org ON portal_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_resource ON portal_tokens(resource_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_type ON portal_tokens(token_type);

-- Portal access logs (audit trail)
CREATE TABLE IF NOT EXISTS portal_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES portal_tokens(id) NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  action VARCHAR(50)
);

-- Index for access logs
CREATE INDEX IF NOT EXISTS idx_portal_access_logs_token ON portal_access_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_logs_accessed ON portal_access_logs(accessed_at);

-- Payment records
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method VARCHAR(50),
  stripe_payment_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Enable RLS on all tables
ALTER TABLE portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_tokens
-- Portal routes use service role key for token validation (public access via token)
-- Authenticated users can manage tokens for their org
CREATE POLICY "Users can view their org tokens" ON portal_tokens
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create tokens for their org" ON portal_tokens
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org tokens" ON portal_tokens
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org tokens" ON portal_tokens
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for portal_access_logs
CREATE POLICY "Users can view access logs for their org tokens" ON portal_access_logs
  FOR SELECT USING (
    token_id IN (
      SELECT id FROM portal_tokens WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view their org payments" ON payments
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create payments for their org" ON payments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org payments" ON payments
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Grant service role access for portal routes
-- (Service role bypasses RLS for token validation)
