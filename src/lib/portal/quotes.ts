import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a portal token for a quote
 */
export async function generateQuotePortalToken(
  quoteId: string,
  customerId: string,
  orgId: string,
  expirationDays: number = 7
): Promise<{ token: string; url: string } | null> {
  const supabase = await createClient();
  
  if (!supabase) {
    console.error('Failed to create Supabase client');
    return null;
  }
  
  // Check if a valid token already exists for this quote
  const { data: existingToken } = await supabase
    .from('portal_tokens')
    .select('token')
    .eq('resource_id', quoteId)
    .eq('token_type', 'quote')
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existingToken) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au';
    return {
      token: existingToken.token,
      url: `${baseUrl}/portal/quote/${existingToken.token}`
    };
  }

  // Generate new token using uuid directly (this function handles its own DB insert)
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  const { error } = await supabase.from('portal_tokens').insert({
    customer_id: customerId,
    org_id: orgId,
    token,
    token_type: 'quote',
    resource_id: quoteId,
    expires_at: expiresAt.toISOString()
  });

  if (error) {
    console.error('Failed to create quote portal token:', error);
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au';
  return {
    token,
    url: `${baseUrl}/portal/quote/${token}`
  };
}

/**
 * Revoke a quote portal token
 */
export async function revokeQuotePortalToken(quoteId: string): Promise<boolean> {
  const supabase = await createClient();
  
  if (!supabase) {
    console.error('Failed to create Supabase client');
    return false;
  }
  
  const { error } = await supabase
    .from('portal_tokens')
    .update({ is_revoked: true })
    .eq('resource_id', quoteId)
    .eq('token_type', 'quote');

  return !error;
}

/**
 * Get portal URL for a quote (generates if needed)
 */
export async function getQuotePortalUrl(
  quoteId: string,
  customerId: string,
  orgId: string
): Promise<string | null> {
  const result = await generateQuotePortalToken(quoteId, customerId, orgId);
  return result?.url || null;
}
