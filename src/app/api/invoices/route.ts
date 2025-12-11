import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>

// Generate next invoice number for org (INV-YYYYMM-XXXX format)
async function generateInvoiceNumber(supabase: SupabaseClient, orgId: string): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `INV-${yearMonth}-`
  
  // Get the highest invoice_number for this org with this prefix
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

// GET /api/invoices - List all invoices for the org
export async function GET(_request: NextRequest) {
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
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers (
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone
        ),
        job:jobs (
          id,
          job_number,
          status
        )
      `)
      .eq('org_id', userData.org_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/invoices - Create a new invoice
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
    
    const invoiceNumber = await generateInvoiceNumber(supabase, userData.org_id)
    
    // Calculate tax and total
    const subtotal = parseFloat(body.subtotal) || 0
    const taxRate = parseFloat(body.tax_rate) || 10.00
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        org_id: userData.org_id,
        invoice_number: invoiceNumber,
        job_id: body.job_id || null,
        customer_id: body.customer_id,
        invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
        due_date: body.due_date || null,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: total,
        status: body.status || 'draft',
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error('Invoices POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
