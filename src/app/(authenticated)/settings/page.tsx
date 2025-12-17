'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IntegrationCard, IntegrationStatus } from '@/components/settings/IntegrationCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface OrganizationIntegration {
  id: string;
  organization_id: string;
  integration_type: 'stripe' | 'resend' | 'xero';
  status: IntegrationStatus;
  config: Record<string, unknown>;
  connected_at: string | null;
  last_verified_at: string | null;
  error_message: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [integrations, setIntegrations] = useState<OrganizationIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIntegrations() {
      try {
        // Get current user's organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (membership) {
          const { data: integrationData } = await supabase
            .from('organization_integrations')
            .select('*')
            .eq('organization_id', membership.organization_id);

          setIntegrations(integrationData || []);
        }
      } catch (error) {
        console.error('Error fetching integrations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchIntegrations();
  }, [supabase]);

  const getIntegrationStatus = (type: 'stripe' | 'resend' | 'xero'): IntegrationStatus => {
    const integration = integrations.find(i => i.integration_type === type);
    return integration?.status || 'not_connected';
  };

  const getIntegrationDetails = (type: 'stripe' | 'resend' | 'xero'): string | undefined => {
    const integration = integrations.find(i => i.integration_type === type);
    if (!integration || integration.status !== 'connected') return undefined;
    
    if (type === 'stripe' && integration.config) {
      return `Account: ${(integration.config as { account_name?: string }).account_name || 'Connected'}`;
    }
    if (type === 'resend' && integration.config) {
      return `Domain: ${(integration.config as { domain_name?: string }).domain_name || 'Configured'}`;
    }
    return undefined;
  };

  const getErrorMessage = (type: 'stripe' | 'resend' | 'xero'): string | undefined => {
    const integration = integrations.find(i => i.integration_type === type);
    return integration?.error_message || undefined;
  };

  const handleStripeSetup = () => {
    // TODO: Implement Stripe Connect OAuth flow (Phase 6.2)
    router.push('/settings/integrations/stripe');
  };

  const handleEmailSetup = () => {
    // TODO: Implement email domain setup (Phase 6.3)
    router.push('/settings/integrations/email');
  };

  const handleStripeManage = () => {
    router.push('/settings/integrations/stripe');
  };

  const handleEmailManage = () => {
    router.push('/settings/integrations/email');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your integrations and organization settings</p>
      </div>

      {/* Integrations Section */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <IntegrationCard
            type="stripe"
            status={getIntegrationStatus('stripe')}
            title="Payments"
            description="Accept credit card payments via Stripe"
            connectedDetails={getIntegrationDetails('stripe')}
            errorMessage={getErrorMessage('stripe')}
            onSetup={handleStripeSetup}
            onManage={handleStripeManage}
            onFix={handleStripeSetup}
          />
          <IntegrationCard
            type="resend"
            status={getIntegrationStatus('resend')}
            title="Email"
            description="Send invoices from your own domain"
            connectedDetails={getIntegrationDetails('resend')}
            errorMessage={getErrorMessage('resend')}
            onSetup={handleEmailSetup}
            onManage={handleEmailManage}
            onFix={handleEmailSetup}
          />
          <IntegrationCard
            type="xero"
            status="not_connected"
            title="Accounting"
            description="Sync invoices with Xero"
            comingSoon={true}
          />
        </div>
      </section>

      {/* Organization Settings Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Organization Settings</h2>
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>Update your organization information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Organization settings are managed through your profile. Click below to update your business details.
            </p>
            <Button variant="outline" onClick={() => router.push('/settings/organization')}>
              Edit Organization
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
