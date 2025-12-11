import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// Generate next job number for org
async function generateJobNumber(supabase: ReturnType<typeof createClient>, orgId: string): Promise<string> {
  // Get the highest job_number for this org
  const { data: existingJobs } = await supabase
    .from('jobs')
    .select('job_number')
    .eq('org_id', orgId)
    .not('job_number', 'is', null)
    .order('job_number', { ascending: false })
    .limit(1)

  let nextNumber = 1
  
  if (existingJobs && existingJobs.length > 0 && existingJobs[0].job_number) {
    // Extract number from format like "JOB-001"
    const match = existingJobs[0].job_number.match(/JOB-(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  // Format as JOB-001, JOB-002, etc.
  return `JOB-${nextNumber.toString().padStart(3, '0')}`
}

// GET /api/jobs - List all jobs for the org
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get jobs for this org with customer info
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers (
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone
        )
      `)
      .eq('org_id', userData.org_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('Jobs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id and user id
    const { data: userData } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    
    // Generate job_number
    const jobNumber = await generateJobNumber(supabase, userData.org_id)

    // Create the job
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        org_id: userData.org_id,
        job_number: jobNumber,
        customer_id: body.customer_id,
        status: body.status || 'scheduled',
        scheduled_date: body.scheduled_date || null,
        scheduled_time_start: body.scheduled_time_start || null,
        scheduled_time_end: body.scheduled_time_end || null,
        quoted_total: body.quoted_total || null,
        assigned_to: body.assigned_to || null,
        job_notes: body.job_notes || null,
        quote_id: body.quote_id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('job_activity_log').insert({
      job_id: job.id,
      user_id: userData.id,
      action: 'Job created',
      details: `Job ${jobNumber} created`,
      metadata: { created_by: userData.id, job_number: jobNumber }
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    console.error('Jobs POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}