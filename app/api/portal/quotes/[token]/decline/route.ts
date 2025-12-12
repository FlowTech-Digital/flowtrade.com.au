import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const supabase = await createClient()
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 'unknown'

    // Get optional decline reason from body
    let declineReason = ''
    try {
      const body = await request.json()
      declineReason = body.reason || ''
    } catch {
      // No body or invalid JSON is fine
    }

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
        { error: 'Quote cannot be declined in current status' },
        { status: 400 }
      )
    }

    // Update quote status to declined
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'declined',
        notes: declineReason ? `Declined: ${declineReason}` : tokenData.quotes?.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.entity_id)

    if (updateError) {
      console.error('Error declining quote:', updateError)
      return NextResponse.json(
        { error: 'Failed to decline quote' },
        { status: 500 }
      )
    }

    // Log access
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      action: 'quote_declined',
      ip_address: ip,
      user_agent: headersList.get('user-agent') || 'unknown',
      metadata: declineReason ? { reason: declineReason } : null
    })

    return NextResponse.json({
      success: true,
      message: 'Quote declined'
    })
  } catch (error) {
    console.error('Error in quote decline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
