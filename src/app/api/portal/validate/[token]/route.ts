// FlowTrade Portal Token Validation API
// Phase 5.1: Foundation

import { NextRequest, NextResponse } from 'next/server';
import { validatePortalToken, logPortalAccess } from '@/lib/portal/tokens';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Rate limiting: Simple in-memory store (use Redis in production for scale)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Rate limiting
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate token
    const result = await validatePortalToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: result.error,
          message: getErrorMessage(result.error)
        },
        { status: result.error === 'not_found' ? 404 : 403 }
      );
    }

    // Get organization and customer details for portal context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [orgResult, customerResult] = await Promise.all([
      supabase
        .from('organizations')
        .select('name, logo_url, primary_color, email, phone')
        .eq('id', result.org_id)
        .single(),
      supabase
        .from('customers')
        .select('name, email')
        .eq('id', result.customer_id)
        .single(),
    ]);

    // Log the access
    const tokenRecord = await supabase
      .from('portal_tokens')
      .select('id')
      .eq('token', token)
      .single();

    if (tokenRecord.data) {
      await logPortalAccess(tokenRecord.data.id, ip, userAgent, 'validate');
    }

    return NextResponse.json({
      valid: true,
      token_type: result.token_type,
      resource_id: result.resource_id,
      organization: orgResult.data || { name: 'Unknown' },
      customer: customerResult.data || { name: 'Customer', email: '' },
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'expired':
      return 'This link has expired. Please contact the business for a new link.';
    case 'revoked':
      return 'This link is no longer valid. Please contact the business for assistance.';
    case 'not_found':
      return 'This link was not found. Please check the URL or contact the business.';
    default:
      return 'Unable to access this page. Please contact the business for assistance.';
  }
}
