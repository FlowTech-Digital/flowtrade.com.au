// Force Node.js runtime - @react-pdf/renderer uses Node.js APIs incompatible with Edge
export const runtime = 'nodejs';

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

// Helper to safely convert value to string
function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

// Helper to build address from parts
function buildAddress(org: {
  address_line1?: string | null;
  address_line2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
}): string {
  const parts = [
    org.address_line1,
    org.address_line2,
    [org.suburb, org.state, org.postcode].filter(Boolean).join(' ')
  ].filter(Boolean);
  return parts.join(', ');
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

    // Fetch organization/business info - use correct column names
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, abn, email, phone, address_line1, address_line2, suburb, state, postcode, logo_url')
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
    // Note: Supabase returns foreign key relations as arrays, extract first element
    const customerData = Array.isArray(invoice.customers) 
      ? invoice.customers[0] 
      : invoice.customers;

    // Safely build customer object with string values only
    const safeCustomer = customerData ? {
      id: safeString(customerData.id),
      first_name: safeString(customerData.first_name),
      last_name: safeString(customerData.last_name),
      company_name: safeString(customerData.company_name),
      email: safeString(customerData.email),
      phone: safeString(customerData.phone),
      street_address: safeString(customerData.street_address),
      suburb: safeString(customerData.suburb),
      state: safeString(customerData.state),
      postcode: safeString(customerData.postcode),
    } : undefined;

    const pdfInvoice: Invoice = {
      id: safeString(invoice.id),
      invoice_number: safeString(invoice.invoice_number),
      status: safeString(invoice.status),
      subtotal: Number(invoice.subtotal) || 0,
      gst_amount: Number(invoice.gst_amount) || 0,
      discount_amount: invoice.discount_amount ? Number(invoice.discount_amount) : null,
      total: Number(invoice.total) || 0,
      amount_paid: Number(invoice.amount_paid) || 0,
      amount_due: invoice.amount_due ? Number(invoice.amount_due) : null,
      issue_date: safeString(invoice.issue_date),
      due_date: safeString(invoice.due_date),
      payment_terms: safeString(invoice.payment_terms),
      notes: safeString(invoice.notes),
      footer_text: safeString(invoice.footer_text),
      customer: safeCustomer as Invoice['customer'],
    };

    const pdfLineItems: InvoiceLineItem[] = (lineItems || []).map((item) => ({
      id: safeString(item.id),
      item_order: Number(item.item_order) || 0,
      description: safeString(item.description),
      quantity: Number(item.quantity) || 0,
      unit: safeString(item.unit) || 'each',
      unit_price: Number(item.unit_price) || 0,
      line_total: Number(item.line_total) || 0,
    }));

    // Build business info with address from parts
    const businessInfo: BusinessInfo | undefined = org ? {
      name: safeString(org.name),
      abn: org.abn ? `ABN: ${safeString(org.abn)}` : '',
      email: safeString(org.email),
      phone: safeString(org.phone),
      address: buildAddress(org),
      logo_url: org.logo_url ? safeString(org.logo_url) : undefined,
    } : undefined;

    // Generate PDF on-the-fly
    const pdfBytes = await generateInvoicePDFBytes({
      invoice: pdfInvoice,
      lineItems: pdfLineItems,
      businessInfo,
    });

    // Convert Uint8Array to Buffer for NextResponse compatibility (Next.js 15 strict types)
    const pdfBuffer = Buffer.from(pdfBytes);

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
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
