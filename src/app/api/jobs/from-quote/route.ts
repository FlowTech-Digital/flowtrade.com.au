// FlowTrade Quote-to-Job Conversion API Route
// POST /api/jobs/from-quote - Converts an accepted quote to a scheduled job

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client inside handler
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient()
  
  try {
    const body = await request.json()
    const { quote_id, scheduled_date, scheduled_time_start, scheduled_time_end, assigned_to, notes } = body

    // Validate required field
    if (!quote_id) {
      return NextResponse.json(
        { error: 'quote_id is required' },
        { status: 400 }
      )
    }

    // Fetch the quote with customer and line items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        line_items:quote_line_items(*)
      `)
      .eq('id', quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Validate quote status (should be accepted to convert)
    if (quote.status !== 'accepted') {
      return NextResponse.json(
        { error: `Cannot convert quote with status '${quote.status}'. Quote must be accepted first.` },
        { status: 400 }
      )
    }

    // Check if job already exists for this quote
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id, job_number')
      .eq('quote_id', quote_id)
      .single()

    if (existingJob) {
      return NextResponse.json(
        { error: `Job already exists for this quote (${existingJob.job_number})`, existing_job_id: existingJob.id },
        { status: 409 }
      )
    }

    // Generate job number using database function
    const { data: jobNumberResult, error: jobNumberError } = await supabase
      .rpc('generate_job_number')

    if (jobNumberError) {
      console.error('Job number generation error:', jobNumberError)
      // Continue with fallback - jobNumberResult will be null
    }

    const jobNumber = jobNumberResult || `JOB-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Date.now().toString().slice(-4)}`

    // Build job notes from the quote description.
    // NOTE: this used to fall back to flattening the quote's line items into a
    // newline-joined STRING. That destroyed the structured line items at the
    // quote -> job boundary, which is why invoice_line_items was empty for every
    // invoice. The line items are now copied properly into job_line_items below;
    // job_notes is just a note again.
    const jobNotesContent = quote.job_description || `Job created from quote ${quote.quote_number}`

    // Create the job - ONLY use columns that exist in jobs table schema
    // Schema verified columns: org_id, quote_id, customer_id, property_id, job_number,
    // status, scheduled_date, scheduled_time_start, scheduled_time_end, assigned_to,
    // quoted_total, job_notes, created_at, updated_at
    const jobData = {
      org_id: quote.org_id,
      quote_id: quote.id,
      customer_id: quote.customer_id,
      property_id: quote.property_id || null,
      job_number: jobNumber,
      status: 'scheduled',
      scheduled_date: scheduled_date || null,
      scheduled_time_start: scheduled_time_start || null,
      scheduled_time_end: scheduled_time_end || null,
      quoted_total: quote.total,
      assigned_to: assigned_to || null,
      job_notes: notes || jobNotesContent || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: newJob, error: createError } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single()

    if (createError) {
      console.error('Job creation error:', createError)
      return NextResponse.json(
        { error: `Failed to create job: ${createError.message}` },
        { status: 500 }
      )
    }

    // Copy the quote's line items onto the job.
    //
    // The job is the editable stage: the tradie adjusts these (variations, extra
    // materials, actual hours) and the invoice is then built from them. Optional
    // items are carried across with is_optional intact so they can be kept or
    // removed once the customer decides.
    if (quote.line_items && quote.line_items.length > 0) {
      const jobLineItems = quote.line_items.map((item: {
        id: string
        item_order: number | null
        item_type: string | null
        category: string | null
        description: string
        detailed_notes: string | null
        quantity: number
        unit: string | null
        unit_cost: number | null
        unit_price: number
        markup_percent: number | null
        line_total: number
        line_cost: number | null
        supplier_name: string | null
        supplier_sku: string | null
        is_taxable: boolean | null
        is_optional: boolean | null
      }, index: number) => ({
        job_id: newJob.id,
        item_order: item.item_order ?? index + 1,
        item_type: item.item_type,
        category: item.category,
        description: item.description,
        detailed_notes: item.detailed_notes,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost,
        unit_price: item.unit_price,
        markup_percent: item.markup_percent,
        line_total: item.line_total,
        line_cost: item.line_cost,
        supplier_name: item.supplier_name,
        supplier_sku: item.supplier_sku,
        is_taxable: item.is_taxable ?? true,
        is_optional: item.is_optional ?? false,
        source_quote_line_item_id: item.id,
      }))

      const { error: lineItemsError } = await supabase
        .from('job_line_items')
        .insert(jobLineItems)

      if (lineItemsError) {
        // Do not fail the conversion - the job exists and is usable - but this
        // must be loud, because a silent failure here is exactly the bug that
        // left every invoice with no line detail.
        console.error('Failed to copy quote line items onto job:', lineItemsError)
      }
    }

    // Log activity for the new job
    await supabase.from('job_activity_log').insert({
      job_id: newJob.id,
      activity_type: 'created',
      description: `Job created from quote ${quote.quote_number}`,
      metadata: {
        source: 'quote_conversion',
        quote_id: quote.id,
        quote_number: quote.quote_number,
        converted_at: new Date().toISOString(),
      }
    })

    // Update quote status to 'converted'
    await supabase
      .from('quotes')
      .update({
        status: 'converted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quote_id)

    // Log quote event
    await supabase.from('quote_events').insert({
      quote_id: quote_id,
      event_type: 'converted_to_job',
      event_data: {
        job_id: newJob.id,
        job_number: newJob.job_number,
        converted_at: new Date().toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      job: newJob,
      message: `Successfully created job ${newJob.job_number} from quote ${quote.quote_number}`
    })

  } catch (error) {
    console.error('Quote-to-job conversion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert quote to job' },
      { status: 500 }
    )
  }
}
