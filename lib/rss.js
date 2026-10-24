// Actu : une recherche Google Actualités par média retenu (filtre « site: »),
// le média est identifié par la source réelle de l'article (Google en ajoute parfois d'autres),
// puis filtrage de pertinence et regroupement par sujet.
// Une info est « importante » si au moins 2 médias différents la reprennent en 36 h.
import { MEDIAS } from './contenu';
import { NOMS } from './candidats';
import { entites, sansBalises } from './format';

const BASE = 'https://news.google.com/rss/search?hl=fr&gl=FR&ceid=FR:fr&q=';

const TERMES = '(présidentielle OR candidat OR candidate OR Mélenchon OR "Le Pen" OR Bardella OR "Édouard Philippe" OR Glucksmann OR Retailleau OR Attal OR Zemmour OR Tondelier OR Roussel)';
const TERMES_MOBILISATION = '("grève nationale" OR "journée de mobilisation" OR "appel à manifester" OR intersyndicale OR "mobilisation nationale" OR manifestation)';

// élections étrangères qui remontent avec « présidentielle »
// (gardé seulement si un candidat français est aussi cité)
const ETRANGER = /Brésil|Bolsonaro|Lula|Trump|Meloni|Italie|Argentine|Chili|Pérou|Équateur|Equateur|Venezuela|Mexique|États-Unis|Etats-Unis|Côte d.Ivoire|Cameroun|Tanzanie|Sénégal|Mali|Algérie|Tunisie|Gabon|Congo|Bénin|Togo|Guinée|Madagascar|Haïti|Pologne|Moldavie|Roumanie|Portugal|Irlande|Colombie|Bolivie|Corée|Taïwan/i;

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

export function domaine(url) {
  const h = ((/^https?:\/\/([^/]+)/.exec(url || '') || [])[1] || '').toLowerCase().replace(/^www\./, '');
  if (MEDIAS[h]) return h;
  return Object.keys(MEDIAS).find((d) => h.endsWith(`.${d}`)) || null;
}

// Lit un flux Google Actualités et ne garde que les articles des médias retenus
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
    items.push({ titre, lien, domaine: d, media: MEDIAS[d].nom, famille: MEDIAS[d].famille, date, mots: mots(titre), cands: candidatsDe(titre) });
  }
  return items;
}

// Une recherche par média, 6 à la fois ; un média injoignable n'arrête pas les autres
async function parMedia(termes, domaines, fenetre, revalidate) {
  const res = [];
  for (let i = 0; i < domaines.length; i += 6) {
    const lot = await Promise.allSettled(domaines.slice(i, i + 6).map((d) => lireFlux(`${termes} site:${d} when:${fenetre}`, revalidate)));
    for (const r of lot) if (r.status === 'fulfilled') res.push(...r.value);
  }
  // le même article peut remonter par plusieurs recherches
  const vus = new Set();
  return res.filter((it) => { const k = `${it.domaine}|${it.titre}`; if (vus.has(k)) return false; vus.add(k); return true; });
}

export function regrouper(items, now = Date.now()) {
  items.sort((a, b) => b.date - a.date);
  const clusters = [];
  for (const it of items) {
    const cible = clusters.find((c) => {
      const memeCand = (!it.cands.length && !c.cands.length) || it.cands.some((x) => c.cands.includes(x));
      return memeCand && proches(it, c.tete);
    });
    if (cible) {
      if (!cible.items.some((x) => x.domaine === it.domaine && x.titre === it.titre)) cible.items.push(it);
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
  const autres = [...c.sources].filter((d) => d !== c.tete.domaine).map((d) => ({ nom: MEDIAS[d].nom, famille: MEDIAS[d].famille }));
  return {
    titre: c.tete.titre, lien: c.tete.lien, media: c.tete.media, famille: c.tete.famille, date: c.date, important: c.important,
    candidats: c.cands, nbSources: c.sources.size, cle: c.cle,
    medias: [c.tete.media, ...autres.map((a) => a.nom).sort()], autres: autres.sort((a, b) => a.nom.localeCompare(b.nom)),
    articles: c.items.slice(0, 5).map((i) => ({ media: i.media, famille: i.famille, titre: i.titre, lien: i.lien })),
  };
}

export async function chargerActu() {
  const items = (await parMedia(TERMES, Object.keys(MEDIAS), '2d', 900))
    .filter((it) => it.cands.length || (/pr[ée]sidentielle/i.test(it.titre) && !ETRANGER.test(it.titre)));
  const clusters = regrouper(items);
  clusters.sort((x, y) => (x.important !== y.important ? (x.important ? -1 : 1) : y.date - x.date));
  const parFamille = {};
  for (const it of items) parFamille[it.famille] = (parFamille[it.famille] || 0) + 1;
  return { maj: Date.now(), articles: items.length, parFamille, infos: clusters.slice(0, 60).map(publier) };
}

// Appels nationaux à manifester, cherchés sur les médias qui couvrent le social
const MEDIAS_MOBILISATION = ['francetvinfo.fr', 'ouest-france.fr', 'publicsenat.fr', 'la-croix.com', 'mediapart.fr', 'basta.media',
  'politis.fr', 'rfi.fr', 'france24.com', 'radiofrance.fr', 'lcp.fr', 'alternatives-economiques.fr'];

export async function fluxMobilisation() {
  return (await parMedia(TERMES_MOBILISATION, MEDIAS_MOBILISATION, '7d', 3600)).filter((it) => it.cands.length || !ETRANGER.test(it.titre));
}
