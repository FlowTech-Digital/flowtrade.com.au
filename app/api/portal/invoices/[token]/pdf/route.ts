import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(
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

    // Log PDF access
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      action: 'pdf_download',
      ip_address: ip,
      user_agent: headersList.get('user-agent') || 'unknown'
    })

    // Redirect to internal PDF endpoint
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/${tokenData.entity_id}/pdf`
    
    return NextResponse.redirect(pdfUrl)
  } catch (error) {
    console.error('Error in invoice PDF:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
