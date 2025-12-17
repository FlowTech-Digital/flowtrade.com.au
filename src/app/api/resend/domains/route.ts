import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
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

    // Create domain in Resend
    const { data: domainData, error: resendError } = await resend.domains.create({
      name: domain,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return NextResponse.json(
        { error: resendError.message || 'Failed to add domain' },
        { status: 400 }
      );
    }

    // Transform records for frontend
    const records = domainData?.records?.map((record: { type: string; name: string; value: string; status: string }) => ({
      type: record.type,
      name: record.name,
      value: record.value,
      status: record.status === 'verified' ? 'verified' : 'pending'
    })) || [];

    // Store in database
    await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: org.id,
        integration_type: 'resend',
        status: 'pending',
        config: {
          domain_id: domainData?.id,
          domain_name: domain,
          records: records
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,integration_type'
      });

    return NextResponse.json({
      id: domainData?.id,
      name: domain,
      status: domainData?.status || 'pending',
      records: records
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    return NextResponse.json(
      { error: 'Failed to add domain' },
      { status: 500 }
    );
  }
}