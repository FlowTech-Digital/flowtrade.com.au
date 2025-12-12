/**
 * FlowTrade Test Data Fixtures
 * Centralized test constants and data
 */

export const TEST_CREDENTIALS = {
  email: process.env.TEST_EMAIL || 'test-v3@flowtrade.com.au',
  password: process.env.TEST_PASSWORD || 'TestPass123!@#',
  orgId: 'eb6c8bd3-a58d-42e8-950b-51551cbb51ac',
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

export const TEST_JOB = {
  title: 'Automated Test Job',
  description: 'Created by automated testing',
  status: 'pending',
};

export const TEST_INVOICE = {
  due_days: 14,
  gst_rate: 0.1, // 10% GST
};

export const URLS = {
  base: process.env.TEST_URL || 'https://flowtrade.com.au',
  login: '/login',
  dashboard: '/dashboard',
  quotes: '/quotes',
  jobs: '/jobs',
  invoices: '/invoices',
  customers: '/customers',
  settings: '/settings',
};

export const SELECTORS = {
  // Form elements
  emailInput: '[name="email"]',
  passwordInput: '[name="password"]',
  submitButton: 'button[type="submit"]',
  
  // Common UI elements
  errorMessage: '.error-message, [data-testid="error-message"]',
  successToast: '[data-testid="success-toast"], .toast-success',
  loadingSpinner: '[data-testid="loading"], .loading',
  
  // Module-specific
  quoteCard: '[data-testid="quote-card"]',
  jobCard: '[data-testid="job-card"]',
  invoiceCard: '[data-testid="invoice-card"]',
  customerSelect: '[data-testid="customer-select"]',
  statusBadge: '[data-testid="status-badge"]',
  
  // Actions
  downloadPdf: '[data-testid="download-pdf"]',
  sendEmail: '[data-testid="send-email"]',
  convertToJob: '[data-testid="convert-to-job"]',
  generateInvoice: '[data-testid="generate-invoice"]',
};
