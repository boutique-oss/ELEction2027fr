// Présidentielle 2027 : widget iPhone (app Scriptable)
// Petit : compte à rebours + podium · Moyen : top 5 avec barres · Grand : top 8 + duels du 2nd tour
// Données : API du site (Sondax d'après Wikipédia, CC BY-SA, via data.gouv.fr). Un appui ouvre le site.
const SITE = '__SITE__';
const TOUR1 = new Date('2027-04-18T08:00:00+02:00');

const C = {
  fond1: new Color('#1e1e22'), fond2: new Color('#0f0f12'), texte: new Color('#f5f5f7'),
  gris: new Color('#aeaeb2'), muet: new Color('#76767c'), piste: new Color('#ffffff', 0.09),
  hausse: new Color('#30d158'), baisse: new Color('#ff6358'),
};
const rgb = (s, a = 1) => { const [r, g, b] = s.split(',').map(Number); return new Color('#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join(''), a); };

async function json(chemin) {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.cacheDirectory(), 'presidentielle2027-' + chemin.replace(/\W/g, '') + '.json');
  try {
    const r = new Request(SITE + chemin);
    r.timeoutInterval = 15;
    const d = await r.loadJSON();
    if (d && !d.erreur) { fm.writeString(cache, JSON.stringify(d)); return d; }
  } catch (e) {}
  return fm.fileExists(cache) ? JSON.parse(fm.readString(cache)) : null;   // hors ligne : dernières données
}

async function portrait(chemin) {
  if (!chemin) return null;
  const fm = FileManager.local();
  const f = fm.joinPath(fm.cacheDirectory(), 'p2027-' + chemin.split('/').pop());
  if (fm.fileExists(f)) return fm.readImage(f);
  try { const img = await new Request(SITE + chemin).loadImage(); fm.writeImage(f, img); return img; } catch (e) { return null; }
}

function barre(part, couleur, largeur, hauteur = 5) {
  const d = new DrawContext();
  d.size = new Size(largeur, hauteur); d.opaque = false; d.respectScreenScale = true;
  const p = new Path(); p.addRoundedRect(new Rect(0, 0, largeur, hauteur), hauteur / 2, hauteur / 2);
  d.addPath(p); d.setFillColor(C.piste); d.fillPath();
  const q = new Path(); q.addRoundedRect(new Rect(0, 0, Math.max(hauteur, largeur * part), hauteur), hauteur / 2, hauteur / 2);
  d.addPath(q); d.setFillColor(couleur); d.fillPath();
  return d.getImage();
}

function duel(sg, cg, cd, largeur) {
  const d = new DrawContext();
  d.size = new Size(largeur, 6); d.opaque = false; d.respectScreenScale = true;
  const g = largeur * sg / 100;
  const a = new Path(); a.addRoundedRect(new Rect(0, 0, g - 1.5, 6), 3, 3); d.addPath(a); d.setFillColor(cg); d.fillPath();
  const b = new Path(); b.addRoundedRect(new Rect(g + 1.5, 0, largeur - g - 1.5, 6), 3, 3); d.addPath(b); d.setFillColor(cd); d.fillPath();
  return d.getImage();
}

function texte(pile, t, taille, couleur, poids = 'regular') {
  const x = pile.addText(t);
  x.font = poids === 'bold' ? Font.boldSystemFont(taille) : poids === 'semibold' ? Font.semiboldSystemFont(taille) : Font.systemFont(taille);
  x.textColor = couleur;
  x.lineLimit = 1;
  return x;
}

function evolution(e) {
  if (e === null || e === undefined) return ['', C.muet];
  if (Math.abs(e) < 0.25) return ['=', C.muet];
  return [(e > 0 ? '↑' : '↓') + Math.abs(e).toFixed(1).replace('.', ','), e > 0 ? C.hausse : C.baisse];
}

async function creer(famille) {
  const w = new ListWidget();
  const g = new LinearGradient(); g.colors = [C.fond1, C.fond2]; g.locations = [0, 1];
  w.backgroundGradient = g;
  w.url = SITE;
  w.setPadding(14, 14, 12, 14);
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

  const s = await json('/api/sondages');
  const jours = Math.max(0, Math.ceil((TOUR1 - new Date()) / 86400000));

  const tete = w.addStack(); tete.centerAlignContent();
  texte(tete, '🇫🇷 Présidentielle 2027', famille === 'small' ? 11 : 13, C.texte, 'semibold');
  tete.addSpacer();
  texte(tete, `J−${jours}`, famille === 'small' ? 11 : 13, C.gris, 'semibold');
  w.addSpacer(famille === 'small' ? 6 : 8);

  if (!s) { texte(w, 'Pas de connexion', 12, C.gris); return w; }

  if (famille === 'small') {
    const n = w.addStack(); n.bottomAlignContent();
    texte(n, String(jours), 34, C.texte, 'bold'); n.addSpacer(4); texte(n, 'jours', 12, C.gris, 'semibold');
    w.addSpacer(4);
    for (const c of s.premierTour.slice(0, 3)) {
      const l = w.addStack(); l.centerAlignContent();
      const pt = l.addText('●'); pt.font = Font.systemFont(9); pt.textColor = rgb(c.couleur);
      l.addSpacer(4); texte(l, c.nom.split(' ').slice(-1)[0], 12, C.texte, 'semibold');
      l.addSpacer(); texte(l, c.affiche, 12, C.texte, 'bold');
    }
    return w;
  }

  const nb = famille === 'large' ? 8 : 5;
  const largeur = famille === 'large' ? 150 : 110;
  for (const c of s.premierTour.slice(0, nb)) {
    const l = w.addStack(); l.centerAlignContent(); l.spacing = 6;
    const img = await portrait(c.photo);
    if (img) { const i = l.addImage(img); i.imageSize = new Size(18, 18); i.cornerRadius = 9; }
    const nom = texte(l, c.nom, 12, C.texte, 'semibold'); nom.minimumScaleFactor = 0.8;
    l.addSpacer();
    const b = l.addImage(barre(c.largeur, rgb(c.couleur), largeur)); b.imageSize = new Size(largeur, 5);
    const v = texte(l, c.affiche.replace(' ', ''), 12, C.texte, 'bold'); v.rightAlignText();
    const [e, ec] = evolution(c.evolution);
    const t = texte(l, e.padStart(4, ' '), 9, ec, 'semibold');
    w.addSpacer(famille === 'large' ? 5 : 3);
  }

  if (famille === 'large') {
    w.addSpacer(6);
    texte(w, '2ND TOUR', 9, C.muet, 'semibold');
    w.addSpacer(4);
    for (const d of s.secondTour.slice(0, 3)) {
      const l = w.addStack(); l.centerAlignContent();
      texte(l, `${d.g.nom.split(' ').slice(-1)[0]} ${String(d.sg).replace('.', ',')}`, 11, C.texte, 'semibold');
      l.addSpacer();
      texte(l, `${String(Math.round((100 - d.sg) * 10) / 10).replace('.', ',')} ${d.d.nom.split(' ').slice(-1)[0]}`, 11, C.texte, 'semibold');
      w.addSpacer(2);
      const b = w.addImage(duel(d.sg, rgb(d.g.couleur), rgb(d.d.couleur), 300)); b.imageSize = new Size(300, 6);
      w.addSpacer(5);
    }
  }

  w.addSpacer();
  texte(w, `${s.sous} · Sondax d'après Wikipédia`, 8, C.muet);
  return w;
}

const famille = config.widgetFamily || 'large';
const widget = await creer(famille);
if (config.runsInWidget) Script.setWidget(widget);
else if (famille === 'small') await widget.presentSmall();
else if (famille === 'medium') await widget.presentMedium();
else await widget.presentLarge();
Script.complete();
