// Manifs : Démosphère Poitiers (iCal, thème Lutter-Résister) et appels nationaux
// repris par au moins 2 médias, regroupés par journée.
import { lireFlux, regrouper, publier, REQUETES } from './rss';
import { depuisParis, paris, MOIS_LONG } from './format';

export const URL_DEMOSPHERE = 'https://poitiers.demosphere.net/events.ics?selectTopic=12';

function dateICS(cle, valeur) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z?)/.exec(valeur);
  if (!m) return { t: null };
  const [, a, mo, j, h, mi, , z] = m;
  if (!h) return { t: depuisParis(+a, +mo, +j, 12), journee: true };
  if (z === 'Z') return { t: Date.UTC(+a, mo - 1, +j, +h, +mi) };
  return { t: depuisParis(+a, +mo, +j, +h, +mi) };
}

function texteICS(s) {
  return s.replace(/\\[nN]/g, ' ').replace(/\\([,;\\])/g, '$1').replace(/\s+/g, ' ').trim();
}

export async function chargerLocales() {
  const r = await fetch(URL_DEMOSPHERE, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`Démosphère indisponible (${r.status})`);
  const txt = (await r.text()).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const res = [], depuis = Date.now() - 3 * 3600 * 1000;
  for (const [, bloc] of txt.matchAll(/BEGIN:VEVENT\n([\s\S]*?)END:VEVENT/g)) {
    const e = {};
    for (const ligne of bloc.split('\n')) {
      const m = /^([^:]+):(.*)$/.exec(ligne);
      if (!m) continue;
      const nom = m[1].split(';')[0];
      if (nom === 'SUMMARY') e.titre = texteICS(m[2]);
      else if (nom === 'LOCATION') e.lieu = texteICS(m[2]);
      else if (nom === 'URL') e.url = m[2].trim();
      else if (nom === 'UID') e.uid = m[2].trim();
      else if (nom === 'DTSTART') { const d = dateICS(m[1], m[2]); e.debut = d.t; e.journee = !!d.journee; }
      else if (nom === 'DTEND') e.fin = dateICS(m[1], m[2]).t;
    }
    if (e.titre && e.debut && e.debut >= depuis) {
      e.uid = e.uid || e.url || e.titre;
      e.ville = (e.lieu || '').split(',')[0].trim();
      res.push(e);
    }
  }
  return res.sort((a, b) => a.debut - b.debut);
}

function dateDansTitre(titre, now = Date.now()) {
  const p = paris(now);
  for (const [, j, m] of titre.matchAll(/(\d{1,2})\s+([\p{L}]+)/gu)) {
    const k = MOIS_LONG.indexOf(m.toLowerCase());
    if (k < 0) continue;
    const an = k + 1 < p.mois - 1 ? p.an + 1 : p.an;
    const t = depuisParis(an, k + 1, +j, 12);
    if (t > now - 86400000 && t < now + 120 * 86400000) return t;
  }
  return null;
}

export async function chargerNationales() {
  const items = await lireFlux(REQUETES.national, 3600);
  const res = [], parJour = new Map();
  for (const c of regrouper(items)) {
    if (c.sources.size < 2) continue;
    c.jour = null;
    for (const it of c.items) c.jour = c.jour || dateDansTitre(it.titre);
    const jour = c.jour ? new Date(c.jour).toISOString().slice(0, 10) : null;
    const deja = jour && parJour.get(jour);
    if (deja) {
      for (const s of c.sources) deja.sources.add(s);
      deja.items.push(...c.items);
    } else {
      c.uid = jour ? `nat-${jour}` : `nat-${c.cle}`;
      if (jour) parJour.set(jour, c);
      res.push(c);
    }
  }
  res.sort((a, b) => (!!a.jour !== !!b.jour ? (a.jour ? -1 : 1) : a.jour && b.jour ? a.jour - b.jour : b.date - a.date));
  return res.map((c) => ({ ...publier(c), uid: c.uid, jour: c.jour }));
}

export async function chargerManifs() {
  const [l, n] = await Promise.allSettled([chargerLocales(), chargerNationales()]);
  return {
    maj: Date.now(),
    locales: l.status === 'fulfilled' ? l.value : [],
    nationales: n.status === 'fulfilled' ? n.value : [],
    erreurs: [l, n].filter((x) => x.status === 'rejected').map((x) => String(x.reason?.message || x.reason)),
  };
}

// Fichier .ics d'un seul événement (ajout au calendrier de l'iPhone en un appui)
export function ics({ uid, titre, debut, fin, journee, lieu, url }) {
  const f = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const jour = (t) => { const p = paris(t); return `${p.an}${String(p.mois).padStart(2, '0')}${String(p.jour).padStart(2, '0')}`; };
  const esc = (s) => (s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ELEction2027fr//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${esc(uid)}@election2027fr`, `DTSTAMP:${f(Date.now())}`];
  if (journee) {
    lignes.push(`DTSTART;VALUE=DATE:${jour(debut)}`, `DTEND;VALUE=DATE:${jour(debut + 86400000)}`);
  } else {
    lignes.push(`DTSTART:${f(debut)}`, `DTEND:${f(fin || debut + 2 * 3600 * 1000)}`);
  }
  lignes.push(`SUMMARY:${esc(titre)}`);
  if (lieu) lignes.push(`LOCATION:${esc(lieu)}`);
  if (url) lignes.push(`URL:${url}`, `DESCRIPTION:${esc(url)}`);
  lignes.push('END:VEVENT', 'END:VCALENDAR');
  return lignes.join('\r\n') + '\r\n';
}
