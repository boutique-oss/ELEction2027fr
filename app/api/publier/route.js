// Publication d'une story Instagram via l'API officielle de Meta (Instagram Graph API, publication de contenu).
// Rien n'est publié autrement.
//
// Variables d'environnement (réglages Vercel, jamais dans le code) :
//   META_IG_USER_ID     identifiant du compte Instagram professionnel (relié à une page Facebook)
//   META_ACCESS_TOKEN   jeton d'accès longue durée avec les permissions instagram_basic et instagram_content_publish
//   META_API_VERSION    version de l'API Graph (par défaut v23.0)
//   PUBLICATION_CLE     code secret à saisir pour publier (empêche n'importe qui de publier depuis le site)
//
// GET  /api/publier                       -> { configure: true|false }
// POST /api/publier { tour, mode, cle }   -> { ok, id } ou { erreur }
import { timingSafeEqual } from 'node:crypto';
import { paris } from '@/lib/format';

export const runtime = 'nodejs';
export const maxDuration = 60;

const env = () => ({
  ig: process.env.META_IG_USER_ID, jeton: process.env.META_ACCESS_TOKEN,
  version: process.env.META_API_VERSION || 'v23.0', cle: process.env.PUBLICATION_CLE,
});

function cleValide(fournie, attendue) {
  const a = Buffer.from(String(fournie || '')), b = Buffer.from(String(attendue || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

async function graph(e, chemin, params, methode = 'POST') {
  const url = new URL(`https://graph.facebook.com/${e.version}/${chemin}`);
  const corps = new URLSearchParams({ ...params, access_token: e.jeton });
  const r = methode === 'GET'
    ? await fetch(`${url}?${corps}`, { cache: 'no-store' })
    : await fetch(url, { method: 'POST', body: corps, cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error?.message || `Meta a répondu ${r.status}`);
  return d;
}

export function GET() {
  const e = env();
  return Response.json({ configure: !!(e.ig && e.jeton && e.cle) });
}

export async function POST(req) {
  const e = env();
  if (!(e.ig && e.jeton && e.cle)) return Response.json({ erreur: 'Publication non configurée sur le serveur (variables META_* et PUBLICATION_CLE).' }, { status: 503 });

  let b = {};
  try { b = await req.json(); } catch {}
  if (!cleValide(b.cle, e.cle)) return Response.json({ erreur: 'Code de publication incorrect.' }, { status: 403 });

  // publication de sondages interdite la veille et le jour du vote (loi du 19 juillet 1977)
  const p = paris(Date.now());
  const auj = `${p.an}-${String(p.mois).padStart(2, '0')}-${String(p.jour).padStart(2, '0')}`;
  if (['2027-04-17', '2027-04-18', '2027-05-01', '2027-05-02'].includes(auj)) {
    return Response.json({ erreur: 'Publication de sondages interdite la veille et le jour du vote.' }, { status: 451 });
  }

  const tour = b.tour === 2 || b.tour === '2' ? 2 : 1;
  const mode = b.mode === 'dernier' ? 'dernier' : 'moyenne';
  const origine = new URL(req.url).origin;
  const image = `${origine}/api/story/${tour}?format=jpg&mode=${mode}&v=${Date.now()}`;

  try {
    // 1. conteneur de story : Meta télécharge l'image à cette adresse
    const conteneur = await graph(e, `${e.ig}/media`, { image_url: image, media_type: 'STORIES' });
    // 2. attendre que Meta ait traité l'image
    for (let i = 0; i < 20; i++) {
      const s = await graph(e, conteneur.id, { fields: 'status_code,status' }, 'GET');
      if (s.status_code === 'FINISHED') break;
      if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Image refusée par Meta : ${s.status || s.status_code}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
    // 3. publication
    const pub = await graph(e, `${e.ig}/media_publish`, { creation_id: conteneur.id });
    return Response.json({ ok: true, id: pub.id, tour, mode });
  } catch (err) {
    return Response.json({ erreur: String(err.message || err) }, { status: 502 });
  }
}
