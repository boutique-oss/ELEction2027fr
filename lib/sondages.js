// Sondages : lecture du CSV Sondax (data.gouv.fr) et moyenne pondérée.
// Pas d'accumulation : seule la dernière enquête de chaque institut publiée
// sur les 7 derniers jours compte (une vague « rolling » ne pèse pas plus
// qu'un sondage ponctuel). Si aucune enquête sur 7 jours, on prend la
// semaine qui précède le dernier sondage publié.
// poids = récence (demi-vie 3 jours, mesurée au milieu du terrain)
//         x racine de l'échantillon (plafonnée à 3 000).
// Neutralité : chaque score est corrigé de l'« effet maison » de son institut,
// c'est-à-dire son écart moyen aux autres instituts sur 90 jours pour ce
// candidat. Un institut qui donne toujours 2 points de plus à un parti ne
// déplace donc plus la moyenne en sa faveur.
import { couleurParti, photo, PARTIS, FICHES_SONDAX } from './candidats';
import { jourMois, terrain, milliers, pct, nomCourt } from './format';

export const URL_CSV = 'https://www.data.gouv.fr/api/1/datasets/r/6b97e100-6031-42e0-9c93-aeb9dd49ef0d';
export const REGLAGES = { demiVie: 3, fenetre: 7, tendance: 7, historique: 90 };
// Effet de plan des panels en ligne par quotas : l'échantillon « utile » est plus petit que l'échantillon annoncé
const EFFET_PLAN = 1.5;
const JOUR = 86400000;

function champs(ligne) {
  const t = [];
  let i = 0;
  while (i <= ligne.length) {
    if (ligne[i] === '"') {
      let v = '', j = i + 1;
      for (;;) {
        const q = ligne.indexOf('"', j);
        if (q < 0) { v += ligne.slice(j); i = ligne.length + 1; break; }
        v += ligne.slice(j, q);
        if (ligne[q + 1] === '"') { v += '"'; j = q + 2; } else { i = q + 2; break; }
      }
      t.push(v);
    } else {
      let c = ligne.indexOf(',', i);
      if (c < 0) c = ligne.length;
      t.push(ligne.slice(i, c));
      i = c + 1;
    }
  }
  return t;
}

function date(s) {
  const m = /^(\d+)-(\d+)-(\d+)/.exec(s || '');
  return m ? Date.UTC(+m[1], m[2] - 1, +m[3], 10) : null;
}

export function analyser(txt) {
  const lignes = txt.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const entete = champs(lignes[0]);
  const col = Object.fromEntries(entete.map((n, i) => [n, i]));
  const parId = new Map();
  const liste = [];
  for (const l of lignes.slice(1)) {
    const c = champs(l);
    const g = (k) => c[col[k]] ?? '';
    const score = parseFloat(g('score'));
    const fin = date(g('terrain_fin'));
    const id = g('sondage_id');
    if (!id || isNaN(score) || !fin) continue;
    let p = parId.get(id);
    if (!p) {
      p = { id, institut: g('institut'), fin, debut: date(g('terrain_debut')), n: parseInt(g('echantillon')) || null,
            url: g('url_source'), t1: new Map(), t2: new Map(), ordre: liste.length };
      parId.set(id, p);
      liste.push(p);
    }
    const tour = g('tour') === '2' ? p.t2 : p.t1;
    const k = parseInt(g('configuration')) || 1;
    if (!tour.has(k)) tour.set(k, { num: k, cands: [], n: parseInt(g('echantillon_configuration')) || null });
    const cfg = tour.get(k);
    if (g('configuration_principale') === '1') cfg.principale = true;
    cfg.cands.push({ id: g('candidat_id'), nom: g('candidat'), parti: g('parti'), score });
  }
  liste.sort((a, b) => b.fin - a.fin || a.ordre - b.ordre);
  for (const p of liste) {
    const cfgs = [...p.t1.values()];
    p.principale = cfgs.find((c) => c.principale) || cfgs.sort((a, b) => a.num - b.num)[0] || null;
  }
  return liste;
}

export async function chargerSondages() {
  const r = await fetch(URL_CSV, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`CSV indisponible (${r.status})`);
  return analyser(await r.text());
}

