import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId, domainName, fromName, fromEmail, replyTo } = await request.json();

    if (!fromName || !fromEmail) {
      return NextResponse.json(
        { error: 'From name and email are required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get existing integration
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('config')
      .eq('organization_id', org.id)
      .eq('integration_type', 'resend')
      .single();

    const existingConfig = (existing?.config || {}) as Record<string, unknown>;

    // Update configuration
    const { error: updateError } = await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: org.id,
        integration_type: 'resend',
        status: 'connected',
        config: {
          ...existingConfig,
          domain_id: domainId || existingConfig.domain_id,
          domain_name: domainName || existingConfig.domain_name,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: replyTo
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,integration_type'
      });

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: {
        from_name: fromName,
        from_email: fromEmail,
        reply_to: replyTo
      }
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}