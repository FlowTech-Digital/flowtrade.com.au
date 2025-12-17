import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/callback`
  : 'https://flowtrade.com.au/api/stripe/callback';

export async function POST() {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!STRIPE_CLIENT_ID) {
      console.error('STRIPE_CLIENT_ID not configured');
      return NextResponse.json(
        { error: 'Stripe Connect not configured' },
        { status: 500 }
      );
    }

    // Create or update pending integration record
    const { error: upsertError } = await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: membership.organization_id,
        integration_type: 'stripe',
        status: 'pending',
        config: {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,integration_type',
      });

    if (upsertError) {
      console.error('Failed to create integration record:', upsertError);
    }

    // Build Stripe OAuth URL
    // Using state parameter to pass organization_id securely
    const state = Buffer.from(JSON.stringify({
      organization_id: membership.organization_id,
      user_id: user.id,
      timestamp: Date.now(),
    })).toString('base64');

    const stripeConnectUrl = new URL('https://connect.stripe.com/oauth/authorize');
    stripeConnectUrl.searchParams.set('response_type', 'code');
    stripeConnectUrl.searchParams.set('client_id', STRIPE_CLIENT_ID);
    stripeConnectUrl.searchParams.set('scope', 'read_write');
    stripeConnectUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    stripeConnectUrl.searchParams.set('state', state);
    
    // Pre-fill with user's email if available
    if (user.email) {
      stripeConnectUrl.searchParams.set('stripe_user[email]', user.email);
    }
    
    // Set country to Australia
    stripeConnectUrl.searchParams.set('stripe_user[country]', 'AU');

    return NextResponse.json({ url: stripeConnectUrl.toString() });
  } catch (error) {
    console.error('Stripe Connect initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Stripe Connect' },
      { status: 500 }
    );
  }
}
