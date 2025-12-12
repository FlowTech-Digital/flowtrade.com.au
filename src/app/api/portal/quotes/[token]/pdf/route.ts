import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client inside handler (edge runtime requires this)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
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
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if token is expired or revoked
    if (new Date(tokenData.expires_at) < new Date() || tokenData.is_revoked) {
      return NextResponse.json(
        { error: 'invalid', message: 'This link is no longer valid' },
        { status: 410 }
      );
    }

    // Get quote with PDF URL
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, quote_number, pdf_url')
      .eq('id', tokenData.resource_id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // If no PDF URL, generate one (redirect to PDF generation endpoint)
    if (!quote.pdf_url) {
      // For now, return a message that PDF is not available
      // In production, you would generate the PDF here
      return NextResponse.json(
        { error: 'no_pdf', message: 'PDF not yet generated' },
        { status: 404 }
      );
    }

    // Log the download
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      action: 'download_quote_pdf'
    });

    // Redirect to the PDF URL
    return NextResponse.redirect(quote.pdf_url);

  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'An error occurred' },
      { status: 500 }
    );
  }
}
