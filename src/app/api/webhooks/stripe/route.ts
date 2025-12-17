import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use service role for webhook processing (no user session)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Webhook event logger for audit trail
async function logWebhookEvent(
  supabase: ReturnType<typeof getSupabaseClient>,
  eventType: string,
  eventId: string,
  status: 'received' | 'processed' | 'failed',
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('webhook_events').insert({
      event_type: eventType,
      event_id: eventId,
      status,
      details,
      processed_at: new Date().toISOString()
    });
  } catch {
    // Don't fail webhook if logging fails - just continue
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  let eventId = 'unknown';
  let eventType = 'unknown';

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      await logWebhookEvent(supabase, 'signature_verification', 'failed', 'failed', {
        error: 'Webhook signature verification failed'
      });
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    eventId = event.id;
    eventType = event.type;

    // Log event received
    await logWebhookEvent(supabase, eventType, eventId, 'received');

    switch (event.type) {
      // ═══════════════════════════════════════════════════════════════
      // CHECKOUT SESSION EVENTS
      // ═══════════════════════════════════════════════════════════════
      
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const invoiceId = session.metadata?.invoice_id;
        const portalToken = session.metadata?.portal_token;

        if (!invoiceId) {
          await logWebhookEvent(supabase, eventType, eventId, 'failed', {
            error: 'No invoice_id in session metadata'
          });
          break;
        }

        // Update payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            stripe_payment_id: session.payment_intent as string,
            status: 'completed',
            paid_at: new Date().toISOString()
          })
          .eq('stripe_session_id', session.id);

        if (paymentError) {
          await logWebhookEvent(supabase, eventType, eventId, 'failed', {
            error: 'Failed to update payment record',
            details: paymentError
          });
        }

        // Update invoice status
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', invoiceId);

        if (invoiceError) {
          await logWebhookEvent(supabase, eventType, eventId, 'failed', {
            error: 'Failed to update invoice status',
            details: invoiceError
          });
        }

        // Log activity in invoice_events
        await supabase.from('invoice_events').insert({
          invoice_id: invoiceId,
          event_type: 'payment_received',
          event_data: {
            amount: session.amount_total ? session.amount_total / 100 : 0,
            payment_method: 'stripe',
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            portal_token: portalToken
          }
        });

        // Log in portal access if token exists
        if (portalToken) {
          const { data: tokenData } = await supabase
            .from('portal_tokens')
            .select('id')
            .eq('token', portalToken)
            .single();

          if (tokenData) {
            await supabase.from('portal_access_logs').insert({
              token_id: tokenData.id,
              action: 'payment_completed'
            });
          }
        }

        await logWebhookEvent(supabase, eventType, eventId, 'processed', {
          invoice_id: invoiceId,
          amount: session.amount_total ? session.amount_total / 100 : 0
        });
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update payment record to expired
        await supabase
          .from('payments')
          .update({ status: 'expired' })
          .eq('stripe_session_id', session.id);

        await logWebhookEvent(supabase, eventType, eventId, 'processed', {
          session_id: session.id
        });
        break;
      }

      // ═══════════════════════════════════════════════════════════════
      // PAYMENT INTENT EVENTS (Phase 6.4)
      // ═══════════════════════════════════════════════════════════════

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Get invoice_id from metadata if available
        const invoiceId = paymentIntent.metadata?.invoice_id;

        if (invoiceId) {
          // Update invoice status to paid
          const { error: invoiceError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString()
            })
            .eq('id', invoiceId);

          if (invoiceError) {
            await logWebhookEvent(supabase, eventType, eventId, 'failed', {
              error: 'Failed to update invoice status',
              invoice_id: invoiceId,
              details: invoiceError
            });
          }

          // Log invoice event
          await supabase.from('invoice_events').insert({
            invoice_id: invoiceId,
            event_type: 'payment_succeeded',
            event_data: {
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              payment_intent_id: paymentIntent.id,
              payment_method: paymentIntent.payment_method_types?.[0] || 'card'
            }
          });
        }

        // Update payment record by payment_intent_id
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString()
          })
          .eq('stripe_payment_id', paymentIntent.id);

        await logWebhookEvent(supabase, eventType, eventId, 'processed', {
          payment_intent_id: paymentIntent.id,
          invoice_id: invoiceId,
          amount: paymentIntent.amount / 100
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const invoiceId = paymentIntent.metadata?.invoice_id;
        
        // Update payment record if exists
        await supabase
          .from('payments')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_id', paymentIntent.id);

        // Log failure in invoice_events if invoice exists
        if (invoiceId) {
          await supabase.from('invoice_events').insert({
            invoice_id: invoiceId,
            event_type: 'payment_failed',
            event_data: {
              payment_intent_id: paymentIntent.id,
              error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
              error_code: paymentIntent.last_payment_error?.code,
              failure_reason: paymentIntent.last_payment_error?.type
            }
          });
        }

        await logWebhookEvent(supabase, eventType, eventId, 'processed', {
          payment_intent_id: paymentIntent.id,
          invoice_id: invoiceId,
          error: paymentIntent.last_payment_error?.message
        });
        break;
      }

      // ═══════════════════════════════════════════════════════════════
      // STRIPE CONNECT ACCOUNT EVENTS (Phase 6.4)
      // ═══════════════════════════════════════════════════════════════

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        
        // Determine connection status based on account state
        let connectionStatus: 'connected' | 'pending' | 'error' = 'pending';
        
        if (account.charges_enabled && account.payouts_enabled) {
          connectionStatus = 'connected';
        } else if (account.requirements?.disabled_reason) {
          connectionStatus = 'error';
        }

        // Find the integration record for this Stripe account
        const { data: existingIntegration } = await supabase
          .from('organization_integrations')
          .select('id, config')
          .eq('integration_type', 'stripe')
          .filter('config->>stripe_account_id', 'eq', account.id)
          .single();

        if (existingIntegration) {
          // Merge existing config with updated Stripe account data
          const existingConfig = (existingIntegration.config || {}) as Record<string, unknown>;
          const updatedConfig = {
            ...existingConfig,
            stripe_account_id: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            requirements: account.requirements?.currently_due || [],
            disabled_reason: account.requirements?.disabled_reason || null
          };

          // Update the integration record
          const { error: updateError } = await supabase
            .from('organization_integrations')
            .update({
              status: connectionStatus,
              config: updatedConfig,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingIntegration.id);

          if (updateError) {
            await logWebhookEvent(supabase, eventType, eventId, 'failed', {
              error: 'Failed to update Stripe integration status',
              account_id: account.id,
              details: updateError
            });
          }
        } else {
          // No existing integration found - log but don't fail
          await logWebhookEvent(supabase, eventType, eventId, 'processed', {
            account_id: account.id,
            note: 'No matching integration found for this Stripe account'
          });
          break;
        }

        await logWebhookEvent(supabase, eventType, eventId, 'processed', {
          account_id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          connection_status: connectionStatus
        });
        break;
      }

      // ═══════════════════════════════════════════════════════════════
      // UNHANDLED EVENTS
      // ═══════════════════════════════════════════════════════════════

      default:
        await logWebhookEvent(supabase, eventType, eventId, 'received', {
          note: 'Unhandled event type - logged but not processed'
        });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    await logWebhookEvent(supabase, eventType, eventId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
