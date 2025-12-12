// FlowTrade Quote Email Send API Route
// POST /api/quotes/[id]/send - Sends quote to customer via email with portal link

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { QuoteEmail } from '@/lib/email/templates/QuoteEmail'

// CloudFlare Pages requires Edge Runtime
export const runtime = 'edge'

// Create Supabase client inside handler (edge runtime requires this)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Create Resend client inside handler (edge runtime requires this)
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

// Generate portal token for quote
async function generateQuotePortalToken(
  supabase: ReturnType<typeof createClient>,
  quoteId: string,
  customerId: string,
  orgId: string
): Promise<string | null> {
  // Check for existing valid token
  const { data: existingToken } = await supabase
    .from('portal_tokens')
    .select('token')
    .eq('resource_id', quoteId)
    .eq('token_type', 'quote')
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  const tokenRecord = existingToken as { token?: string } | null
  if (tokenRecord?.token) {
    return tokenRecord.token
  }

  // Generate new token (UUID v4 format)
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

  const { error } = await supabase.from('portal_tokens').insert({
    customer_id: customerId,
    org_id: orgId,
    token,
    token_type: 'quote',
    resource_id: quoteId,
    expires_at: expiresAt.toISOString()
  })

  if (error) {
    console.error('Failed to create portal token:', error)
    return null
  }

  return token
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params
    
    // Initialize clients inside handler
    const supabase = getSupabaseClient()
    const resend = getResendClient()

    // Validate Resend API key exists
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured. Please add RESEND_API_KEY to environment variables.' },
        { status: 500 }
      )
    }

    // Fetch quote with customer and organization data
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        organization:organizations(*)
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Type assertion for quote data
    const quoteData = quote as {
      id: string
      quote_number: string
      total: number
      valid_until: string
      org_id: string
      job_description?: string
      customer?: {
        id: string
        email?: string
        company_name?: string
        first_name?: string
        last_name?: string
      }
      organization?: {
        name?: string
        email?: string
        phone?: string
      }
    }

    // Validate customer email exists
    if (!quoteData.customer?.email) {
      return NextResponse.json(
        { error: 'Customer email address not found. Please add an email to the customer record.' },
        { status: 400 }
      )
    }

    // Generate portal token for quote
    const portalToken = await generateQuotePortalToken(
      supabase,
      quoteId,
      quoteData.customer.id,
      quoteData.org_id
    )

    // Build portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au'
    const viewQuoteUrl = portalToken ? `${baseUrl}/portal/quote/${portalToken}` : undefined

    // Build customer name
    const customerName = quoteData.customer.company_name || 
      `${quoteData.customer.first_name || ''} ${quoteData.customer.last_name || ''}`.trim() || 
      'Valued Customer'

    // Build organization name
    const businessName = quoteData.organization?.name || 'Your Business'

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
      }).format(amount)
    }

    // Format date
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    // Determine from address
    // Using Resend test domain initially - switch to flowtrade.com.au after verification
    const fromAddress = process.env.RESEND_FROM_EMAIL || 
      `${businessName} <onboarding@resend.dev>`

    // Send email via Resend with portal link
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: quoteData.customer.email,
      replyTo: quoteData.organization?.email || 'hello@flowtechdigital.com.au',
      subject: `Quote ${quoteData.quote_number} from ${businessName}`,
      react: QuoteEmail({
        customerName,
        quoteNumber: quoteData.quote_number,
        total: formatCurrency(quoteData.total),
        validUntil: formatDate(quoteData.valid_until),
        businessName,
        businessEmail: quoteData.organization?.email || undefined,
        businessPhone: quoteData.organization?.phone || undefined,
        jobDescription: quoteData.job_description || undefined,
        viewQuoteUrl, // Portal link included!
      }),
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json(
        { error: `Failed to send email: ${emailError.message}` },
        { status: 500 }
      )
    }

    // Update quote status to 'sent'
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', quoteId)

    if (updateError) {
      console.error('Quote update error:', updateError)
      // Email was sent, but status update failed - log but don't fail
    }

    // Log the send event with portal token info
    await supabase.from('quote_events').insert({
      quote_id: quoteId,
      event_type: 'email_sent',
      event_data: {
        to: quoteData.customer.email,
        message_id: emailResult?.id,
        sent_at: new Date().toISOString(),
        portal_token_generated: !!portalToken,
        portal_url: viewQuoteUrl,
      }
    })

    return NextResponse.json({
      success: true,
      messageId: emailResult?.id,
      sentTo: quoteData.customer.email,
      portalUrl: viewQuoteUrl,
    })

  } catch (error) {
    console.error('Quote send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send quote' },
      { status: 500 }
    )
  }
}
