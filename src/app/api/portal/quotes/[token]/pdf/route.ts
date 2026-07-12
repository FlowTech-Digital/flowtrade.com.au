import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { buildQuotePDF } from '@/lib/pdf/server/buildQuotePDF';
import { ORG_PDF_COLUMNS, orgToBusinessInfo } from '@/lib/pdf/server/orgBusinessInfo';

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

    // Get the quote.
    // NOTE: this used to read tokenData.quote_id - a column that does not exist
    // on portal_tokens (the FK is `resource_id`). It resolved to undefined, so
    // this route returned "Quote not found" on EVERY request: the customer's
    // "Download PDF" button in QuotePortalView has never once worked.
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, customer:customers(*)')
      .eq('id', tokenData.resource_id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Get line items
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('item_order');

    if (lineItemsError) {
      console.error('Error fetching line items:', lineItemsError);
    }

    // Get organization info.
    // NOTE: this used to select a non-existent `address` column, which made
    // PostgREST error, left org null, and stripped the business name / ABN /
    // contact details out of every PDF a customer downloaded.
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(ORG_PDF_COLUMNS)
      .eq('id', quote.org_id)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
    }

    // Log the PDF download
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      action: 'download_quote_pdf'
    });

    // Build the PDF (shared builder - the same document the quote email attaches)
    const pdfOutput = buildQuotePDF({ quote, lineItems, org: orgToBusinessInfo(org) });

    return new NextResponse(pdfOutput, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.quote_number}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
