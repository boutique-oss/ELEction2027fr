import { chargerActu } from '@/lib/rss';

// GET /api/actu : infos des 48 dernières heures, médias filtrés, regroupées par sujet
export async function GET() {
  try {
    return Response.json(await chargerActu(), { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } });
  } catch (e) {
    return Response.json({ erreur: String(e.message || e) }, { status: 502 });
  }
}
