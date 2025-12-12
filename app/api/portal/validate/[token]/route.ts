import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const supabase = await createClient()

    // Validate token exists
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('id, token_type, entity_id, expires_at, revoked_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { valid: false, error: 'Token not found' },
        { status: 404 }
      )
    }

    // Check token expiry
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Token has expired' },
        { status: 410 }
      )
    }

    // Check if revoked
    if (tokenData.revoked_at) {
      return NextResponse.json(
        { valid: false, error: 'Token has been revoked' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      valid: true,
      token_type: tokenData.token_type,
      entity_id: tokenData.entity_id,
      expires_at: tokenData.expires_at
    })
  } catch (error) {
    console.error('Error validating token:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
