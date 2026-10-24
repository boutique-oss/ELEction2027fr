import { chargerActu } from '@/lib/rss';
import { actuTSV, reponseTSV } from '@/lib/tsv';

// GET /api/actu : infos des 48 dernières heures, une recherche par média retenu, regroupées par sujet
// ?format=tsv : version texte pour le widget Rainmeter
const CACHE = 's-maxage=600, stale-while-revalidate=1800';

export async function GET(req) {
  try {
    const a = await chargerActu();
    if (new URL(req.url).searchParams.get('format') === 'tsv') return reponseTSV(actuTSV(a), CACHE);
    return Response.json(a, { headers: { 'Cache-Control': CACHE } });
  } catch (e) {
    return Response.json({ erreur: String(e.message || e) }, { status: 502 });
  }
}
