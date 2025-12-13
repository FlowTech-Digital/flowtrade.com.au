import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePDFBytes } from '@/lib/pdf/generateInvoicePDF';
import type { Invoice, InvoiceLineItem, BusinessInfo } from '@/lib/pdf/generateInvoicePDF';

// Create Supabase client with service role (bypasses RLS for portal access)
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

// Extract first IP from x-forwarded-for header
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',');
    const firstIp = parts[0]?.trim();
    if (firstIp && /^[\d.:a-fA-F]+$/.test(firstIp)) {
      return firstIp;
    }
  }
  return 'unknown';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = getClientIp(request);
    
    // Rate limiting
    if (!checkRateLimit(`pdf:${ip}`)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
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

    // Fetch invoice with customer data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        subtotal,
        gst_amount,
        discount_amount,
        total,
        amount_paid,
        amount_due,
        issue_date,
        due_date,
        payment_terms,
        notes,
        footer_text,
        org_id,
        customers (
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          street_address,
          suburb,
          state,
          postcode
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

    // Fetch invoice line items
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('item_order', { ascending: true });

    if (lineItemsError) {
      console.error('Error fetching line items:', lineItemsError);
      return NextResponse.json(
        { error: 'Failed to fetch invoice details' },
        { status: 500 }
      );
    }

    // Fetch organization/business info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, abn, email, phone, address, logo_url')
      .eq('id', invoice.org_id)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
    }

    // Log PDF download - fire and forget
    if (ip !== 'unknown') {
      supabase.from('portal_access_logs').insert({
        token_id: tokenData.id,
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || 'unknown',
        action: 'download_invoice_pdf'
      }).then(({ error }) => {
        if (error) console.error('Access log error (non-fatal):', error);
      });
    }

    // Prepare data for PDF generation
    const pdfInvoice: Invoice = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      gst_amount: Number(invoice.gst_amount),
      discount_amount: invoice.discount_amount ? Number(invoice.discount_amount) : null,
      total: Number(invoice.total),
      amount_paid: Number(invoice.amount_paid),
      amount_due: invoice.amount_due ? Number(invoice.amount_due) : null,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      payment_terms: invoice.payment_terms,
      notes: invoice.notes,
      footer_text: invoice.footer_text,
      customer: invoice.customers as Invoice['customer'],
    };

    const pdfLineItems: InvoiceLineItem[] = (lineItems || []).map((item) => ({
      id: item.id,
      item_order: item.item_order,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit || 'each',
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
    }));

    const businessInfo: BusinessInfo | undefined = org ? {
      name: org.name,
      abn: org.abn ? `ABN: ${org.abn}` : '',
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      logo_url: org.logo_url,
    } : undefined;

    // Generate PDF on-the-fly
    const pdfBytes = await generateInvoicePDFBytes({
      invoice: pdfInvoice,
      lineItems: pdfLineItems,
      businessInfo,
    });

    // Return PDF as download
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while generating the PDF' },
      { status: 500 }
    );
  }
}
