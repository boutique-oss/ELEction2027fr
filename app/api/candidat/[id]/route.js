import { chargerSondages, serie } from '@/lib/sondages';
import { chargerFicheSondax } from '@/lib/sondax';
import { PROGRAMMES, NOTE_CRESUS, MAJ } from '@/lib/contenu';

// GET /api/candidat/melenchon : courbe, fiche Sondax et débrief du programme
export async function GET(req, { params }) {
  const { id } = await params;
  const [s, f] = await Promise.allSettled([chargerSondages(), chargerFicheSondax(id)]);
  const programme = PROGRAMMES[id] || null;
  return Response.json({
    id,
    serie: s.status === 'fulfilled' ? serie(s.value, id) : [],
    sondax: f.status === 'fulfilled' ? f.value : null,
    programme,
    noteCresus: programme?.cresus ? NOTE_CRESUS : null,
    redige: MAJ,
  }, { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=7200' } });
}
