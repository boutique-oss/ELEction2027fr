import { chargerSondages, resume } from '@/lib/sondages';
import { sondagesTSV, reponseTSV } from '@/lib/tsv';

const CACHE = 's-maxage=900, stale-while-revalidate=3600';

// GET /api/sondages?mode=moyenne|dernier
// ?format=tsv : résultats calculés en texte pour le widget Rainmeter (au lieu de refaire la moyenne en Lua)
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const mode = q.get('mode') === 'dernier' ? 'dernier' : 'moyenne';
  try {
    const r = resume(await chargerSondages(), { mode });
    if (q.get('format') === 'tsv') return reponseTSV(sondagesTSV(r), CACHE);
    return Response.json(r, { headers: { 'Cache-Control': CACHE } });
  } catch (e) {
    return Response.json({ erreur: String(e.message || e) }, { status: 502 });
  }
}
