import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const supabase = await createClient()
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 'unknown'

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          status,
          subtotal,
          tax,
          total,
          due_date,
          issued_date,
          notes,
          line_items,
          customer_name,
          customer_email,
          customer_phone,
          customer_address,
          created_at,
          updated_at
        )
      `)
      .eq('token', token)
      .eq('token_type', 'invoice')
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    // Check token expiry
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 410 }
      )
    }

    // Check if revoked
    if (tokenData.revoked_at) {
      return NextResponse.json(
        { error: 'Token has been revoked' },
        { status: 410 }
      )
    }

    // Log access
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      action: 'invoice_viewed',
      ip_address: ip,
      user_agent: headersList.get('user-agent') || 'unknown'
    })

    // Return invoice data (without sensitive business info)
    return NextResponse.json({
      invoice: tokenData.invoices,
      token_expires_at: tokenData.expires_at
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
