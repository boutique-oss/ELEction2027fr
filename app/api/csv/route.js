import { URL_CSV } from '@/lib/sondages';

// GET /api/csv : le CSV Sondax (data.gouv.fr) relayé et mis en cache par le site.
// Le widget Rainmeter le lit ici : un seul serveur rapide au lieu de la redirection data.gouv.fr → sondax.fr,
// qui échoue parfois depuis Windows.
export async function GET() {
  try {
    const r = await fetch(URL_CSV, { next: { revalidate: 3600 } });
    if (!r.ok) throw new Error(`data.gouv.fr a répondu ${r.status}`);
    const csv = await r.text();
    if (!csv.startsWith('sondage_id') && !csv.startsWith('﻿sondage_id')) throw new Error('CSV inattendu');
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 's-maxage=1800, stale-while-revalidate=86400' },
    });
  } catch (e) {
    return new Response(`erreur : ${e.message || e}`, { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
