import { createClient } from '@/lib/supabase/server';
import { generatePortalToken } from './tokens';

/**
 * Generate a portal token for an invoice
 */
export async function generateInvoicePortalToken(
  invoiceId: string,
  customerId: string,
  orgId: string,
  expirationDays: number = 30
): Promise<{ token: string; url: string } | null> {
  const supabase = await createClient();
  
  // Check if a valid token already exists for this invoice
  const { data: existingToken } = await supabase
    .from('portal_tokens')
    .select('token')
    .eq('resource_id', invoiceId)
    .eq('token_type', 'invoice')
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existingToken) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au';
    return {
      token: existingToken.token,
      url: `${baseUrl}/portal/invoice/${existingToken.token}`
    };
  }

  // Generate new token
  const token = generatePortalToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  const { error } = await supabase.from('portal_tokens').insert({
    customer_id: customerId,
    org_id: orgId,
    token,
    token_type: 'invoice',
    resource_id: invoiceId,
    expires_at: expiresAt.toISOString()
  });

  if (error) {
    console.error('Failed to create invoice portal token:', error);
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au';
  return {
    token,
    url: `${baseUrl}/portal/invoice/${token}`
  };
}

/**
 * Revoke an invoice portal token
 */
export async function revokeInvoicePortalToken(invoiceId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('portal_tokens')
    .update({ is_revoked: true })
    .eq('resource_id', invoiceId)
    .eq('token_type', 'invoice');

  return !error;
}

/**
 * Get portal URL for an invoice (generates if needed)
 */
export async function getInvoicePortalUrl(
  invoiceId: string,
  customerId: string,
  orgId: string
): Promise<string | null> {
  const result = await generateInvoicePortalToken(invoiceId, customerId, orgId);
  return result?.url || null;
}
