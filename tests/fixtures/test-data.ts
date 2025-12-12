/**
 * FlowTrade Test Data Fixtures
 * Phase 1: Auth + Supabase Testing
 */

export const TEST_CREDENTIALS = {
  email: process.env.TEST_EMAIL || 'test-v3@flowtrade.com.au',
  password: process.env.TEST_PASSWORD || 'TestPass123!@#',
  orgId: 'eb6c8bd3-a58d-42e8-950b-51551cbb51ac',
  orgName: 'Test Plumbing Co v3',
};

export const TEST_URLS = {
  base: process.env.TEST_URL || 'https://flowtrade.com.au',
  login: '/login',
  signup: '/signup',
  dashboard: '/dashboard',
  quotes: '/quotes',
  jobs: '/jobs',
  invoices: '/invoices',
  customers: '/customers',
  reports: '/reports',
  settings: '/settings',
};

export const TEST_CUSTOMER = {
  name: 'Automated Test Customer',
  email: 'test-customer@example.com',
  phone: '0400 000 000',
  address: '123 Test Street, Sydney NSW 2000',
};

export const TEST_QUOTE_ITEM = {
  description: 'Automated Test Service',
  quantity: 1,
  unit_price: 100.0,
};

export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cxrjdasltwlpevgnoemz.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};
