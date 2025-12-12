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

    // For now, redirect to the internal PDF endpoint
    // In production, this would generate/serve the PDF directly
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/quotes/${tokenData.entity_id}/pdf`
    
    return NextResponse.redirect(pdfUrl)
  } catch (error) {
    console.error('Error in quote PDF:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
