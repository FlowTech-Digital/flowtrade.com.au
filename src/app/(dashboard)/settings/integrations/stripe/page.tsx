"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, CheckCircle2, ExternalLink, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function StripeSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'not_connected' | 'pending' | 'connected' | 'error'>('not_connected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

  // Check for success/error from OAuth callback
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  useEffect(() => {
    checkConnectionStatus();
    
    // Handle OAuth callback results
    if (success === 'true') {
      setConnectionStatus('connected');
    } else if (error) {
      setConnectionStatus('error');
      setErrorMessage(decodeURIComponent(error));
    }
  }, [success, error]);

  async function checkConnectionStatus() {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) return;

    // Check for existing Stripe integration
    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('status, config, error_message')
      .eq('organization_id', membership.organization_id)
      .eq('integration_type', 'stripe')
      .single();

    if (integration) {
      setConnectionStatus(integration.status as any);
      if (integration.config?.stripe_user_id) {
        setStripeAccountId(integration.config.stripe_user_id);
      }
      if (integration.error_message) {
        setErrorMessage(integration.error_message);
      }
    }
  }

  async function initiateStripeConnect() {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe OAuth
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to initiate Stripe Connect');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to Stripe');
      setConnectionStatus('error');
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <Link 
        href="/settings" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Settings
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Connect Stripe</CardTitle>
              <CardDescription>
                Accept credit card payments on your invoices
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success State */}
          {connectionStatus === 'connected' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Stripe Connected Successfully!</strong>
                <br />
                Your account is ready to accept payments.
                {stripeAccountId && (
                  <span className="text-sm block mt-1 text-green-600">
                    Account ID: {stripeAccountId}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {connectionStatus === 'error' && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Connection Failed</strong>
                <br />
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Not Connected State */}
          {connectionStatus === 'not_connected' && (
            <>
              <div className="space-y-4">
                <h3 className="font-medium">What you'll need:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Business details (name, address, ABN)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Bank account for receiving payouts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    About 5 minutes to complete setup
                  </li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">How it works:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Click "Connect with Stripe" below</li>
                  <li>Create or sign in to your Stripe account</li>
                  <li>Authorize FlowTrade to process payments</li>
                  <li>Start accepting payments on invoices!</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-sm text-blue-900">Fees:</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Stripe fee: 1.75% + 30c per transaction
                  <br />
                  Payouts are sent directly to your bank account.
                </p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {connectionStatus === 'not_connected' && (
              <Button 
                onClick={initiateStripeConnect} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect with Stripe
                  </>
                )}
              </Button>
            )}

            {connectionStatus === 'connected' && (
              <>
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/settings">
                    Back to Settings
                  </Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/invoices/new">
                    Create Invoice
                  </Link>
                </Button>
              </>
            )}

            {connectionStatus === 'error' && (
              <Button 
                onClick={initiateStripeConnect} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Try Again'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
