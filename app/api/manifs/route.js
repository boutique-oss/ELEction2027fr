import { chargerManifs } from '@/lib/manifs';

// GET /api/manifs : Démosphère Poitiers + appels nationaux
export async function GET() {
  return Response.json(await chargerManifs(), { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } });
}
