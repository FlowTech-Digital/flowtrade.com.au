import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Create Supabase client inside handler (edge runtime requires this)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;
  
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Rate limiting
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { token } = await params;
  const supabase = getSupabaseClient();

  try {
    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'quote')
      .single();

    if (tokenError || !tokenData) {
      console.error('Token lookup error:', tokenError);
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'expired', message: 'This link has expired' },
        { status: 410 }
      );
    }

    // Check if token is revoked
    if (tokenData.is_revoked) {
      return NextResponse.json(
        { error: 'revoked', message: 'This link is no longer valid' },
        { status: 410 }
      );
    }

    // Fetch quote with items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        issue_date,
        valid_until,
        subtotal,
        gst,
        total,
        notes,
        terms,
        quote_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          total
        )
      `)
      .eq('id', tokenData.resource_id)
      .single();

    if (quoteError || !quote) {
      console.error('Quote lookup error:', quoteError);
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Fetch customer - using correct field names (first_name, last_name)
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, email')
      .eq('id', tokenData.customer_id)
      .single();

    // Build customer name from available fields
    const customerWithName = customer ? {
      ...customer,
      name: customer.company_name || 
            [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
            'Customer'
    } : null;

    // Fetch organization
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, email, phone, address, logo_url, abn')
      .eq('id', tokenData.org_id)
      .single();

    // Log access (non-blocking, don't fail if this errors)
    try {
      await supabase.from('portal_access_logs').insert({
        token_id: tokenData.id,
        ip_address: ip,
        user_agent: request.headers.get('user-agent'),
        action: 'view_quote'
      });
    } catch (logError) {
      console.error('Access log error (non-fatal):', logError);
    }

    // Update token access stats (non-blocking)
    try {
      await supabase
        .from('portal_tokens')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: (tokenData.access_count || 0) + 1
        })
        .eq('id', tokenData.id);
    } catch (updateError) {
      console.error('Token update error (non-fatal):', updateError);
    }

    return NextResponse.json({
      quote: {
        ...quote,
        items: quote.quote_line_items
      },
      customer: customerWithName,
      organization
    });

  } catch (error) {
    console.error('Portal quote error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'An error occurred' },
      { status: 500 }
    );
  }
}
