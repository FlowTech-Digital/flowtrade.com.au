// FlowTrade Quote Email Send API Route
// POST /api/quotes/[id]/send - Sends quote to customer via email with portal link

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { QuoteEmail } from '@/lib/email/templates/QuoteEmail'

// CloudFlare Pages requires Edge Runtime
export const runtime = 'edge'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

// Create Supabase client with service role for API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Generate portal token for quote
async function generateQuotePortalToken(
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

  if (existingToken?.token) {
    return existingToken.token
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

    // Validate customer email exists
    if (!quote.customer?.email) {
      return NextResponse.json(
        { error: 'Customer email address not found. Please add an email to the customer record.' },
        { status: 400 }
      )
    }

    // Generate portal token for quote
    const portalToken = await generateQuotePortalToken(
      quoteId,
      quote.customer.id,
      quote.org_id
    )

    // Build portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowtrade.com.au'
    const viewQuoteUrl = portalToken ? `${baseUrl}/portal/quote/${portalToken}` : undefined

    // Build customer name
    const customerName = quote.customer.company_name || 
      `${quote.customer.first_name || ''} ${quote.customer.last_name || ''}`.trim() || 
      'Valued Customer'

    // Build organization name
    const businessName = quote.organization?.name || 'Your Business'

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
      to: quote.customer.email,
      replyTo: quote.organization?.email || 'hello@flowtechdigital.com.au',
      subject: `Quote ${quote.quote_number} from ${businessName}`,
      react: QuoteEmail({
        customerName,
        quoteNumber: quote.quote_number,
        total: formatCurrency(quote.total),
        validUntil: formatDate(quote.valid_until),
        businessName,
        businessEmail: quote.organization?.email || undefined,
        businessPhone: quote.organization?.phone || undefined,
        jobDescription: quote.job_description || undefined,
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
    const updateData: Record<string, unknown> = {
      status: 'sent',
      sent_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('quotes')
      .update(updateData)
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
        to: quote.customer.email,
        message_id: emailResult?.id,
        sent_at: new Date().toISOString(),
        portal_token_generated: !!portalToken,
        portal_url: viewQuoteUrl,
      }
    })

    return NextResponse.json({
      success: true,
      messageId: emailResult?.id,
      sentTo: quote.customer.email,
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
