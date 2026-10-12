import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { PRODUCT_PRICING } from '@/src/config/product';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/src/lib/supabase/server';
import { buildAiStripeSubscriptionData, getStripeSubscriptionConfig } from '@/src/lib/stripeCheckout';
import { isSameOriginRequest } from '@/src/lib/security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origine de la requête non autorisée.' }, { status: 403 });
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous avant de souscrire.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Seul le gérant du restaurant peut souscrire.' }, { status: 403 });
    }
    const config = getStripeSubscriptionConfig();
    if (!config) return NextResponse.json({ error: 'Le paiement par carte n’est pas encore configuré.' }, { status: 503 });

    const supabase = await createSupabaseServerClient();
    const { data: subscription, error } = await supabase.from('subscriptions')
      .select('status,stripe_subscription_id,stripe_checkout_session_id')
      .eq('restaurant_id', current.profile.restaurant_id).maybeSingle();
    if (error) throw error;
    if (!subscription) return NextResponse.json({ error: 'Abonnement introuvable pour ce restaurant.' }, { status: 404 });
    if (subscription.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(subscription.status)) {
      return NextResponse.json({ error: 'Un abonnement Stripe est déjà associé à ce restaurant.' }, { status: 409 });
    }

    const stripe = new Stripe(config.secretKey);
    if (subscription.stripe_checkout_session_id) {
      const previousSession = await stripe.checkout.sessions.retrieve(subscription.stripe_checkout_session_id);
      if (previousSession.status === 'open' && previousSession.url) {
        return NextResponse.json({ checkoutUrl: previousSession.url }, { headers: { 'Cache-Control': 'no-store' } });
      }
      if (previousSession.status === 'complete' && previousSession.subscription) {
        const subscriptionId = typeof previousSession.subscription === 'string'
          ? previousSession.subscription
          : previousSession.subscription.id;
        const customerId = typeof previousSession.customer === 'string'
          ? previousSession.customer
          : previousSession.customer?.id;
        const service = createSupabaseServiceClient();
        const { error: linkError } = await service.from('subscriptions').update({
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId ?? null
        }).eq('restaurant_id', current.profile.restaurant_id);
        if (linkError) throw linkError;
        return NextResponse.json({ error: 'Votre paiement est en cours de confirmation.' }, { status: 409 });
      }
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: current.authUser.email ?? undefined,
      client_reference_id: current.profile.restaurant_id,
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: PRODUCT_PRICING.monthlySubscriptionEuros * 100,
          recurring: { interval: 'month' },
          product_data: { name: PRODUCT_PRICING.subscriptionName }
        },
        quantity: 1
      }],
      metadata: { restaurant_id: current.profile.restaurant_id },
      subscription_data: buildAiStripeSubscriptionData(current.profile.restaurant_id),
      success_url: `${config.origin}/app/ia?billing=success`,
      cancel_url: `${config.origin}/app/ia?billing=cancelled`
    });
    if (!session.url) throw new Error('Stripe n’a pas renvoyé le lien de paiement.');

    const service = createSupabaseServiceClient();
    const { error: saveError } = await service.from('subscriptions')
      .update({ stripe_checkout_session_id: session.id })
      .eq('restaurant_id', current.profile.restaurant_id);
    if (saveError) throw saveError;
    return NextResponse.json({ checkoutUrl: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Subscription checkout could not be created.', error);
    return NextResponse.json({ error: 'Le paiement de l’abonnement n’a pas pu être préparé.' }, { status: 502 });
  }
}
