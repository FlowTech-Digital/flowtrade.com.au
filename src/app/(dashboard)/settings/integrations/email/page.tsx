'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Copy, Check, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status: 'pending' | 'verified';
}

interface DomainData {
  id: string;
  name: string;
  status: 'pending' | 'verified' | 'failed';
  records: DnsRecord[];
}

type SetupStep = 'intro' | 'domain' | 'dns' | 'verify' | 'configure' | 'complete';

export default function EmailSetupPage() {
  const [step, setStep] = useState<SetupStep>('intro');
  const [domain, setDomain] = useState('');
  const [domainData, setDomainData] = useState<DomainData | null>(null);
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('invoices');
  const [replyTo, setReplyTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [existingConfig, setExistingConfig] = useState<DomainData | null>(null);

  // Check for existing email configuration
  useEffect(() => {
    async function checkExisting() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('owner_id', user.id)
        .single();

      if (org) {
        setFromName(org.name || '');
        
        const { data: integration } = await supabase
          .from('organization_integrations')
          .select('*')
          .eq('organization_id', org.id)
          .eq('integration_type', 'resend')
          .single();

        if (integration && integration.config) {
          const config = integration.config as { domain_id?: string; domain_name?: string; from_name?: string; from_email?: string; reply_to?: string; records?: DnsRecord[] };
          setExistingConfig({
            id: config.domain_id || '',
            name: config.domain_name || '',
            status: integration.status === 'connected' ? 'verified' : 'pending',
            records: config.records || []
          });
          setDomain(config.domain_name || '');
          setFromName(config.from_name || org.name || '');
          setFromEmail(config.from_email?.split('@')[0] || 'invoices');
          setReplyTo(config.reply_to || '');
          
          if (integration.status === 'connected') {
            setStep('complete');
          } else if (integration.status === 'pending') {
            setDomainData({
              id: config.domain_id || '',
              name: config.domain_name || '',
              status: 'pending',
              records: config.records || []
            });
            setStep('dns');
          }
        }
      }
    }
    checkExisting();
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddDomain = async () => {
    if (!domain.trim()) {
      setError('Please enter a domain');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/resend/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain');
      }

      setDomainData(data);
      setStep('dns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = useCallback(async () => {
    if (!domainData?.id) return;

    setVerifying(true);
    setError('');

    try {
      const response = await fetch(`/api/resend/domains/${domainData.id}/verify`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setDomainData(prev => prev ? { ...prev, ...data } : data);

      if (data.status === 'verified') {
        setStep('configure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }, [domainData?.id]);

  const handleSaveConfig = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/resend/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: domainData?.id,
          domainName: domainData?.name || domain,
          fromName,
          fromEmail: `${fromEmail}@${domainData?.name || domain}`,
          replyTo
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Link href="/settings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Settings
      </Link>

      {step === 'intro' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Set Up Custom Email Domain</CardTitle>
                <CardDescription>Send invoices and quotes from your own domain</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Send professional emails from your own domain (e.g., invoices@yourbusiness.com.au)
              instead of noreply@flowtrade.com.au.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-medium">What you&apos;ll need:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Access to your domain&apos;s DNS settings</li>
                <li>About 5-10 minutes to add DNS records</li>
                <li>Up to 48 hours for DNS propagation</li>
              </ul>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Don&apos;t have a domain or prefer not to set one up? Emails will be sent from
                noreply@flowtrade.com.au on your behalf.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3 pt-4">
              <Button onClick={() => setStep('domain')}>Set Up My Domain</Button>
              <Button variant="outline" asChild>
                <Link href="/settings">Skip for Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'domain' && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Domain</CardTitle>
            <CardDescription>Enter the domain you want to send emails from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Domain</label>
              <Input
                placeholder="yourbusiness.com.au"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter your domain without &quot;www&quot; or &quot;https://&quot;
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleAddDomain} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continue
              </Button>
              <Button variant="outline" onClick={() => setStep('intro')}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'dns' && domainData && (
        <Card>
          <CardHeader>
            <CardTitle>Add DNS Records</CardTitle>
            <CardDescription>
              Add these records to your domain&apos;s DNS settings at your domain registrar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                DNS changes can take up to 48 hours to propagate. We&apos;ll check automatically.
              </AlertDescription>
            </Alert>

            {domainData.records.map((record, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Record {index + 1}: {record.type}</span>
                  {record.status === 'verified' ? (
                    <span className="flex items-center text-green-600 text-sm">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-yellow-600 text-sm">Pending</span>
                  )}
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between bg-muted p-2 rounded">
                    <div>
                      <span className="text-muted-foreground">Type: </span>
                      <span className="font-mono">{record.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-muted p-2 rounded">
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">Host/Name: </span>
                      <span className="font-mono break-all">{record.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(record.name, `name-${index}`)}
                    >
                      {copiedField === `name-${index}` ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-muted p-2 rounded">
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">Value: </span>
                      <span className="font-mono text-xs break-all">{record.value}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(record.value, `value-${index}`)}
                    >
                      {copiedField === `value-${index}` ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={handleVerifyDomain} disabled={verifying}>
                {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Verification
              </Button>
              <Button variant="outline" onClick={() => setStep('domain')}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'configure' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle>Domain Verified!</CardTitle>
            </div>
            <CardDescription>Configure your email settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Name</label>
              <Input
                placeholder="Your Business Name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The name recipients will see (e.g., &quot;Smith Electrical Services&quot;)
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From Email</label>
              <div className="flex items-center">
                <Input
                  placeholder="invoices"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="rounded-r-none"
                />
                <span className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">
                  @{domainData?.name || domain}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reply-To Email</label>
              <Input
                type="email"
                placeholder="you@yourbusiness.com.au"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Where replies will be sent
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveConfig} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Email Domain Configured!</CardTitle>
                <CardDescription>Your custom email domain is ready to use</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm"><strong>Domain:</strong> {existingConfig?.name || domainData?.name || domain}</p>
              <p className="text-sm"><strong>From:</strong> {fromName} &lt;{fromEmail}@{existingConfig?.name || domainData?.name || domain}&gt;</p>
              <p className="text-sm"><strong>Reply-To:</strong> {replyTo}</p>
            </div>
            <p className="text-muted-foreground">
              Invoices and quotes will now be sent from your custom domain.
            </p>
            <div className="flex gap-3 pt-4">
              <Button asChild>
                <Link href="/invoices/new">Send Test Invoice</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings">Back to Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}