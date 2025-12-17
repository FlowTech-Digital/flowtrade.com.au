import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const redirectBase = '/settings/integrations/stripe';

  // Handle OAuth errors
  if (error) {
    console.error('Stripe OAuth error:', error, errorDescription);
    const errorMsg = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=${errorMsg}`, request.url)
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=${encodeURIComponent('Missing authorization code')}`, request.url)
    );
  }

  try {
    // Decode state to get organization_id
    let stateData: { organization_id: string; user_id: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=${encodeURIComponent('Invalid state parameter')}`, request.url)
      );
    }

    // Validate state timestamp (15 minute expiry)
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - stateData.timestamp > fifteenMinutes) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=${encodeURIComponent('Authorization expired. Please try again.')}`, request.url)
      );
    }

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    if (!response.stripe_user_id) {
      throw new Error('No stripe_user_id returned from Stripe');
    }

    // Verify user is still authenticated
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=${encodeURIComponent('Service unavailable')}`, request.url)
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== stateData.user_id) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=${encodeURIComponent('Session expired. Please log in and try again.')}`, request.url)
      );
    }

    // Get connected account details for display
    let accountName = '';
    try {
      const account = await stripe.accounts.retrieve(response.stripe_user_id);
      accountName = account.business_profile?.name || account.settings?.dashboard?.display_name || '';
    } catch (e) {
      console.warn('Could not retrieve account details:', e);
    }

    // Store the connection in database
    const { error: updateError } = await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: stateData.organization_id,
        integration_type: 'stripe',
        status: 'connected',
        config: {
          stripe_user_id: response.stripe_user_id,
          access_token: response.access_token,
          refresh_token: response.refresh_token,
          token_type: response.token_type,
          scope: response.scope,
          account_name: accountName,
          connected_at: new Date().toISOString(),
        },
        connected_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,integration_type',
      });

    if (updateError) {
      console.error('Failed to save Stripe connection:', updateError);
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=${encodeURIComponent('Failed to save connection. Please try again.')}`, request.url)
      );
    }

    // Success! Redirect back to setup page
    return NextResponse.redirect(
      new URL(`${redirectBase}?success=true`, request.url)
    );

  } catch (err) {
    console.error('Stripe callback error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
