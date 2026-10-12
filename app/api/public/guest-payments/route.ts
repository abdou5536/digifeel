import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject, isRateLimited } from '@/src/lib/security';
import { guestPaymentRequestSchema } from '@/src/lib/schemas';
import { getStripeCheckoutConfig, toStripeEurCents } from '@/src/lib/stripeCheckout';
import { rpcErrorResponse } from '@/src/lib/billingApi';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const config = getStripeCheckoutConfig();
  return NextResponse.json({
    stripeAvailable: Boolean(config),
    stripeMode: config?.mode ?? null,
    currency: 'EUR',
    eurToDzd: config?.eurToDzd ?? null
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const body = guestPaymentRequestSchema.safeParse(await parseJsonObject(request));
  if (!body.success) return NextResponse.json({ error: 'Requête de paiement invalide.' }, { status: 400 });

  let expectedOrigin: string;
  let requestOrigin: string | null;
  try {
    expectedOrigin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin
      : process.env.NODE_ENV === 'production' ? '' : request.nextUrl.origin;
    const originHeader = request.headers.get('origin');
    requestOrigin = originHeader ? new URL(originHeader).origin : null;
  } catch {
    return NextResponse.json({ error: 'Origine de paiement non autorisée.' }, { status: 403 });
  }
  if (!expectedOrigin || (requestOrigin && requestOrigin !== expectedOrigin) ||
      (!requestOrigin && process.env.NODE_ENV === 'production')) {
    return NextResponse.json({ error: 'Origine de paiement non autorisée.' }, { status: 403 });
  }
  if (isRateLimited(`guest-payment:${body.data.token}`, 8, 60_000)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans un instant.' }, { status: 429 });
  }

  const stripeConfig = body.data.method === 'stripe' ? getStripeCheckoutConfig() : null;
  if (body.data.method === 'stripe' && !stripeConfig) {
    return NextResponse.json({ error: 'Le paiement par carte n’est pas encore configuré.' }, { status: 503 });
  }
  let stripeAmountCents: number | null = null;
  if (stripeConfig) {
    try {
      const supabaseForBill = await createSupabaseServerClient();
      const { data: billData, error: billError } = await supabaseForBill.rpc('guest_get_bill', { p_token: body.data.token });
      if (billError) return rpcErrorResponse(billError);
      const isEuro = (billData as { currency?: string } | null)?.currency === 'EUR';
      if (isEuro) {
        stripeAmountCents = body.data.amountDzd + body.data.tipDzd;
        if (!Number.isSafeInteger(stripeAmountCents) || stripeAmountCents < 50) throw new Error('Le total est inférieur au minimum accepté par Stripe.');
      } else {
        stripeAmountCents = toStripeEurCents(body.data.amountDzd, body.data.tipDzd, stripeConfig.eurToDzd);
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Montant Stripe invalide.' }, { status: 422 });
    }
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: paymentId, error } = await supabase.rpc('request_guest_payment', {
      p_token: body.data.token,
      p_amount: body.data.amountDzd,
      p_tip: body.data.tipDzd,
      p_method: body.data.method,
      p_key: body.data.idempotencyKey
    });
    if (error) return rpcErrorResponse(error);
    if (typeof paymentId !== 'string') {
      console.error('Guest payment request returned no payment identifier.');
      return NextResponse.json({ error: 'Le paiement n’a pas pu être préparé.' }, { status: 503 });
    }

    if (body.data.method !== 'stripe') {
      return NextResponse.json({ paymentId, status: 'pending_manual' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!stripeConfig || stripeAmountCents === null) {
      console.error('Stripe Checkout configuration was lost before session creation.');
      return NextResponse.json({ error: 'Le paiement par carte n’est pas encore configuré.' }, { status: 503 });
    }
    const config = stripeConfig;
    const stripe = new Stripe(config.secretKey);
    let session: Stripe.Response<Stripe.Checkout.Session>;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'eur',
            unit_amount: stripeAmountCents,
            product_data: { name: `Addition · table ${body.data.tableCode}` }
          },
          quantity: 1
        }],
        metadata: { payment_id: paymentId },
        payment_intent_data: { metadata: { payment_id: paymentId } },
        success_url: `${config.origin}/t/${encodeURIComponent(body.data.tableCode)}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.origin}/t/${encodeURIComponent(body.data.tableCode)}?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 40 * 60
      }, { idempotencyKey: paymentId });

      if (!session.url) throw new Error('Stripe n’a pas fourni de lien Checkout.');
      return NextResponse.json({ paymentId, checkoutUrl: session.url }, {
        headers: { 'Cache-Control': 'no-store' }
      });
    } catch (stripeError) {
      console.error('Stripe Checkout session could not be created.', stripeError);
      const statusCode = stripeError && typeof stripeError === 'object' && 'statusCode' in stripeError
        ? stripeError.statusCode
        : undefined;
      if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        const { error: cancelError } = await supabase.rpc('cancel_guest_stripe_payment', {
          p_token: body.data.token,
          p_payment: paymentId
        });
        if (cancelError) console.error('Failed to cancel a rejected Stripe payment request.', cancelError);
      }
      return NextResponse.json({ error: 'Stripe n’a pas pu préparer le paiement. Vous pouvez réessayer ou choisir BaridiMob.' }, { status: 502 });
    }
  } catch (error) {
    console.error('Guest payment could not be created.', error);
    return NextResponse.json({ error: 'Le service de paiement est momentanément indisponible.' }, { status: 503 });
  }
}
