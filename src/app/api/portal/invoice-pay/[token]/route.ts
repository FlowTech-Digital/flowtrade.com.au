import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Create Supabase client with service role for anonymous portal access
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Let Stripe SDK use its default API version (compatible with installed types)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map&lt;string, { count: number; resetTime: number }>();

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

// Extract first IP from x-forwarded-for header
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',');
    const firstIp = parts[0]?.trim();
    if (firstIp &amp;&amp; /^[\d.:a-fA-F]+$/.test(firstIp)) {
      return firstIp;
    }
  }
  return 'unknown';
}

// Next.js 15 async params type
type Params = { params: Promise&lt;{ token: string }> }

export async function POST(request: NextRequest, { params }: Params): Promise&lt;NextResponse> {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 400 }
      );
    }
    
    // Rate limiting
    const ip = getClientIp(request);
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const supabase = getSupabaseClient();

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
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Check if expired or revoked
    if (tokenData.is_revoked || new Date(tokenData.expires_at) &lt; new Date()) {
      return NextResponse.json(
        { error: 'This link has expired or been revoked' },
        { status: 403 }
      );
    }

    // Fetch invoice with correct customer column names
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (id, first_name, last_name, company_name, email),
        organizations (id, name)
      `)
      .eq('id', tokenData.resource_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice lookup error:', invoiceError);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'This invoice has already been paid' },
        { status: 400 }
      );
    }

    // Check if invoice is cancelled or void
    if (invoice.status === 'cancelled' || invoice.status === 'void') {
      return NextResponse.json(
        { error: 'This invoice is no longer payable' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au';

    // Build customer email from customer data
    const customerEmail = invoice.customers?.email;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Invoice ${invoice.invoice_number}`,
            description: `Payment for services - ${invoice.organizations?.name || 'FlowTrade'}`,
          },
          unit_amount: Math.round(invoice.total * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/portal/invoice/${token}?payment=success`,
      cancel_url: `${baseUrl}/portal/invoice/${token}?payment=cancelled`,
      customer_email: customerEmail,
      metadata: {
        invoice_id: invoice.id,
        org_id: invoice.org_id,
        portal_token: token,
        invoice_number: invoice.invoice_number,
      },
    });

    // Log the payment initiation in portal access logs (fire and forget)
    supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || 'unknown',
      action: 'initiate_payment'
    }).then(({ error }) => {
      if (error) console.error('Access log error (non-fatal):', error);
    });

    // Create pending payment record (fire and forget)
    supabase.from('payments').insert({
      org_id: invoice.org_id,
      invoice_id: invoice.id,
      amount: invoice.total,
      payment_method: 'stripe',
      stripe_session_id: session.id,
      status: 'pending'
    }).then(({ error }) => {
      if (error) console.error('Payment record error (non-fatal):', error);
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
