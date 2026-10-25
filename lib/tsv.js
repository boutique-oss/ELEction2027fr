// Format texte pour le widget Rainmeter (Lua n'a pas de lecteur JSON) :
// une ligne par élément, champs séparés par des tabulations, horodatages en secondes.
const champ = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ');
const ligne = (...v) => v.map(champ).join('\t');
const sec = (t) => (t ? Math.round(t / 1000) : 0);

// #maj  horodatage  nb articles
// I  important  famille  média  date  lien  candidats(a,b)  autres(nom|famille;…)  titre  clé
export function actuTSV(a) {
  const l = [ligne('#maj', sec(a.maj), a.articles)];
  for (const i of a.infos) {
    l.push(ligne('I', i.important ? 1 : 0, i.famille, i.media, sec(i.date), i.lien, i.candidats.join(','),
      i.autres.map((x) => `${x.nom}|${x.famille}`).join(';'), i.titre, i.cle));
  }
  return l.join('\n') + '\n';
}

// N  uid  jour  nb médias  lien  médias(a,b)  titre
export function nationalesTSV(m) {
  const l = [ligne('#maj', sec(m.maj), m.nationales.length)];
  for (const n of m.nationales) l.push(ligne('N', n.uid, sec(n.jour), n.nbSources, n.lien, n.medias.join(','), n.titre));
  return l.join('\n') + '\n';
}

// Sondages déjà calculés par le site (même moyenne corrigée que la page et les stories) :
// #maj  horodatage  mode  sous-titre  dernier sondage
// C  rang  id  nom  parti  score  marge  évolution  nb sondages
// D  id gauche  nom  parti  id droite  nom  parti  % gauche  nb sondages  dernier
// S  tour(1|2)  institut  terrain  échantillon  poids %  biais corrigé
export function sondagesTSV(r) {
  const l = [ligne('#maj', sec(r.maj), r.mode, r.sous, r.dernier)];
  for (const c of r.premierTour) l.push(ligne('C', c.rang, c.id, c.nom, c.parti, c.score, c.marge, c.evolution ?? '', c.nb));
  for (const d of r.secondTour) l.push(ligne('D', d.g.id, d.g.nom, d.g.parti, d.d.id, d.d.nom, d.d.parti, d.sg, d.nb, d.dernier));
  for (const [t, liste] of [[1, r.instituts.premierTour], [2, r.instituts.secondTour]]) {
    for (const i of liste) l.push(ligne('S', t, i.nom, i.terrain, i.n ?? '', i.poids, i.correction ?? ''));
  }
  return l.join('\n') + '\n';
}

export function reponseTSV(texte, cache) {
  return new Response(texte, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': cache } });
}
