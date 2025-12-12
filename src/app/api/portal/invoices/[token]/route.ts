import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client inside handler (edge runtime requires this)
// Uses service role to bypass RLS for anonymous portal access
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
    const parts = forwardedFor.split(',');
    const firstIp = parts[0]?.trim();
    if (firstIp && /^[\d.:a-fA-F]+$/.test(firstIp)) {
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
      .eq('token_type', 'invoice')
      .single();

    if (tokenError || !tokenData) {
      console.error('Token lookup error:', tokenError);
      return NextResponse.json(
        { error: 'not_found', message: 'Invoice not found' },
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

    // Fetch invoice with items - using correct column names
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        subtotal,
        gst_amount,
        total,
        notes,
        payment_terms,
        paid_at,
        invoice_line_items (
          id,
          description,
          quantity,
          unit_price,
          line_total
        )
      `)
      .eq('id', tokenData.resource_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice lookup error:', invoiceError);
      return NextResponse.json(
        { error: 'not_found', message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Fetch customer
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

    // Fetch payment history
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_method, status, paid_at, created_at')
      .eq('invoice_id', invoice.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // Log access - fire and forget (only if valid IP)
    if (clientIp) {
      supabase.from('portal_access_logs').insert({
        token_id: tokenData.id,
        ip_address: clientIp,
        user_agent: request.headers.get('user-agent'),
        action: 'view_invoice'
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
    // Map database column names to frontend expected names
    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        gst: invoice.gst_amount,  // Map gst_amount to gst for frontend
        total: invoice.total,
        notes: invoice.notes,
        terms: invoice.payment_terms,  // Map payment_terms to terms for frontend
        paid_at: invoice.paid_at,
        items: (invoice.invoice_line_items || []).map((item: { id: string; description: string; quantity: number; unit_price: number; line_total: number }) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.line_total  // Map line_total to total for frontend
        }))
      },
      customer: customerWithName,
      organization: orgWithAddress,
      payments: payments || []
    });

  } catch (error) {
    console.error('Portal invoice error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'An error occurred' },
      { status: 500 }
    );
  }
}
