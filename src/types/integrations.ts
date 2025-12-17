// Phase 6.1: Organization Integration Types
// FlowTrade User Integration Onboarding

export type IntegrationType = 'stripe' | 'resend' | 'xero';

export type IntegrationStatus = 'not_connected' | 'pending' | 'connected' | 'error';

export interface OrganizationIntegration {
  id: string;
  organization_id: string;
  integration_type: IntegrationType;
  status: IntegrationStatus;
  config: IntegrationConfig;
  connected_at: string | null;
  last_verified_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Stripe Connect configuration
export interface StripeConfig {
  stripe_user_id: string; // Connected account ID (acct_xxx)
  account_name?: string;
  livemode: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  default_currency?: string;
}

// Resend email configuration
export interface ResendConfig {
  domain_id: string;
  domain_name: string;
  verified: boolean;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  dns_records?: {
    type: string;
    host: string;
    value: string;
    verified: boolean;
  }[];
}

// Xero accounting configuration (future)
export interface XeroConfig {
  tenant_id: string;
  tenant_name?: string;
  organisation_id?: string;
}

export type IntegrationConfig = StripeConfig | ResendConfig | XeroConfig | Record<string, unknown>;

// API response types
export interface IntegrationSetupResponse {
  success: boolean;
  integration?: OrganizationIntegration;
  redirect_url?: string; // For OAuth flows
  error?: string;
}

export interface IntegrationVerifyResponse {
  success: boolean;
  status: IntegrationStatus;
  details?: Record<string, unknown>;
  error?: string;
}
