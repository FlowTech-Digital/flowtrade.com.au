import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

// Extract first IP from x-forwarded-for header (handles proxy chains)
function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP (original client), remove whitespace
    const firstIp = forwardedFor.split(',')[0].trim();
    // Validate it looks like an IP
    if (/^[\d.:a-fA-F]+$/.test(firstIp)) {
      return firstIp;
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const clientIp = getClientIp(request);
  const rateLimitKey = clientIp || 'unknown';
  
  // Rate limiting
  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Next.js 15 async params
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

    // Fetch quote with items - FIXED: Use correct column names from database schema
    // issue_date → created_at, gst → gst_amount, notes → customer_notes, terms → terms_and_conditions
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        status,
        created_at,
        valid_until,
        subtotal,
        gst_amount,
        total,
        customer_notes,
        terms_and_conditions,
        quote_line_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          line_total
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
      .select('id, name, email, phone, address_line1, address_line2, suburb, state, postcode, logo_url, abn')
      .eq('id', tokenData.org_id)
      .single();

    // Build organization address string
    const orgWithAddress = organization ? {
      ...organization,
      address: [
        organization.address_line1,
        organization.address_line2,
        organization.suburb,
        organization.state,
        organization.postcode
      ].filter(Boolean).join(', ') || null
    } : null;

    // Log access - fire and forget (don't await, don't block response)
    // Only log if we have a valid IP
    if (clientIp) {
      supabase.from('portal_access_logs').insert({
        token_id: tokenData.id,
        ip_address: clientIp,
        user_agent: request.headers.get('user-agent'),
        action: 'view_quote'
      }).then(({ error }) => {
        if (error) console.error('Access log error (non-fatal):', error);
      });
    }

    // Update token access stats - fire and forget
    supabase
      .from('portal_tokens')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: (tokenData.access_count || 0) + 1
      })
      .eq('id', tokenData.id)
      .then(({ error }) => {
        if (error) console.error('Token update error (non-fatal):', error);
      });

    // Transform response to match frontend expected format
    // Frontend expects: issue_date, gst, notes, terms, items[].total
    return NextResponse.json({
      quote: {
        id: quote.id,
        quote_number: quote.quote_number,
        status: quote.status,
        issue_date: quote.created_at,
        valid_until: quote.valid_until,
        subtotal: quote.subtotal,
        gst: quote.gst_amount,
        total: quote.total,
        notes: quote.customer_notes,
        terms: quote.terms_and_conditions,
        items: quote.quote_line_items.map((item: { id: string; description: string; quantity: number; unit: string; unit_price: number; line_total: number }) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.line_total
        }))
      },
      customer: customerWithName,
      organization: orgWithAddress
    });

  } catch (error) {
    console.error('Portal quote error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'An error occurred' },
      { status: 500 }
    );
  }
}
