import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = rateLimit(`pdf:${ip}`, { interval: 60 * 1000, limit: 10 });
    
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
    if (tokenData.is_revoked || new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired or been revoked' },
        { status: 403 }
      );
    }

    // Fetch invoice to get PDF URL
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, pdf_url')
      .eq('id', tokenData.resource_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Log PDF download
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || 'unknown',
      action: 'download_invoice_pdf'
    });

    // If PDF URL exists, redirect to it
    if (invoice.pdf_url) {
      return NextResponse.redirect(invoice.pdf_url);
    }

    // If no PDF URL, redirect to the main PDF generation endpoint
    // This would need authentication, so we return an error for portal access
    return NextResponse.json(
      { error: 'PDF not available. Please contact the business.' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Invoice PDF download error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
