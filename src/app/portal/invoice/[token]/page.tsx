import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { InvoicePortalView } from '@/components/portal/InvoicePortalView';
import { TokenExpiredView } from '@/components/portal/TokenExpiredView';
import { headers } from 'next/headers';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}

async function getInvoiceByToken(token: string) {
  const supabase = await createClient();
  
  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('portal_tokens')
    .select('*')
    .eq('token', token)
    .eq('token_type', 'invoice')
    .single();

  if (tokenError || !tokenData) {
    return { error: 'invalid' as const };
  }

  // Check if expired or revoked
  if (tokenData.is_revoked) {
    return { error: 'revoked' as const };
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return { error: 'expired' as const };
  }

  // Log access
  const headersList = await headers();
  const ipHeader = headersList.get('x-forwarded-for') || headersList.get('x-real-ip');
  const ip = ipHeader?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  await supabase.from('portal_access_logs').insert({
    token_id: tokenData.id,
    ip_address: ip,
    user_agent: userAgent,
    action: 'view_invoice'
  });

  // Update access count
  await supabase
    .from('portal_tokens')
    .update({
      access_count: (tokenData.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString()
    })
    .eq('id', tokenData.id);

  // Fetch invoice with items
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      customers (
        id,
        name,
        email
      ),
      organizations (
        id,
        name,
        email,
        phone,
        address,
        logo_url,
        abn
      ),
      invoice_items (
        id,
        description,
        quantity,
        unit_price,
        total
      )
    `)
    .eq('id', tokenData.resource_id)
    .single();

  if (invoiceError || !invoice) {
    return { error: 'not_found' as const };
  }

  // Fetch payment history
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('created_at', { ascending: false });

  return {
    invoice: {
      ...invoice,
      items: invoice.invoice_items || []
    },
    customer: invoice.customers,
    organization: invoice.organizations,
    payments: payments || [],
    token
  };
}

export default async function InvoicePortalPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { payment } = await searchParams;
  const result = await getInvoiceByToken(token);

  if ('error' in result) {
    if (result.error === 'invalid' || result.error === 'not_found') {
      notFound();
    }
    return (
      <PortalLayout>
        <TokenExpiredView errorType={result.error} />
      </PortalLayout>
    );
  }

  const { invoice, customer, organization, payments } = result;

  // Determine payment result from URL params
  let paymentResult: 'success' | 'cancelled' | null = null;
  if (payment === 'success') paymentResult = 'success';
  if (payment === 'cancelled') paymentResult = 'cancelled';

  return (
    <PortalLayout organization={organization}>
      <Suspense fallback={<div className="animate-pulse">Loading invoice...</div>}>
        <InvoicePortalView
          invoice={invoice}
          customer={customer}
          organization={organization}
          payments={payments}
          token={token}
          paymentResult={paymentResult}
        />
      </Suspense>
    </PortalLayout>
  );
}
