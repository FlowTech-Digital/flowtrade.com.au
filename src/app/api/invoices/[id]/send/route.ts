// FlowTrade Invoice Send API
// Sends invoice emails via Resend

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { InvoiceEmail } from '@/lib/email/templates/InvoiceEmail'

export const runtime = 'edge'

const resend = new Resend(process.env.RESEND_API_KEY)

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
          phone
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
          phone
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

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
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
        viewInvoiceUrl: `https://flowtrade.com.au/invoices/${invoice.id}`,
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

    // Log the email send
    console.log(`Invoice ${invoice.invoice_number} sent to ${invoice.customer.email}`, emailData)

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${invoice.customer.email}`,
      emailId: emailData?.id,
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
