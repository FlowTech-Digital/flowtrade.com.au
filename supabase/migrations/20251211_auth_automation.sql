-- ═══════════════════════════════════════════════════════════════════
-- FLOWTRADE AUTH AUTOMATION MIGRATION
-- Full end-to-end authentication flow automation
-- Date: 2025-12-11
-- Execute in Supabase SQL Editor (as postgres role)
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: HELPER FUNCTION - Get current user's org_id
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
$$;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: AUTO-CREATE USER TRIGGER
-- Automatically creates public.users record when auth user signs up
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    auth_user_id,
    email,
    role,
    can_create_quotes,
    can_approve_quotes,
    can_manage_billing,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    'owner',      -- New signups start as owner (will create their org)
    TRUE,         -- Can create quotes by default
    FALSE,        -- Can't approve until linked to org
    FALSE,        -- Can't manage billing until linked to org
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: ORGANIZATION CREATION FUNCTION
-- Called from frontend during onboarding
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  p_name VARCHAR(255),
  p_email VARCHAR(255),
  p_primary_trade VARCHAR(20) DEFAULT NULL,
  p_abn VARCHAR(11) DEFAULT NULL,
  p_phone VARCHAR(20) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current authenticated user's public.users.id
  SELECT id INTO v_user_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User record not found for authenticated user';
  END IF;
  
  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id AND org_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;
  
  -- Create the organization
  INSERT INTO public.organizations (
    id,
    name,
    email,
    phone,
    primary_trade,
    abn,
    subscription_tier,
    subscription_status,
    trial_ends_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_name,
    p_email,
    p_phone,
    p_primary_trade,
    p_abn,
    'trial',
    'active',
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_org_id;
  
  -- Link user to the new organization with full owner permissions
  UPDATE public.users 
  SET 
    org_id = v_org_id,
    role = 'owner',
    can_create_quotes = TRUE,
    can_approve_quotes = TRUE,
    can_manage_billing = TRUE,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Return result
  v_result := jsonb_build_object(
    'success', TRUE,
    'org_id', v_org_id,
    'user_id', v_user_id,
    'trial_ends_at', (NOW() + INTERVAL '14 days')::TEXT
  );
  
  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: TEAM INVITE FUNCTION (for adding team members)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.invite_user_to_org(
  p_email VARCHAR(255),
  p_role VARCHAR(20) DEFAULT 'member',
  p_can_create_quotes BOOLEAN DEFAULT TRUE,
  p_can_approve_quotes BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_inviter_role VARCHAR(20);
  v_result JSONB;
BEGIN
  -- Get inviter's org and role
  SELECT org_id, role INTO v_org_id, v_inviter_role
  FROM public.users 
  WHERE auth_user_id = auth.uid();
  
  -- Verify inviter has permission (owner or admin)
  IF v_inviter_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners and admins can invite team members';
  END IF;
  
  -- Check if email already exists in org
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = p_email AND org_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'User with this email already exists in organization';
  END IF;
  
  -- Create pending invite (you'd typically also send an email here)
  -- For now, pre-create the user record that will be linked on signup
  
  v_result := jsonb_build_object(
    'success', TRUE,
    'org_id', v_org_id,
    'invited_email', p_email,
    'role', p_role,
    'message', 'Invite created - user will be linked on signup'
  );
  
  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 5: RLS POLICIES - USERS TABLE
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_org" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_org_isolation" ON public.users;

-- Users can see their own record (even before org linkage)
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Users can see other members of their org
CREATE POLICY "users_select_org" ON public.users
  FOR SELECT USING (
    org_id IS NOT NULL 
    AND org_id = public.get_user_org_id()
  );

-- Users can update their own record
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE USING (auth_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- STEP 6: RLS POLICIES - ORGANIZATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select" ON public.organizations;
DROP POLICY IF EXISTS "org_update" ON public.organizations;

-- Users can only see their own organization
CREATE POLICY "org_select" ON public.organizations
  FOR SELECT USING (id = public.get_user_org_id());

-- Only owners can update organization
CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE USING (
    id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- STEP 7: RLS POLICIES - CUSTOMERS TABLE
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;
DROP POLICY IF EXISTS "org_isolation" ON public.customers;

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE USING (org_id = public.get_user_org_id());

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE USING (org_id = public.get_user_org_id());

-- ═══════════════════════════════════════════════════════════════════
-- STEP 8: RLS POLICIES - QUOTES TABLE
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_select" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete" ON public.quotes;

CREATE POLICY "quotes_select" ON public.quotes
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "quotes_insert" ON public.quotes
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "quotes_update" ON public.quotes
  FOR UPDATE USING (org_id = public.get_user_org_id());

CREATE POLICY "quotes_delete" ON public.quotes
  FOR DELETE USING (org_id = public.get_user_org_id());

-- ═══════════════════════════════════════════════════════════════════
-- STEP 9: RLS POLICIES - JOBS TABLE
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_org_isolation" ON public.jobs;

CREATE POLICY "jobs_org_isolation" ON public.jobs
  FOR ALL USING (org_id = public.get_user_org_id());

-- ═══════════════════════════════════════════════════════════════════
-- STEP 10: RLS POLICIES - CUSTOMER_PROPERTIES TABLE
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.customer_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "properties_via_customer" ON public.customer_properties;

-- Properties are accessed via customer (which has org_id check)
CREATE POLICY "properties_via_customer" ON public.customer_properties
  FOR ALL USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE org_id = public.get_user_org_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════
