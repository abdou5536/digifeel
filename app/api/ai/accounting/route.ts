import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/src/lib/supabase/server';
import { buildSalesReport } from '@/src/lib/pos/salesReport';
import { isSameOriginRequest } from '@/src/lib/security';
import { hasActiveAiSubscription } from '@/src/lib/aiSubscription';

export const runtime = 'nodejs';

const requestSchema = z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(365)]) });

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origine de la requête non autorisée.' }, { status: 403 });
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Choisissez une période de 7, 30, 90 ou 365 jours.' }, { status: 400 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'L’assistant IA comptable n’est pas encore configuré.' }, { status: 503 });

  try {
    const current = await getAuthenticatedAppUser();
    if (!current) return NextResponse.json({ error: 'Connectez-vous pour utiliser l’assistant.' }, { status: 401 });
    if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
      return NextResponse.json({ error: 'Accès réservé au gérant du restaurant.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: subscription, error: subscriptionError } = await supabase.from('subscriptions')
      .select('status')
      .eq('restaurant_id', current.profile.restaurant_id).maybeSingle();
    if (subscriptionError) throw subscriptionError;
    const hasAccess = hasActiveAiSubscription(subscription?.status);
    if (!hasAccess) return NextResponse.json({ error: 'L’assistant comptable est réservé à l’abonnement Digifeel.' }, { status: 402 });

    const to = new Date();
    const from = new Date(to.getTime() - input.data.days * 24 * 60 * 60 * 1000);
    const report = await buildSalesReport(
      supabase, createSupabaseServiceClient(), current.profile.restaurant_id, from, to
    );
    const facts = {
      days: input.data.days,
      turnoverDzd: report.totalDzd,
      salesCount: report.salesCount,
      averageBasketDzd: report.salesCount ? Math.round(report.totalDzd / report.salesCount) : 0,
      voidedSalesCount: report.voidedCount,
      voidedAmountDzd: report.voidedDzd,
      monthlyTotals: report.byMonth.map(({ month, total_dzd, count }) => ({ month, turnoverDzd: total_dzd, salesCount: count }))
    };
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(18_000),
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: [
            'Rédige une synthèse de gestion en français pour un restaurateur, fondée uniquement sur les données JSON ci-dessous.',
            'Explique les évolutions observées, signale les annulations et donne au plus trois pistes d’action concrètes.',
            'Ne prétends pas calculer bénéfice, marge, TVA ou déclarations : les charges et justificatifs ne sont pas fournis.',
            'N’invente aucun chiffre. Données :',
            JSON.stringify(facts)
          ].join('\n') }]
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 700 }
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error('Gemini accounting summary failed.', response.status, detail.slice(0, 500));
      return NextResponse.json({ error: 'L’assistant comptable est momentanément indisponible.' }, { status: 502 });
    }
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const summary = result.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('').trim();
    if (!summary) return NextResponse.json({ error: 'L’assistant n’a pas produit de synthèse exploitable.' }, { status: 502 });
    return NextResponse.json({ summary: summary.slice(0, 5000), facts }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('AI accounting summary could not be prepared.', error);
    return NextResponse.json({ error: 'Les données de gestion ne sont pas disponibles.' }, { status: 503 });
  }
}
