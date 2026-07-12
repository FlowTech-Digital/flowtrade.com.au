// FlowTrade Invoice Send API
// Sends invoice emails via Resend with Portal Link

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { InvoiceEmail } from '@/lib/email/templates/InvoiceEmail'
import { generatePortalToken } from '@/lib/portal/tokens'
import { buildInvoicePDFBase64 } from '@/lib/pdf/server/buildInvoicePDF'
import { orgToBusinessInfo } from '@/lib/pdf/server/orgBusinessInfo'

// Lazily create Resend client on first use (avoids build-time construction)
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get auth token from cookie
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Use service role for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get invoice with customer and job details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(
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
        ),
        job:jobs(
          id,
          job_number,
          job_notes
        ),
        org:organizations(
          id,
          name,
          email,
          phone,
          abn,
          address_line1,
          address_line2,
          suburb,
          state,
          postcode,
          logo_url
        )
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Validate customer has email
    if (!invoice.customer?.email) {
      return NextResponse.json(
        { error: 'Customer does not have an email address' },
        { status: 400 }
      )
    }

    // Generate portal token for invoice (30-day expiration for invoices)
    let portalUrl: string | null = null;
    
    // Check if a valid token already exists for this invoice
    const { data: existingToken } = await supabase
      .from('portal_tokens')
      .select('token')
      .eq('resource_id', id)
      .eq('token_type', 'invoice')
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingToken) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au';
      portalUrl = `${baseUrl}/portal/invoice/${existingToken.token}`;
    } else {
      // Generate new token using the portal tokens utility
      const tokenResult = await generatePortalToken({
        customerId: invoice.customer.id,
        orgId: invoice.org_id,
        tokenType: 'invoice',
        resourceId: id,
        expiresInDays: 30
      });

      if (tokenResult) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au';
        portalUrl = `${baseUrl}/portal/invoice/${tokenResult.token}`;
      } else {
        console.error('Failed to create portal token');
      }
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
      }).format(amount)
    }

    // Format date
    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Not specified'
      return new Date(dateString).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    // Get customer name
    const getCustomerName = () => {
      if (invoice.customer?.company_name) return invoice.customer.company_name
      return `${invoice.customer?.first_name || ''} ${invoice.customer?.last_name || ''}`.trim() || 'Valued Customer'
    }

    // Get business name from org or fallback
    const businessName = invoice.org?.name || 'FlowTrade Business'
    const businessEmail = invoice.org?.email
    const businessPhone = invoice.org?.phone

    // Get from email from env or fallback
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'FlowTrade <invoices@resend.dev>'

    // Build the invoice PDF so it can be attached - the same document the portal
    // serves, via the shared server-safe builder.
    const { data: pdfLineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .order('item_order')

    // The email body says "Please find your invoice attached", so a missing PDF
    // is not something to shrug off - fail loudly rather than send a lie.
    let invoicePdfBase64: string
    try {
      invoicePdfBase64 = await buildInvoicePDFBase64({
        invoice,
        lineItems: pdfLineItems || [],
        businessInfo: orgToBusinessInfo(invoice.org) || undefined,
      })
    } catch (pdfError) {
      console.error('Invoice PDF build failed:', pdfError)
      return NextResponse.json(
        { error: 'Could not generate the invoice PDF, so the invoice was not sent. Please try again.' },
        { status: 500 }
      )
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await getResend().emails.send({
      from: fromEmail,
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
      attachments: [
        { filename: `${invoice.invoice_number}.pdf`, content: invoicePdfBase64 },
      ],
      react: InvoiceEmail({
        customerName: getCustomerName(),
        invoiceNumber: invoice.invoice_number,
        total: formatCurrency(invoice.total),
        dueDate: formatDate(invoice.due_date),
        issueDate: formatDate(invoice.issue_date),
        businessName,
        businessEmail,
        businessPhone,
        jobDescription: invoice.job?.job_notes || undefined,
        viewInvoiceUrl: portalUrl || `https://flowtrade.com.au/invoices/${invoice.id}`,
        payNowUrl: portalUrl || undefined,
      }),
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email', details: emailError.message },
        { status: 500 }
      )
    }

    // Update invoice status to 'sent' if currently draft
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', id)
    }

    // Log the email send with portal URL.
    // NOTE: invoice_events did not exist until 2026-07-12 - every insert here
    // failed silently because the error was never checked. It is checked now.
    const { error: eventError } = await supabase.from('invoice_events').insert({
      invoice_id: id,
      event_type: 'email_sent',
      event_data: {
        to: invoice.customer.email,
        subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
        portal_url: portalUrl,
        resend_id: emailData?.id
      }
    })

    if (eventError) {
      console.error('invoice_events insert failed:', eventError)
    }

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${invoice.customer.email}`,
      emailId: emailData?.id,
      portalUrl: portalUrl,
      status: invoice.status === 'draft' ? 'sent' : invoice.status
    })

  } catch (error) {
    console.error('Send invoice error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
