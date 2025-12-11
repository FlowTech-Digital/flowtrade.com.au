import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

type Params = { params: Promise<{ id: string }> }

// GET /api/invoices/[id] - Get single invoice
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
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
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers (
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          address_line1,
          address_line2,
          city,
          state,
          postcode
        ),
        job:jobs (
          id,
          job_number,
          status,
          quoted_total,
          actual_total,
          job_notes
        )
      `)
      .eq('id', id)
      .eq('org_id', userData.org_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Invoice GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/invoices/[id] - Update invoice
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
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
    
    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    // Only include fields that are provided
    if (body.status !== undefined) updateData.status = body.status
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.payment_date !== undefined) updateData.payment_date = body.payment_date
    if (body.notes !== undefined) updateData.notes = body.notes
    
    // If subtotal is being updated, recalculate tax and total
    if (body.subtotal !== undefined) {
      const subtotal = parseFloat(body.subtotal) || 0
      const taxRate = body.tax_rate !== undefined ? parseFloat(body.tax_rate) : 10.00
      updateData.subtotal = subtotal
      updateData.tax_rate = taxRate
      updateData.tax_amount = subtotal * (taxRate / 100)
      updateData.total = subtotal + (subtotal * (taxRate / 100))
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', userData.org_id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Invoice PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
