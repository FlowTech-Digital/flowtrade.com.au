import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge'

/**
 * POST /api/portal/tokens
 * Generate a portal access token for a quote or invoice
 * 
 * Body: {
 *   resource_type: 'quote' | 'invoice',
 *   resource_id: string (UUID of quote or invoice)
 * }
 * 
 * Returns: {
 *   token: string,
 *   portal_url: string,
 *   expires_at: string (ISO date)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { resource_type, resource_id } = body

    // Validate input
    if (!resource_type || !resource_id) {
      return NextResponse.json(
        { error: 'Missing required fields: resource_type, resource_id' },
        { status: 400 }
      )
    }

    if (!['quote', 'invoice'].includes(resource_type)) {
      return NextResponse.json(
        { error: 'Invalid resource_type. Must be "quote" or "invoice"' },
        { status: 400 }
      )
    }

    // Get user's org_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      )
    }

    const org_id = userData.org_id

    // Verify the resource exists and belongs to this org
    const tableName = resource_type === 'quote' ? 'quotes' : 'invoices'
    const { data: resourceData, error: resourceError } = await supabase
      .from(tableName)
      .select('id, customer_id, org_id')
      .eq('id', resource_id)
      .eq('org_id', org_id)
      .single()

    if (resourceError || !resourceData) {
      return NextResponse.json(
        { error: `${resource_type.charAt(0).toUpperCase() + resource_type.slice(1)} not found or access denied` },
        { status: 404 }
      )
    }

    // Check for existing valid token
    const { data: existingToken } = await supabase
      .from('portal_tokens')
      .select('token, expires_at')
      .eq('resource_id', resource_id)
      .eq('token_type', resource_type)
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingToken) {
      // Return existing valid token
      const portal_url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au'}/portal/${resource_type}/${existingToken.token}`
      
      return NextResponse.json({
        token: existingToken.token,
        portal_url,
        expires_at: existingToken.expires_at,
        reused: true
      })
    }

    // Generate new token
    const token = uuidv4()
    const expires_at = new Date()
    expires_at.setDate(expires_at.getDate() + 30) // 30 days expiration

    // Insert new token
    const { error: insertError } = await supabase
      .from('portal_tokens')
      .insert({
        token,
        token_type: resource_type,
        resource_id: resource_id,
        customer_id: resourceData.customer_id,
        org_id: org_id,
        expires_at: expires_at.toISOString(),
        access_count: 0,
        is_revoked: false
      })

    if (insertError) {
      console.error('Error creating portal token:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate portal link' },
        { status: 500 }
      )
    }

    const portal_url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au'}/portal/${resource_type}/${token}`

    return NextResponse.json({
      token,
      portal_url,
      expires_at: expires_at.toISOString(),
      reused: false
    })

  } catch (error) {
    console.error('Portal token generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
