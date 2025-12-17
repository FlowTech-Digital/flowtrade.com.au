import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify domain with Resend
    const { error: verifyError } = await resend.domains.verify(id);

    if (verifyError) {
      console.error('Resend verify error:', verifyError);
      return NextResponse.json(
        { error: verifyError.message || 'Verification failed' },
        { status: 400 }
      );
    }

    // Get updated domain info
    const { data: domainData } = await resend.domains.get(id);

    // Transform records
    const records = domainData?.records?.map((record: { type: string; name: string; value: string; status: string }) => ({
      type: record.type,
      name: record.name,
      value: record.value,
      status: record.status === 'verified' ? 'verified' : 'pending'
    })) || [];

    // Check if all records are verified
    const allVerified = records.every((r: { status: string }) => r.status === 'verified');
    const status = allVerified ? 'verified' : 'pending';

    // Get user's organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (org) {
      // Update status in database
      await supabase
        .from('organization_integrations')
        .update({
          status: allVerified ? 'connected' : 'pending',
          config: {
            domain_id: id,
            domain_name: domainData?.name,
            records: records
          },
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', org.id)
        .eq('integration_type', 'resend');
    }

    return NextResponse.json({
      id: id,
      name: domainData?.name,
      status: status,
      records: records
    });
  } catch (error) {
    console.error('Error verifying domain:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}