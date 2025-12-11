// FlowTrade Customer Portal Types
// Phase 5.1: Foundation

export type TokenType = 'quote' | 'invoice' | 'job' | 'dashboard';

export interface PortalToken {
  id: string;
  customer_id: string;
  org_id: string;
  token: string;
  token_type: TokenType;
  resource_id: string | null;
  expires_at: string;
  created_at: string;
  last_accessed_at: string | null;
  access_count: number;
  is_revoked: boolean;
}

export interface PortalAccessLog {
  id: string;
  token_id: string;
  accessed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  action: string | null;
}

export interface Payment {
  id: string;
  org_id: string;
  invoice_id: string;
  amount: number;
  payment_method: string | null;
  stripe_payment_id: string | null;
  stripe_session_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paid_at: string | null;
  created_at: string;
}

// Token validation result
export interface TokenValidationResult {
  valid: boolean;
  token_type?: TokenType;
  resource_id?: string;
  customer_id?: string;
  org_id?: string;
  error?: 'expired' | 'revoked' | 'not_found' | 'invalid';
}

// Portal context for components
export interface PortalContext {
  token: string;
  tokenType: TokenType;
  resourceId: string | null;
  customerId: string;
  orgId: string;
  organization: {
    name: string;
    logo_url?: string | null;
    primary_color?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  customer: {
    name: string;
    email: string;
  };
}

// Token generation options
export interface GenerateTokenOptions {
  customerId: string;
  orgId: string;
  tokenType: TokenType;
  resourceId?: string;
  expiresInDays?: number; // Default: 7
}
