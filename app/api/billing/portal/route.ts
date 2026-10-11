import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';
import { getStripeSubscriptionConfig } from '@/src/lib/stripeCheckout';
import { isSameOriginRequest } from '@/src/lib/security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origine de la requête non autorisée.' }, { status: 403 });
  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour gérer la facturation.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Seul le gérant peut gérer la facturation.' }, { status: 403 });
    }
    const config = getStripeSubscriptionConfig();
    if (!config) return NextResponse.json({ error: 'La facturation Stripe n’est pas configurée.' }, { status: 503 });
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('subscriptions').select('stripe_customer_id')
      .eq('restaurant_id', current.profile.restaurant_id).maybeSingle();
    if (error) throw error;
    if (!data?.stripe_customer_id) return NextResponse.json({ error: 'Aucun compte de facturation Stripe n’est lié.' }, { status: 404 });

    const stripe = new Stripe(config.secretKey);
    const portal = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${config.origin}/app/ia`
    });
    return NextResponse.json({ url: portal.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Stripe billing portal could not be opened.', error);
    return NextResponse.json({ error: 'Le portail de facturation est indisponible.' }, { status: 502 });
  }
}
