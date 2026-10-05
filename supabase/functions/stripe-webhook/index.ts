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
  // Le paiement DIGIFEEL est retrouvé par metadata.payment_id, posée côté serveur à la création de l'intention.
  const paymentId: string | undefined = object?.metadata?.payment_id;
  const outcome =
    event.type === 'payment_intent.succeeded' ? 'succeeded'
      : event.type === 'payment_intent.payment_failed' ? 'failed'
        : null;
  if (!paymentId || !outcome) return new Response('ignored', { status: 200 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await supabase.rpc('settle_provider_payment', {
    p_event_id: event.id, p_payment: paymentId, p_outcome: outcome
  });
  if (error) return new Response('error', { status: 500 }); // Stripe réessaiera
  return new Response(String(data), { status: 200 });
});