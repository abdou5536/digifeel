import { NextRequest, NextResponse } from 'next/server';
import { hashRequestDevice, parseJsonObject } from '@/src/lib/security';
import { chipIdSchema } from '@/src/lib/schemas';
import { createSupabaseServiceClient } from '@/src/lib/supabase/server';


export async function POST(request: NextRequest) {
  const body = await parseJsonObject(request);
  const parsedChip = chipIdSchema.safeParse(body?.chipId);
  if (!parsedChip.success) return NextResponse.json({ error: 'Puce inconnue.' }, { status: 404 });

  const chipId = parsedChip.data;
  try {
    const supabase = createSupabaseServiceClient();
    const { data: chip, error: chipError } = await supabase
      .from('chips')
      .select('id, status')
      .eq('id', chipId)
      .maybeSingle();
    if (chipError) throw chipError;
    if (!chip || chip.status !== 'active') {
      return NextResponse.json({ error: 'Cette puce n’est pas activée.' }, { status: 404 });
    }

    const deviceHash = hashRequestDevice(request, body?.deviceId);
    const { data: accepted, error } = await supabase.rpc('record_public_scan', {
      p_chip_id: chipId,
      p_device_hash: deviceHash
    });
    if (error) throw error;
    if (!accepted) return NextResponse.json({ error: 'Trop de scans rapprochés. Réessayez dans un instant.' }, { status: 429 });
    return NextResponse.json({ recorded: true });
  } catch (error) {
    console.error('Public NFC/QR scan could not be recorded.', error);
    return NextResponse.json({ error: 'Le scan est momentanément indisponible.' }, { status: 503 });
  }
}
