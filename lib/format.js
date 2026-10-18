// Mise en forme française (heure de Paris, même sur un serveur en UTC)

export const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const TZ = 'Europe/Paris';

// Composantes d'une date à l'heure de Paris
export function paris(t) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(new Date(t))) p[x.type] = x.value;
  return { an: +p.year, mois: +p.month, jour: +p.day, heure: +p.hour, min: +p.minute, semaine: p.weekday };
}

// Instant UTC correspondant à une heure locale de Paris
export function depuisParis(an, mois, jour, h = 0, mi = 0) {
  const approx = Date.UTC(an, mois - 1, jour, h, mi);
  const p = paris(approx);
  const decalage = Date.UTC(p.an, p.mois - 1, p.jour, p.heure, p.min) - approx;
  return approx - decalage;
}

export function num(x, d = 1) {
  return x.toFixed(d).replace('.', ',');
}

export function pct(x) {
  return Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : num(x, 1);
}

export function milliers(n) {
  return Math.round(n || 0).toLocaleString('fr-FR').replace(/ /g, ' ');
}

export function jourMois(t) {
  const p = paris(t);
  return `${p.jour}${p.jour === 1 ? 'er' : ''} ${MOIS[p.mois - 1]}`;
}

// « sam. », « lun. »… (Intl renvoie déjà l'abréviation française)
export function jourSemaine(t) {
  return paris(t).semaine;
}

export function heure(t) {
  const p = paris(t);
  return `${String(p.heure).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
}

export function terrain(debut, fin) {
  if (!debut || jourMois(debut) === jourMois(fin)) return jourMois(fin);
  const a = paris(debut), b = paris(fin);
  if (a.mois === b.mois) return `${a.jour}–${b.jour} ${MOIS[b.mois - 1]}`;
  return `${jourMois(debut)} – ${jourMois(fin)}`;
}

export function depuis(t, now = Date.now()) {
  const s = (now - t) / 1000;
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return jourMois(t);
}

export function initiales(s) {
  const mots = (s || '').match(/[\p{L}\p{N}]+/gu) || [];
  if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase();
  return (mots[0] || '?').slice(0, 2);
}

export function nomCourt(nom) {
  const m = /^\S+\s+(.+)$/.exec(nom);
  return m ? m[1] : nom;
}

export function entites(s) {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export function sansBalises(s) {
  return entites((s || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}
