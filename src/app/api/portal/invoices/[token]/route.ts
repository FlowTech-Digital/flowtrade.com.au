import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = rateLimit(ip, {
      interval: 60 * 1000, // 1 minute
      limit: 10,           // 10 requests per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
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
    if (tokenData.is_revoked) {
      return NextResponse.json(
        { error: 'This link has been revoked' },
        { status: 403 }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 403 }
      );
    }

    // Fetch invoice with items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        subtotal,
        gst,
        total,
        notes,
        terms,
        paid_at,
        customers (
          id,
          name,
          email
        ),
        organizations (
          id,
          name,
          email,
          phone,
          address,
          logo_url,
          abn
        ),
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          total
        )
      `)
      .eq('id', tokenData.resource_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Fetch payment history
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_method, status, paid_at, created_at')
      .eq('invoice_id', invoice.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      invoice: {
        ...invoice,
        items: invoice.invoice_items || []
      },
      customer: invoice.customers,
      organization: invoice.organizations,
      payments: payments || []
    });

  } catch (error) {
    console.error('Invoice portal API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
