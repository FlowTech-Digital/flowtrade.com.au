// FlowTrade Portal Token Utilities
// Phase 5.1: Foundation

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { PortalToken, TokenValidationResult, GenerateTokenOptions, TokenType } from '@/types/portal';

// Use service role client for token operations (bypasses RLS)
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Generate a new portal token
 */
export async function generatePortalToken(options: GenerateTokenOptions): Promise<PortalToken | null> {
  const { customerId, orgId, tokenType, resourceId, expiresInDays = 7 } = options;
  
  const supabase = getServiceClient();
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabase
    .from('portal_tokens')
    .insert({
      customer_id: customerId,
      org_id: orgId,
      token,
      token_type: tokenType,
      resource_id: resourceId || null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error generating portal token:', error);
    return null;
  }

  return data;
}

/**
 * Validate a portal token
 */
export async function validatePortalToken(token: string): Promise<TokenValidationResult> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('portal_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    return { valid: false, error: 'not_found' };
  }

  // Check if revoked
  if (data.is_revoked) {
    return { valid: false, error: 'revoked' };
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'expired' };
  }

  // Update access tracking
  await supabase
    .from('portal_tokens')
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (data.access_count || 0) + 1,
    })
    .eq('id', data.id);

  return {
    valid: true,
    token_type: data.token_type as TokenType,
    resource_id: data.resource_id,
    customer_id: data.customer_id,
    org_id: data.org_id,
  };
}

/**
 * Log portal access
 */
export async function logPortalAccess(
  tokenId: string,
  ipAddress?: string,
  userAgent?: string,
  action?: string
): Promise<void> {
  const supabase = getServiceClient();

  await supabase.from('portal_access_logs').insert({
    token_id: tokenId,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    action: action || null,
  });
}

/**
 * Revoke a portal token
 */
export async function revokePortalToken(tokenId: string): Promise<boolean> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('portal_tokens')
    .update({ is_revoked: true })
    .eq('id', tokenId);

  return !error;
}

/**
 * Regenerate a portal token (revokes old, creates new)
 */
export async function regeneratePortalToken(
  tokenId: string,
  expiresInDays: number = 7
): Promise<PortalToken | null> {
  const supabase = getServiceClient();

  // Get existing token details
  const { data: existingToken, error: fetchError } = await supabase
    .from('portal_tokens')
    .select('*')
    .eq('id', tokenId)
    .single();

  if (fetchError || !existingToken) {
    return null;
  }

  // Revoke old token
  await revokePortalToken(tokenId);

  // Generate new token
  return generatePortalToken({
    customerId: existingToken.customer_id,
    orgId: existingToken.org_id,
    tokenType: existingToken.token_type,
    resourceId: existingToken.resource_id,
    expiresInDays,
  });
}

/**
 * Get portal token by ID
 */
export async function getPortalToken(tokenId: string): Promise<PortalToken | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('portal_tokens')
    .select('*')
    .eq('id', tokenId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get all active tokens for a resource
 */
export async function getTokensForResource(
  resourceId: string,
  tokenType: TokenType
): Promise<PortalToken[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('portal_tokens')
    .select('*')
    .eq('resource_id', resourceId)
    .eq('token_type', tokenType)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString());

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Build portal URL for a token
 */
export function buildPortalUrl(token: string, tokenType: TokenType): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au';
  return `${baseUrl}/portal/${tokenType}/${token}`;
}