const milieu = (p) => (p.debut && p.debut <= p.fin ? (p.debut + p.fin) / 2 : p.fin);

// Dernière enquête de chaque institut terminée dans [ref - fenetre, ref]
function poids(sondages, ref, fenetre, demiVie, filtre = () => true) {
  const w = new Map(), dernier = new Map();
  for (const p of sondages) {
    const age = (ref - p.fin) / JOUR;
    if (age < -0.5 || age > fenetre || !filtre(p)) continue;
    const d = dernier.get(p.institut);
    if (!d || p.fin > d.fin || (p.fin === d.fin && p.ordre < d.ordre)) dernier.set(p.institut, p);
  }
  for (const p of dernier.values()) {
    const age = Math.max((ref - milieu(p)) / JOUR, 0);
    w.set(p, 0.5 ** (age / demiVie) * Math.sqrt(Math.min(p.n || 1000, 3000) / 1000));
  }
  return w;
}

// Aucune enquête sur la semaine : la semaine qui précède le dernier sondage publié
function poidsOuTout(sondages, ref, r, filtre) {
  const w = poids(sondages, ref, r.fenetre, r.demiVie, filtre);
  if (w.size) return { w, ref };
  let der = -Infinity;
  for (const p of sondages) if (p.fin <= ref + JOUR / 2 && filtre(p)) der = Math.max(der, p.fin);
  return der > -Infinity ? { w: poids(sondages, der, r.fenetre, r.demiVie, filtre), ref: der } : { w, ref };
}

// Effet maison : pour chaque institut et chaque candidat, écart moyen au consensus des AUTRES
// instituts (même semaine), sur les 90 derniers jours. Une vague par institut et par semaine
// (les vagues rolling se recoupent), rétréci vers 0 quand il y a peu de comparaisons, plafonné à 3 points.
const RETRECI = 3, PLAFOND = 3;
export function effetsMaison(sondages, ref = Date.now(), r = REGLAGES) {
  const acc = new Map(), garde = new Map();
  for (const p of [...sondages].sort((a, b) => b.fin - a.fin)) {
    const age = (ref - p.fin) / JOUR;
    if (age < -0.5 || age > r.historique || !p.principale) continue;
    if (garde.has(p.institut) && garde.get(p.institut) - p.fin < 7 * JOUR) continue;
    const autres = poids(sondages, p.fin, r.fenetre, r.demiVie, (q) => q.principale && q.institut !== p.institut);
    if (autres.size < 2) continue;
    garde.set(p.institut, p.fin);
    for (const c of p.principale.cands) {
      let sw = 0, sws = 0;
      for (const [q, x] of autres) {
        const d = q.principale.cands.find((e) => e.id === c.id);
        if (d) { sw += x; sws += x * d.score; }
      }
      if (!sw) continue;
      const k = `${p.institut}|${c.id}`;
      const e = acc.get(k) || { s: 0, n: 0 };
      e.s += c.score - sws / sw; e.n++;
      acc.set(k, e);
    }
  }
  const h = new Map();
  for (const [k, e] of acc) h.set(k, Math.max(-PLAFOND, Math.min(PLAFOND, e.s / (e.n + RETRECI))));
  return h;
}

