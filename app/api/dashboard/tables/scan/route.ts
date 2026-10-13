import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/src/lib/security';
import { scanTableSchema } from '@/src/lib/schemas';
import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { createSupabaseServerClient } from '@/src/lib/supabase/server';
import { rpcErrorResponse } from '@/src/lib/billingApi';

// Enregistre (ou renomme) la table liée à une puce/QR scanné depuis l'application.
export async function POST(request: NextRequest) {
  const parsed = scanTableSchema.safeParse(await parseJsonObject(request) ?? {});
  if (!parsed.success) return NextResponse.json({ error: 'QR code ou nom de table invalide.' }, { status: 400 });

  const current = await getAuthenticatedAppUser();
  if (!current) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (current.profile.role !== 'restaurant_admin' || !current.profile.restaurant_id) {
    return NextResponse.json({ error: 'Seul le restaurateur peut enregistrer une table.' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('scan_chip_table', { p_chip: parsed.data.chipId, p_name: parsed.data.name });
  if (error) {
    console.error('Table scan failed.', error);
    return rpcErrorResponse(error, {
      403: 'Ce QR code appartient déjà à un autre restaurant ou n’est pas disponible.',
      404: 'QR code inconnu. Vérifiez qu’il s’agit bien d’un QR Digifeel.',
      409: 'Ce nom de table existe déjà.'
    });
  }
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, created: Boolean(row?.created), label: row?.label, tableNumber: row?.table_number });
}
