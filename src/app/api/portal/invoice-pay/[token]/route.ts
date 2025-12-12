import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// Edge runtime (matches working /api/invoices/[id]/route.ts)
export const runtime = 'edge'

// Next.js 15 async params type (route.ts directly in dynamic segment)
type Params = { params: Promise<{ token: string }> }

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
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
    const rateLimitResult = rateLimit(`pay:${ip}`, { interval: 60 * 1000, limit: 10 });
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'invoice')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Check if expired or revoked
    if (tokenData.is_revoked || new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired or been revoked' },
        { status: 403 }
      );
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (id, name, email),
        organizations (id, name)
      `)
      .eq('id', tokenData.resource_id)
      .single();

    if (invoiceError || !invoice) {
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
      customer_email: invoice.customers?.email,
      metadata: {
        invoice_id: invoice.id,
        org_id: invoice.org_id,
        portal_token: token,
        invoice_number: invoice.invoice_number,
      },
    });

    // Log the payment initiation in portal access logs
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || 'unknown',
      action: 'initiate_payment'
    });

    // Create pending payment record
    await supabase.from('payments').insert({
      org_id: invoice.org_id,
      invoice_id: invoice.id,
      amount: invoice.total,
      payment_method: 'stripe',
      stripe_session_id: session.id,
      status: 'pending'
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