export function moyenne1(sondages, ref = Date.now(), r = REGLAGES, h = effetsMaison(sondages, ref, r)) {
  const { w, ref: fin } = poidsOuTout(sondages, ref, r, (p) => p.principale);
  let tot = 0, nb = 0;
  const acc = new Map();
  for (const [p, x] of w) {
    const cfg = p.principale;
    if (!cfg) continue;
    tot += x; nb++;
    const n = (cfg.n || p.n || 1000) / EFFET_PLAN;
    for (const c of cfg.cands) {
      let a = acc.get(c.id);
      if (!a) { a = { id: c.id, nom: c.nom, parti: c.parti, sw: 0, sws: 0, sw2: 0, v: 0, pts: [], nb: 0, min: c.score, max: c.score, dernier: 0 }; acc.set(c.id, a); }
      const sc = Math.max(0, c.score - (h.get(`${p.institut}|${c.id}`) || 0));
      const s = sc / 100;
      a.sw += x; a.sws += x * sc; a.sw2 += x * x; a.v += x * x * s * (1 - s) / n; a.pts.push([x, sc]); a.nb++;
      a.min = Math.min(a.min, c.score); a.max = Math.max(a.max, c.score);
      if (p.fin > a.dernier) { a.dernier = p.fin; a.nom = c.nom; a.parti = c.parti; }
    }
  }
  const res = [];
  for (const a of acc.values()) {
    if (tot > 0 && a.sw / tot >= 0.4) {
      a.score = a.sws / a.sw;
      // Marge : aléa d'échantillonnage, ou écart entre instituts s'il est plus grand (effets maison)
      let ecart = 0;
      if (a.nb >= 3) {
        for (const [x, s] of a.pts) ecart += x * (s - a.score) ** 2;
        ecart = (ecart / a.sw) * (a.sw2 / (a.sw * a.sw)) / 1e4;
      }
      a.marge = 196 * Math.sqrt(Math.max(a.v / (a.sw * a.sw), ecart));
      delete a.pts;
      res.push(a);
    }
  }
  res.sort((a, b) => b.score - a.score);
  return { res, nb, fin, w, tot, utilises: [...w.keys()].sort((a, b) => b.fin - a.fin) };
}

export function dernier1(sondages) {
  const p = sondages[0];
  if (!p || !p.principale) return { res: [], p };
  const n = p.principale.n || p.n || 1000;
  const res = p.principale.cands.map((c) => {
    const s = c.score / 100;
    return { id: c.id, nom: c.nom, parti: c.parti, score: c.score, marge: 196 * Math.sqrt(s * (1 - s) / n), nb: 1, min: c.score, max: c.score };
  }).sort((a, b) => b.score - a.score);
  return { res, p };
}

// Duels d'un sondage : « a|b » (ids triés) -> part de a en suffrages exprimés (moyenne des configurations)
function paires(p) {
  const parPaire = new Map();
  for (const cfg of p.t2.values()) {
    if (cfg.cands.length !== 2) continue;
    let [a, b] = cfg.cands;
    if (a.id > b.id) [a, b] = [b, a];
    const tot = a.score + b.score;
    if (tot <= 0) continue;
    const k = `${a.id}|${b.id}`;
    const e = parPaire.get(k) || { a, b, s: 0, n: 0 };
    e.s += 100 * a.score / tot; e.n++;
    parPaire.set(k, e);
  }
  for (const e of parPaire.values()) e.part = e.s / e.n;
  return parPaire;
}

// Effet maison au 2nd tour : même principe qu'au 1er tour, par institut et par duel
export function effetsDuels(sondages, ref = Date.now(), r = REGLAGES) {
  const acc = new Map(), garde = new Map();
  for (const p of [...sondages].sort((a, b) => b.fin - a.fin)) {
    const age = (ref - p.fin) / JOUR;
    if (age < -0.5 || age > r.historique || !p.t2.size) continue;
    if (garde.has(p.institut) && garde.get(p.institut) - p.fin < 7 * JOUR) continue;
    const autres = poids(sondages, p.fin, r.fenetre, r.demiVie, (q) => q.t2.size && q.institut !== p.institut);
    if (autres.size < 2) continue;
    garde.set(p.institut, p.fin);
    const autresPaires = [...autres].map(([q, x]) => [paires(q), x]);
    for (const [k, e] of paires(p)) {
      let sw = 0, sws = 0;
      for (const [pq, x] of autresPaires) {
        const d = pq.get(k);
        if (d) { sw += x; sws += x * d.part; }
      }
      if (!sw) continue;
      const kk = `${p.institut}|${k}`;
      const c = acc.get(kk) || { s: 0, n: 0 };
      c.s += e.part - sws / sw; c.n++;
      acc.set(kk, c);
    }
  }
  const h = new Map();
  for (const [k, e] of acc) h.set(k, Math.max(-PLAFOND, Math.min(PLAFOND, e.s / (e.n + RETRECI))));
  return h;
}

