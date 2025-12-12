import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const runtime = 'edge'

export async function POST(
  _request: NextRequest,
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
      .select('*, invoices(*)')
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

    // Check invoice status
    if (tokenData.invoices?.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      )
    }

    // Log payment initiation
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      action: 'payment_initiated',
      ip_address: ip,
      user_agent: headersList.get('user-agent') || 'unknown'
    })

    // TODO: Integrate with Stripe payment
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Payment integration coming soon',
      invoice_id: tokenData.entity_id,
      amount: tokenData.invoices?.total
    })
  } catch (error) {
    console.error('Error in invoice pay:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
