import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
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
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const invoiceId = session.metadata?.invoice_id;
        const orgId = session.metadata?.org_id;
        const portalToken = session.metadata?.portal_token;

        if (!invoiceId) {
          console.error('No invoice_id in session metadata');
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
          console.error('Failed to update payment record:', paymentError);
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
          console.error('Failed to update invoice status:', invoiceError);
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

        console.log(`Payment completed for invoice ${invoiceId}`);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update payment record to expired
        await supabase
          .from('payments')
          .update({ status: 'expired' })
          .eq('stripe_session_id', session.id);

        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Log payment failure
        console.error(`Payment failed for intent: ${paymentIntent.id}`);
        
        // Update payment record if exists
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_id', paymentIntent.id);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
