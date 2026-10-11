// Edge Function Supabase : webhook Stripe (MODE TEST uniquement tant que non validé par le propriétaire).
// Secrets : supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... (jamais dans git).
// Déploiement : supabase functions deploy stripe-webhook --no-verify-jwt   (Stripe n'envoie pas de JWT Supabase ; la signature fait foi)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyStripeSignature } from '../_shared/stripeSignature.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const payload = await req.text();
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!(await verifyStripeSignature(payload, req.headers.get('stripe-signature'), secret))) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(payload);
  const object = event?.data?.object ?? {};
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  if (event.type === 'checkout.session.completed' && object.mode === 'subscription') {
    const restaurantId: string | undefined = object.metadata?.restaurant_id;
    const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id;
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    if (!restaurantId || !subscriptionId || !customerId) return new Response('invalid subscription checkout metadata', { status: 500 });
    const { data, error } = await supabase.from('subscriptions')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_checkout_session_id: object.id
      })
      .eq('restaurant_id', restaurantId)
      .select('id')
      .maybeSingle();
    if (error || !data) return new Response('subscription checkout could not be linked', { status: 500 });
    return new Response('subscription checkout linked', { status: 200 });
  }

  if (event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted') {
    const restaurantId: string | undefined = object.metadata?.restaurant_id;
    if (!restaurantId || typeof object.id !== 'string') return new Response('invalid subscription metadata', { status: 500 });
    const status = event.type === 'customer.subscription.deleted' ? 'canceled'
      : object.status === 'active' ? 'active'
        : object.status === 'trialing' ? 'trialing'
          : object.status === 'past_due' || object.status === 'unpaid' || object.status === 'paused' ? 'past_due'
            : object.status === 'canceled' || object.status === 'incomplete_expired' ? 'canceled'
              : 'inactive';
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    const patch: Record<string, string | null> = {
      status,
      stripe_subscription_id: object.id,
      stripe_customer_id: typeof customerId === 'string' ? customerId : null
    };
    if (typeof object.trial_end === 'number') patch.trial_ends_at = new Date(object.trial_end * 1000).toISOString();
    if (typeof object.current_period_end === 'number') {
      patch.current_period_ends_at = new Date(object.current_period_end * 1000).toISOString();
    }
    const { data, error } = await supabase.from('subscriptions')
      .update(patch)
      .eq('restaurant_id', restaurantId)
      .select('id')
      .maybeSingle();
    if (error || !data) return new Response('subscription status could not be updated', { status: 500 });
    return new Response('subscription status updated', { status: 200 });
  }

  // Le paiement DIGIFEEL est retrouvé par metadata.payment_id, posée côté serveur à la création de l'intention.
  const paymentId: string | undefined = object?.metadata?.payment_id;
  const outcome =
    event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.async_payment_succeeded'
      ? 'succeeded'
      : event.type === 'payment_intent.payment_failed' ||
          event.type === 'checkout.session.expired' ||
          event.type === 'checkout.session.async_payment_failed'
        ? 'failed'
        : event.type === 'checkout.session.completed' && object.payment_status === 'paid'
          ? 'succeeded'
          : null;
  if (!paymentId || !outcome) return new Response('ignored', { status: 200 });

  const { data, error } = await supabase.rpc('settle_provider_payment', {
    p_event_id: event.id, p_payment: paymentId, p_outcome: outcome
  });
  if (error) return new Response('error', { status: 500 }); // Stripe réessaiera
  return new Response(String(data), { status: 200 });
});