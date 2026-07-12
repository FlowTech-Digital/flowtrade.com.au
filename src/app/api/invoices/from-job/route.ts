import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>

// Generate next invoice number for org (INV-YYYYMM-XXXX format)
async function generateInvoiceNumber(supabase: SupabaseClient, orgId: string): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `INV-${yearMonth}-`
  
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('org_id', orgId)
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  let nextNumber = 1
  
  if (existingInvoices && existingInvoices.length > 0 && existingInvoices[0].invoice_number) {
    const match = existingInvoices[0].invoice_number.match(/INV-\d{6}-(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`
}

// POST /api/invoices/from-job - Create invoice from a completed job
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { job_id } = body
    
    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    // Fetch the job to get details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, job_number, customer_id, quoted_total, actual_total, status, org_id')
      .eq('id', job_id)
      .eq('org_id', userData.org_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if job is in a valid state for invoicing (completed or invoiced)
    if (!['completed', 'invoiced'].includes(job.status)) {
      return NextResponse.json({ 
        error: 'Job must be completed before creating an invoice' 
      }, { status: 400 })
    }

    // Check if invoice already exists for this job
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('job_id', job_id)
      .single()

    if (existingInvoice) {
      return NextResponse.json({ 
        error: `Invoice ${existingInvoice.invoice_number} already exists for this job`,
        existing_invoice_id: existingInvoice.id
      }, { status: 409 })
    }

    const invoiceNumber = await generateInvoiceNumber(supabase, userData.org_id)

    // Pull the job's line items - these are the editable lines the tradie
    // adjusted on the job (variations, extra materials, actual hours).
    const { data: jobLineItems, error: jobLineItemsError } = await supabase
      .from('job_line_items')
      .select('*')
      .eq('job_id', job_id)
      .order('item_order')

    if (jobLineItemsError) {
      console.error('Failed to read job line items:', jobLineItemsError)
    }

    // Only bill lines that are actually being charged: optional lines the
    // customer did not take should be removed on the job, but guard anyway.
    const billableLines = (jobLineItems || []).filter(
      (item: { is_optional?: boolean | null }) => !item.is_optional
    )

    const gstRate = 0.10 // 10% GST

    // GST IS APPLIED TO THE WHOLE SUBTOTAL - deliberately NOT per-line is_taxable.
    //
    // quote_line_items.is_taxable defaults to true but the app writes `false` on
    // almost every line (39 of 40 rows in production), and the quote engine
    // ignores the column entirely: quotes.gst_amount is subtotal * quotes.tax_rate,
    // which comes out at exactly 10% on 23 of 24 quotes.
    //
    // So honouring per-line is_taxable here would bill $0 GST on an invoice whose
    // quote charged 10% - i.e. an Australian tax invoice understating GST. The
    // invoice must agree with the quote. Revisit only once is_taxable is real
    // (see the punch-list item on the quote UI writing it false).
    let subtotal: number
    let gstAmount: number

    if (billableLines.length > 0) {
      subtotal = billableLines.reduce(
        (sum: number, item: { line_total?: number | null }) => sum + Number(item.line_total || 0),
        0
      )
      gstAmount = subtotal * gstRate
    } else {
      // No line items on the job (e.g. a job created before the chain was
      // fixed, or a job entered without lines). Fall back to the job totals.
      subtotal = job.actual_total || job.quoted_total || 0
      gstAmount = subtotal * gstRate
    }

    // Round to cents - floating point sums otherwise leak fractions of a cent
    // into a financial document.
    subtotal = Math.round(subtotal * 100) / 100
    gstAmount = Math.round(gstAmount * 100) / 100
    const total = Math.round((subtotal + gstAmount) * 100) / 100
    
    // Calculate due date (14 days from now)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)

    const { data: invoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        org_id: userData.org_id,
        invoice_number: invoiceNumber,
        job_id: job.id,
        customer_id: job.customer_id,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal: subtotal,
        gst_amount: gstAmount,
        total: total,
        status: 'draft',
        notes: `Invoice generated from ${job.job_number}`,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Copy the job's line items onto the invoice.
    //
    // This never happened before: invoices/from-job wrote an invoice with a
    // total and no lines, so invoice_line_items was empty for every invoice and
    // the invoice PDF rendered an empty table.
    if (billableLines.length > 0) {
      const invoiceLineItems = billableLines.map(
        (
          item: {
            item_order?: number | null
            description: string
            quantity: number
            unit?: string | null
            unit_price: number
            line_total: number
            is_taxable?: boolean | null
          },
          index: number
        ) => ({
          invoice_id: invoice.id,
          item_order: item.item_order ?? index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          line_total: item.line_total,
          is_taxable: item.is_taxable ?? true,
        })
      )

      const { error: invoiceLineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(invoiceLineItems)

      if (invoiceLineItemsError) {
        // The invoice exists but has no detail - that is exactly the failure we
        // are fixing, so surface it rather than swallowing it.
        console.error('Failed to copy job line items onto invoice:', invoiceLineItemsError)
        return NextResponse.json(
          {
            error: 'Invoice was created but its line items could not be saved.',
            details: invoiceLineItemsError.message,
            invoice_id: invoice.id,
          },
          { status: 500 }
        )
      }
    }

    // Update job status to 'invoiced' if it was 'completed'
    if (job.status === 'completed') {
      await supabase
        .from('jobs')
        .update({ status: 'invoiced', updated_at: new Date().toISOString() })
        .eq('id', job_id)
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error('Invoice from-job POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
