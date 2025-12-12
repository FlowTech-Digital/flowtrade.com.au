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
    
    // Use actual_total if available, otherwise quoted_total
    const subtotal = job.actual_total || job.quoted_total || 0
    const taxRate = 10.00
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    
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
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: total,
        status: 'draft',
        notes: `Invoice generated from ${job.job_number}`,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
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