export function duels(sondages, { seulDernier = false, ref = Date.now(), r = REGLAGES, h = new Map() } = {}) {
  let w = new Map();
  if (seulDernier) {
    const p = sondages.find((q) => q.t2.size);
    if (p) w.set(p, 1);
  } else {
    w = poidsOuTout(sondages, ref, r, (p) => p.t2.size).w;
  }
  const D = new Map();
  for (const [p, x] of w) {
    for (const [k, e] of paires(p)) {
      let d = D.get(k);
      if (!d) { d = { a: e.a, b: e.b, sw: 0, sws: 0, nb: 0, dernier: p }; D.set(k, d); }
      d.sw += x; d.sws += x * (e.part - (h.get(`${p.institut}|${k}`) || 0)); d.nb++;
      if (p.fin > d.dernier.fin) d.dernier = p;
    }
  }
  const res = [...D.values()].map((d) => {
    const sa = d.sws / d.sw;
    return sa >= 50 ? { ...d, g: d.a, d: d.b, sg: sa } : { ...d, g: d.b, d: d.a, sg: 100 - sa };
  });
  res.sort((x, y) => (Math.abs(x.sw - y.sw) > 1e-9 ? y.sw - x.sw : y.sg - x.sg));
  return { res, w, utilises: [...w.keys()].filter((p) => p.t2.size).sort((a, b) => b.fin - a.fin) };
}

// « Ifop (4 sondages, 24 août – 14 oct.) · OpinionWay (…) »
export function sourcesParInstitut(liste) {
  const parInst = new Map();
  for (const p of liste) {
    const e = parInst.get(p.institut) || { nom: p.institut, n: 0, debut: p.debut || p.fin, fin: p.fin };
    e.n++; e.debut = Math.min(e.debut, p.debut || p.fin); e.fin = Math.max(e.fin, p.fin);
    parInst.set(p.institut, e);
  }
  return [...parInst.values()].sort((a, b) => b.fin - a.fin).map((e) =>
    `${e.nom} (${e.n} sondage${e.n > 1 ? 's' : ''}, ${e.n > 1 ? `${jourMois(e.debut)} – ${jourMois(e.fin)}` : terrain(e.debut, e.fin)})`).join(' · ');
}

// Instituts retenus, pour les stories : date du terrain, échantillon, part du poids,
// et la plus forte correction d'effet maison appliquée (« Bardella −1,4 »)
function retenus(w, h = new Map(), tour = 1) {
  let tot = 0;
  for (const x of w.values()) tot += x;
  return [...w].sort((a, b) => b[0].fin - a[0].fin).map(([p, x]) => {
    let corr = null;
    const garder = (nom, v) => { if (Math.abs(v) >= 0.3 && (!corr || Math.abs(v) > Math.abs(corr.v))) corr = { nom, v }; };
    if (tour === 1) for (const c of p.principale?.cands || []) garder(nomCourt(c.nom), h.get(`${p.institut}|${c.id}`) || 0);
    else for (const [k, e] of paires(p)) {
      // exprimé du côté du candidat favorisé : « Bardella (vs Philippe) −1,2 »
      const v = h.get(`${p.institut}|${k}`) || 0;
      if (v >= 0) garder(`${nomCourt(e.a.nom)} (vs ${nomCourt(e.b.nom)})`, v);
      else garder(`${nomCourt(e.b.nom)} (vs ${nomCourt(e.a.nom)})`, -v);
    }
    return { nom: p.institut, terrain: terrain(p.debut, p.fin), n: p.n, poids: tot ? Math.round(100 * x / tot) : 100,
             correction: corr ? `${corr.nom} ${corr.v > 0 ? '−' : '+'}${pct(Math.abs(corr.v))}` : null };
  });
}

