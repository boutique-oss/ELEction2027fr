import { chargerSondages, resume } from '@/lib/sondages';

// GET /api/sondages?mode=moyenne|dernier
export async function GET(req) {
  const mode = new URL(req.url).searchParams.get('mode') === 'dernier' ? 'dernier' : 'moyenne';
  try {
    const s = await chargerSondages();
    return Response.json(resume(s, { mode }), { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=3600' } });
  } catch (e) {
    return Response.json({ erreur: String(e.message || e) }, { status: 502 });
  }
}
