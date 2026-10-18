import { chargerManifs, ics } from '@/lib/manifs';

// GET /api/ics?uid=… : un événement au format iCalendar (« Ajouter au calendrier » sur iPhone)
export async function GET(req) {
  const uid = new URL(req.url).searchParams.get('uid') || '';
  const m = await chargerManifs();
  let e = m.locales.find((x) => x.uid === uid);
  if (!e) {
    const n = m.nationales.find((x) => x.uid === uid && x.jour);
    if (n) e = { uid: n.uid, titre: `Mobilisation nationale : ${n.titre}`, debut: n.jour, journee: true, url: n.lien };
  } else {
    e = { ...e, titre: `Manif : ${e.titre}` };
  }
  if (!e) return new Response('Événement introuvable', { status: 404 });
  return new Response(ics(e), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="manif-${uid.replace(/[^\w-]/g, '').slice(-24) || 'evenement'}.ics"`,
    },
  });
}