// Tout ce dont la page, le widget iPhone et les stories ont besoin
export function resume(sondages, { mode = 'moyenne', r = REGLAGES } = {}) {
  const now = Date.now();
  let res, sous, avant = new Map(), sources, instituts1 = [];
  if (mode === 'dernier') {
    const d = dernier1(sondages);
    res = d.res;
    const p = d.p;
    const prec = sondages.find((q) => q !== p && q.institut === p.institut && q.principale);
    if (prec) for (const c of prec.principale.cands) avant.set(c.id, c.score);
    sous = `Sondage ${p.institut} · ${terrain(p.debut, p.fin)} · ${milliers(p.n)} pers.`;
    sources = `Sondage ${p.institut}, terrain du ${terrain(p.debut, p.fin)}, ${milliers(p.n)} personnes interrogées (hypothèse principale).`;
    instituts1 = retenus(new Map([[p, 1]]));
  } else {
    const h = effetsMaison(sondages, now, r);
    const m = moyenne1(sondages, now, r, h);
    res = m.res;
    for (const a of moyenne1(sondages, m.fin - r.tendance * JOUR, r, h).res) avant.set(a.id, a.score);
    instituts1 = retenus(m.w, h);
    sous = `Moyenne de ${m.nb} sondage${m.nb > 1 ? 's' : ''} · ${m.fin === now ? `${r.fenetre} derniers jours`
      : `${jourMois(m.fin - r.fenetre * JOUR)} – ${jourMois(m.fin)}`}`;
    sources = sourcesParInstitut(m.utilises);
  }
  const max = Math.max(10, ...res.map((a) => a.score));
  const premierTour = res.map((a, i) => ({
    id: a.id, nom: a.nom, parti: a.parti, partiNom: PARTIS[a.parti]?.nom || a.parti, couleur: couleurParti(a.parti),
    photo: photo(a.id), score: Math.round(a.score * 10) / 10, affiche: `${pct(a.score)} %`, marge: Math.round(a.marge * 10) / 10,
    nb: a.nb, min: a.min, max: a.max, rang: i + 1, largeur: a.score / max,
    evolution: avant.has(a.id) ? Math.round((a.score - avant.get(a.id)) * 10) / 10 : null,
    ficheSondax: FICHES_SONDAX.has(a.id),
  }));
  const h2 = mode === 'dernier' ? new Map() : effetsDuels(sondages, now, r);
  const dl = duels(sondages, { seulDernier: mode === 'dernier', r, h: h2 });
  const secondTour = dl.res.slice(0, 8).map((d) => ({
    g: { id: d.g.id, nom: d.g.nom, parti: d.g.parti, couleur: couleurParti(d.g.parti), photo: photo(d.g.id) },
    d: { id: d.d.id, nom: d.d.nom, parti: d.d.parti, couleur: couleurParti(d.d.parti), photo: photo(d.d.id) },
    sg: Math.round(d.sg * 10) / 10, nb: d.nb, dernier: `${d.dernier.institut} ${jourMois(d.dernier.fin)}`,
  }));
  const liste = sondages.slice(0, 40).map((p) => {
    const top = p.principale ? [...p.principale.cands].sort((a, b) => b.score - a.score).slice(0, 3).map((c) => `${nomCourt(c.nom)} ${pct(c.score)}`) : [];
    return { id: p.id, institut: p.institut, terrain: terrain(p.debut, p.fin), n: p.n, top: top.join(' · '), notice: p.url,
             hypotheses: p.t1.size, duels: p.t2.size };
  });
  return {
    maj: now, mode, sous, premierTour, secondTour, liste,
    sources: { premierTour: sources, secondTour: sourcesParInstitut(dl.utilises) },
    instituts: { premierTour: instituts1, secondTour: retenus(new Map([...dl.w].filter(([p]) => p.t2.size)), h2, 2) },
    total: sondages.length, dernier: sondages[0] ? jourMois(sondages[0].fin) : null,
  };
}

// Courbe d'un candidat : chaque sondage (hypothèse principale) et moyenne glissante
export function serie(sondages, id, r = REGLAGES) {
  const pts = [];
  for (const p of sondages) {
    const c = p.principale?.cands.find((x) => x.id === id);
    if (c) pts.push({ t: p.fin, s: c.score, institut: p.institut });
  }
  pts.sort((a, b) => a.t - b.t);
  const h = effetsMaison(sondages, Date.now(), r);
  return pts.map((p) => {
    const m = moyenne1(sondages, p.t, r, h).res.find((a) => a.id === id);
    return { ...p, m: m ? Math.round(m.score * 10) / 10 : null };
  });
}
