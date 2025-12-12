import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client inside handler (edge runtime requires this)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { token } = await params;
  const supabase = getSupabaseClient();

  try {
    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'quote')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if token is expired or revoked
    if (new Date(tokenData.expires_at) < new Date() || tokenData.is_revoked) {
      return NextResponse.json(
        { error: 'invalid', message: 'This link is no longer valid' },
        { status: 410 }
      );
    }

    // Get current quote status
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, status, quote_number, org_id')
      .eq('id', tokenData.resource_id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if quote can be accepted
    if (quote.status !== 'sent' && quote.status !== 'draft') {
      return NextResponse.json(
        { error: 'invalid_status', message: `Cannot accept a quote with status: ${quote.status}` },
        { status: 400 }
      );
    }

    // Update quote status to accepted
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', quote.id);

    if (updateError) {
      throw updateError;
    }

    // Log the action
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      ip_address: ip,
      user_agent: request.headers.get('user-agent'),
      action: 'accept_quote'
    });

    // Create activity log entry
    await supabase.from('activity_logs').insert({
      org_id: quote.org_id,
      entity_type: 'quote',
      entity_id: quote.id,
      action: 'status_changed',
      description: `Quote ${quote.quote_number} accepted by customer via portal`,
      metadata: { 
        old_status: quote.status,
        new_status: 'accepted',
        source: 'customer_portal',
        ip_address: ip
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Quote accepted successfully'
    });

  } catch (error) {
    console.error('Accept quote error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'An error occurred' },
      { status: 500 }
    );
  }
}
