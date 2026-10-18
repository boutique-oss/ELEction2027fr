// Google Actualités (RSS) filtré sur une liste de médias reconnus, regroupé par sujet.
// Une info est « importante » si au moins 2 médias différents la reprennent en 36 h.
import { MEDIAS } from './contenu';
import { NOMS } from './candidats';
import { entites, sansBalises } from './format';

const BASE = 'https://news.google.com/rss/search?hl=fr&gl=FR&ceid=FR:fr&q=';

export const REQUETES = {
  candidats: 'Mélenchon OR "Le Pen" OR Bardella OR "Édouard Philippe" OR Glucksmann OR Retailleau OR Attal OR Zemmour OR Tondelier OR "Fabien Roussel" OR Hollande when:2d',
  presidentielle: 'présidentielle 2027 when:1d',
  national: '"grève nationale" OR "journée de mobilisation" OR "appel à manifester" OR intersyndicale OR "mobilisation nationale" when:7d',
};

const MOTS_VIDES = new Set(('dans avec pour sans sous selon entre contre après avant depuis pendant face mais plus moins tout tous toute toutes '
  + 'cette ces ses leur leurs elle elles sont sera seront avait avoir être été fait faire veut dit dire comme quand alors donc encore aussi '
  + 'très même autre autres nouvelle nouveau deux trois 2026 2027 présidentielle élection candidat candidate candidature campagne').split(' '));

function mots(titre) {
  return new Set((titre.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter((m) => m.length >= 4 && !MOTS_VIDES.has(m)));
}

function proches(a, b) {
  let commun = 0;
  for (const m of a.mots) if (b.mots.has(m)) commun++;
  const union = a.mots.size + b.mots.size - commun;
  return union > 0 && (commun >= 4 || commun / union >= 0.25);
}

function candidatsDe(titre) {
  return NOMS.filter(([, motifs]) => motifs.some((m) => titre.includes(m))).map(([id]) => id);
}

function domaine(url) {
  const h = ((/^https?:\/\/([^/]+)/.exec(url || '') || [])[1] || '').toLowerCase().replace(/^www\./, '');
  if (MEDIAS[h]) return h;
  const base = (/([\w-]+\.[\w-]+)$/.exec(h) || [])[1];
  return base && MEDIAS[base] ? base : null;
}

export async function lireFlux(requete, revalidate = 900) {
  const r = await fetch(BASE + encodeURIComponent(requete).replace(/%20/g, '+'), {
    next: { revalidate }, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ELEction2027fr)' },
  });
  if (!r.ok) throw new Error(`Google Actualités indisponible (${r.status})`);
  const xml = await r.text();
  const items = [];
  for (const [, bloc] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    let titre = sansBalises((/<title>([\s\S]*?)<\/title>/.exec(bloc) || [])[1]);
    const lien = entites((/<link>([\s\S]*?)<\/link>/.exec(bloc) || [])[1]);
    const src = /<source url="([^"]*)">([\s\S]*?)<\/source>/.exec(bloc);
    const d = domaine(src && src[1]);
    if (!d || !titre) continue;
    const fin = ` - ${entites(src[2])}`;
    if (titre.endsWith(fin)) titre = titre.slice(0, -fin.length);
    const date = Date.parse((/<pubDate>([\s\S]*?)<\/pubDate>/.exec(bloc) || [])[1]) || 0;
    items.push({ titre, lien, domaine: d, media: MEDIAS[d], date, mots: mots(titre), cands: candidatsDe(titre) });
  }
  return items;
}

export function regrouper(items, now = Date.now()) {
  items.sort((a, b) => b.date - a.date);
  const vus = new Set(), clusters = [];
  for (const it of items) {
    const cle = it.titre.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    const cible = clusters.find((c) => {
      const memeCand = (!it.cands.length && !c.cands.length) || it.cands.some((x) => c.cands.includes(x));
      return memeCand && proches(it, c.tete);
    });
    if (cible) {
      cible.items.push(it);
      cible.sources.add(it.domaine);
      cible.date = Math.max(cible.date, it.date);
    } else {
      clusters.push({ tete: it, items: [it], cands: it.cands, sources: new Set([it.domaine]), date: it.date });
    }
  }
  for (const c of clusters) {
    c.important = c.sources.size >= 2 && now - c.date <= 36 * 3600 * 1000;
    c.cle = [...c.tete.mots].sort().slice(0, 6).join(' ');
  }
  return clusters;
}

// Forme publique (sans les ensembles de mots)
export function publier(c) {
  return {
    titre: c.tete.titre, lien: c.tete.lien, media: c.tete.media, date: c.date, important: c.important,
    candidats: c.cands, nbSources: c.sources.size, medias: [...c.sources].map((d) => MEDIAS[d]).sort(),
    articles: c.items.slice(0, 5).map((i) => ({ media: i.media, titre: i.titre, lien: i.lien })),
  };
}

export async function chargerActu() {
  const [a, b] = await Promise.allSettled([lireFlux(REQUETES.candidats), lireFlux(REQUETES.presidentielle)]);
  const items = [...(a.status === 'fulfilled' ? a.value : []), ...(b.status === 'fulfilled' ? b.value : [])];
  const clusters = regrouper(items);
  clusters.sort((x, y) => (x.important !== y.important ? (x.important ? -1 : 1) : y.date - x.date));
  return { maj: Date.now(), articles: items.length, infos: clusters.slice(0, 60).map(publier) };
}
