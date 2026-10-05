export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true, service: 'digifeel', time: new Date().toISOString() }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}