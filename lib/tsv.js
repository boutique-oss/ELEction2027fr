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

export function reponseTSV(texte, cache) {
  return new Response(texte, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': cache } });
}
