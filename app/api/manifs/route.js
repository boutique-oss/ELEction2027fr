import { chargerManifs } from '@/lib/manifs';
import { nationalesTSV, reponseTSV } from '@/lib/tsv';

// GET /api/manifs : Démosphère Poitiers + appels nationaux
// ?format=tsv : appels nationaux en texte pour le widget Rainmeter (il lit Démosphère lui-même)
const CACHE = 's-maxage=1800, stale-while-revalidate=3600';

export async function GET(req) {
  const m = await chargerManifs();
  if (new URL(req.url).searchParams.get('format') === 'tsv') return reponseTSV(nationalesTSV(m), CACHE);
  return Response.json(m, { headers: { 'Cache-Control': CACHE } });
}
