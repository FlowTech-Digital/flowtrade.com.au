// FlowTrade Quote-to-Job Conversion API Route
// POST /api/jobs/from-quote - Converts an accepted quote to a scheduled job

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// CloudFlare Pages requires Edge Runtime
export const runtime = 'edge'

// Create Supabase client inside handler (edge runtime requires this)
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

    // Build job notes from quote description and line items
    const jobNotesContent = quote.job_description || 
      (quote.line_items && quote.line_items.length > 0
        ? quote.line_items.map((item: { description: string }) => item.description).join('\n')
        : `Job created from quote ${quote.quote_number}`)

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
