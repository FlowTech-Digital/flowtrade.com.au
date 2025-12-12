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
      .select('*, quotes(*)')
      .eq('token', token)
      .eq('token_type', 'quote')
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

    // Check if already revoked
    if (tokenData.revoked_at) {
      return NextResponse.json(
        { error: 'Token has been revoked' },
        { status: 410 }
      )
    }

    // Check quote status
    if (tokenData.quotes?.status !== 'sent') {
      return NextResponse.json(
        { error: 'Quote cannot be accepted in current status' },
        { status: 400 }
      )
    }

    // Update quote status to accepted
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.entity_id)

    if (updateError) {
      console.error('Error accepting quote:', updateError)
      return NextResponse.json(
        { error: 'Failed to accept quote' },
        { status: 500 }
      )
    }

    // Log access
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      action: 'quote_accepted',
      ip_address: ip,
      user_agent: headersList.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      message: 'Quote accepted successfully'
    })
  } catch (error) {
    console.error('Error in quote accept:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
