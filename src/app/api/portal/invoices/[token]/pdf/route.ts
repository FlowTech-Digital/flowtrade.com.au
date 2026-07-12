// Server-side invoice PDF generation.
//
// This route previously returned HTTP 501 with the note "Server-side PDF
// generation is not supported on CloudFlare Workers". That was never true - the
// quote portal route has been generating PDFs server-side on Workers the whole
// time. It now uses the same shared builder, so the portal, the dashboard
// download and the emailed attachment are all the same document.

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { buildInvoicePDF } from '@/lib/pdf/server/buildInvoicePDF';
import { ORG_PDF_COLUMNS, orgToBusinessInfo } from '@/lib/pdf/server/orgBusinessInfo';

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
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'invoice')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'not_found', message: 'Invoice not found' },
        { status: 404 }
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .eq('id', tokenData.resource_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'not_found', message: 'Invoice not found' },
        { status: 404 }
      );
    }

    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('item_order');

    if (lineItemsError) {
      console.error('Error fetching invoice line items:', lineItemsError);
    }

    // Same org-identity fix as the quote route: the organizations table has no
    // `address` column, so selecting one errored and stripped the business name,
    // ABN and contact details out of the PDF.
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(ORG_PDF_COLUMNS)
      .eq('id', invoice.org_id)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
    }

    // Log the download against the portal token
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      action: 'download_invoice_pdf'
    });

    const pdfOutput = await buildInvoicePDF({
      invoice,
      lineItems: lineItems || [],
      businessInfo: orgToBusinessInfo(org) || undefined,
    });

    return new NextResponse(pdfOutput, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
