'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const TOUR1 = Date.parse('2027-04-18T08:00:00+02:00');
const TOUR2 = Date.parse('2027-05-02T08:00:00+02:00');
const INSCRIPTION = Date.parse('2027-03-10T23:59:00+01:00');
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const URL = {
  inscription: 'https://www.service-public.fr/particuliers/vosdroits/services-en-ligne-et-formulaires/ISE',
  procuration: 'https://www.maprocuration.gouv.fr',
  second: 'https://sondax.fr/#second-tour',
  candidats: 'https://sondax.fr/candidats/',
  donnees: 'https://sondax.fr/donnees.html',
  demosphere: 'https://poitiers.demosphere.net',
};

const rgb = (c) => `rgb(${c})`;
const FAMILLES = { independant: 'Indépendant', public: 'Service public', nonlucratif: 'Non lucratif' };
const COULEURS = { 'le-pen': '24,62,150', bardella: '24,62,150', melenchon: '204,36,67', philippe: '30,150,215', glucksmann: '226,74,134',
  retailleau: '0,92,190', lisnard: '0,92,190', attal: '255,196,0', zemmour: '72,72,110', knafo: '72,72,110', tondelier: '22,163,74',
  roussel: '214,24,24', hollande: '236,72,104', ruffin: '236,72,104', arthaud: '150,20,20', 'dupont-aignan': '0,130,196', villepin: '130,96,176' };
const v = (x) => String(x).replace('.', ',');
const fmtDate = (t, o) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...o }).format(new Date(t));
const jourMois = (t) => fmtDate(t, { day: 'numeric', month: 'short' });
function depuis(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return jourMois(t);
}
function initiales(s) {
  const m = (s || '').match(/[\p{L}\p{N}]+/gu) || [];
  return m.length > 1 ? (m[0][0] + m[1][0]).toUpperCase() : (m[0] || '?').slice(0, 2);
}

const Ext = () => <span aria-hidden>↗</span>;
const Lien = ({ href, children, className }) => <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;

function Icone({ photo, couleur, texte, grand }) {
  if (photo) return <span className={`ic rond${grand ? ' grand' : ''}`} style={{ borderColor: rgb(couleur || '128,128,136') }}><img src={photo} alt="" /></span>;
  return <span className={`ic${grand ? ' grand' : ''}`} style={couleur ? { background: rgb(couleur), color: '#fff' } : undefined}>{texte}</span>;
}

function Evolution({ e }) {
  if (e === null || e === undefined) return <div className="tr eq">nouveau</div>;
  if (Math.abs(e) < 0.25) return <div className="tr eq">= {v(Math.abs(e).toFixed(1))}</div>;
  return <div className={`tr ${e > 0 ? 'up' : 'down'}`}>{e > 0 ? '↑ +' : '↓ −'}{v(Math.abs(e).toFixed(1))}</div>;
}

// ------------------------------------------------------------------ décomptes
// La campagne officielle se termine la veille du vote à minuit (vendredi 23 h 59).
const FIN1 = Date.parse('2027-04-16T23:59:59+02:00');
const FIN2 = Date.parse('2027-04-30T23:59:59+02:00');
const CAMPAGNE = Date.parse('2027-04-05T00:00:00+02:00');

function duree(ms) {
  const s = Math.max(0, ms / 1000);
  const j = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return j > 0 ? [j, j > 1 ? 'jours' : 'jour'] : [`${h} h`, `${String(m).padStart(2, '0')} min`];
}

function Decomptes() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);
  const deuxieme = now > TOUR1 + 14 * 3600e3;
  const vote = deuxieme ? TOUR2 : TOUR1;
  const fin = deuxieme ? FIN2 : FIN1;
  const close = now > fin;
  const [nf, uf] = duree(fin - now), [nv, uv] = duree(vote - now);
  // étapes à venir, à intervalles réguliers (les dates réelles sont trop serrées en fin de parcours)
  const etapes = [['Auj.', jourMois(now)], ['Inscr.', '10 mars', INSCRIPTION], ['Campagne', '5 avr.', CAMPAGNE],
    ['1er tour', '18 avr.', TOUR1], ['2nd tour', '2 mai', TOUR2]].filter((e, k) => k === 0 || e[2] > now);
  const n = etapes.length;
  return (
    <section className="decomptes">
      <div className="duo">
        <div className="dc fin">
          <div className="lab">Fin de campagne</div>
          {close ? <div className="n">Close</div>
            : <div className="n" suppressHydrationWarning>{nf}<small>{uf}</small></div>}
          <div className="d">{deuxieme ? 'ven. 30 avril, minuit' : 'ven. 16 avril, minuit'}</div>
        </div>
        <div className="dc">
          <div className="lab">Jour du vote</div>
          <div className="n" suppressHydrationWarning>{nv}<small>{uv}</small></div>
          <div className="d">{deuxieme ? 'dim. 2 mai · 2nd tour' : 'dim. 18 avril · 1er tour'}</div>
        </div>
      </div>
      {n > 1 ? (
        <div className="frise" style={{ '--n': n }}>
          <div className="rail">
            <div className="fait" style={{ width: `${50 / n}%` }} />
            {etapes.map((e, k) => (
              <div key={e[0]} className={`pt${k === 0 ? ' auj' : ''}${e[0] === 'Campagne' ? ' campagne' : ''}`} style={{ left: `${((k + 0.5) / n) * 100}%` }} />
            ))}
          </div>
          <div className="jalons">{etapes.map((e) => <span key={e[0]}><b>{e[0]}</b>{e[1]}</span>)}</div>
        </div>
      ) : null}
      <div className="puces">
        <Lien className="puce" href={URL.inscription}>{now < INSCRIPTION ? 'Inscription · 10 mars' : 'Mon inscription'} <Ext /></Lien>
        <Lien className="puce" href={URL.procuration}>Procuration <Ext /></Lien>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ onglet Sondages
function Sondages({ s, sous, ouvrirCandidat }) {
  if (!s) return <div className="vide">Sondages indisponibles pour le moment.</div>;
  if (sous === 1) {
    return (
      <div className="liste">
        {s.premierTour.map((c) => (
          <button key={c.id} className="ligne" onClick={() => ouvrirCandidat(c)}>
            <Icone photo={c.photo} couleur={c.couleur} texte={c.parti} />
            <div className="mid">
              <div className="nom">{c.nom}</div>
              <div className="barre"><i style={{ width: `${c.largeur * 100}%`, background: rgb(c.couleur) }} /></div>
            </div>
            <div className="droite"><div className="val">{c.affiche}</div><Evolution e={c.evolution} /></div>
          </button>
        ))}
      </div>
    );
  }
  if (sous === 2) {
    return (
      <div className="liste">
        {s.secondTour.map((d, k) => (
          <Lien key={k} href={URL.second}>
            <div className="duel">
              <div className="l1"><span>{d.g.nom}</span><span>{d.d.nom}</span></div>
              <div className="split"><i style={{ flex: d.sg, background: rgb(d.g.couleur) }} /><i style={{ flex: 100 - d.sg, background: rgb(d.d.couleur) }} /></div>
              <div className="l3"><b>{v(d.sg)} %</b><span>{d.nb} sondage{d.nb > 1 ? 's' : ''} · {d.dernier}</span><b>{v(Math.round((100 - d.sg) * 10) / 10)} %</b></div>
            </div>
          </Lien>
        ))}
      </div>
    );
  }
  return (
    <div className="liste">
      {s.liste.map((p) => (
        <div key={p.id} className="ligne">
          <span className="ic">{initiales(p.institut)}</span>
          <Lien href={`https://sondax.fr/sondages/${p.id}`} className="mid">
            <div className="nom">{p.institut} <span style={{ color: 'var(--t3)', fontWeight: 400, fontSize: 13 }}>· {p.terrain}</span></div>
            <div className="sousl">{p.top}</div>
          </Lien>
          {p.notice ? <Lien className="act" href={p.notice}>↗</Lien> : null}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ onglet Actu
function Actu({ a, sous, filtre }) {
  if (!a) return <div className="vide">Chargement des infos…</div>;
  let infos = a.infos;
  if (sous === 2) infos = infos.filter((i) => i.important);
  if (filtre) infos = infos.filter((i) => i.candidats.includes(filtre.id));
  if (!infos.length) return <div className="vide">{filtre ? `Aucune info récente sur ${filtre.nom}.` : 'Aucune info pour l\'instant.'}</div>;
  return (
    <>
      <div className="legende">
        {Object.entries(FAMILLES).map(([k, f]) => <span key={k}><i className={`f-${k}`} />{f}</span>)}
      </div>
      <div className="cartes">
        {infos.map((i, k) => {
          const id = i.candidats[0];
          return (
            <Lien key={k} href={i.lien} className={`carte${i.important ? ' imp' : ''}`}>
              <div className="c1">
                <span className={`badge f-${i.famille}`}>{FAMILLES[i.famille]}</span>
                <span className="media">{i.media}</span>
                <span className="quand">{depuis(i.date)}</span>
              </div>
              <div className="c2">
                {id ? <span className="portrait" style={{ borderColor: rgb(COULEURS[id] || '128,128,136') }}><img src={`/photos/${id}.png`} alt="" /></span> : null}
                <div className="titre">{i.titre}</div>
              </div>
              {i.important || i.autres.length ? (
                <div className="c3">
                  {i.important ? <span className="imp">● Important</span> : null}
                  {i.autres.length ? <span>Repris par</span> : null}
                  {i.autres.slice(0, 3).map((m) => <span key={m.nom} className="mini"><i className={`f-${m.famille}`} />{m.nom}</span>)}
                  {i.autres.length > 3 ? <span>+{i.autres.length - 3}</span> : null}
                </div>
              ) : null}
            </Lien>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ onglet Manifs
function Manifs({ m, sous }) {
  if (!m) return <div className="vide">Chargement des manifs…</div>;
  const liste = sous === 1 ? m.locales : m.nationales;
  if (!liste.length) return <div className="vide">Rien à venir pour l'instant.</div>;
  return (
    <div className="liste">
      {liste.map((e) => {
        const t = sous === 1 ? e.debut : e.jour;
        const date = t ? <span className="ic date" style={sous === 2 ? { background: 'var(--alerte)', color: '#fff' } : undefined}>
          {fmtDate(t, { day: 'numeric' })}<small>{MOIS[+fmtDate(t, { month: 'numeric' }) - 1]}</small></span> : <span className="ic">📣</span>;
        const sousTxt = sous === 1
          ? `${fmtDate(e.debut, { weekday: 'short' })}${e.journee ? '' : ` ${fmtDate(e.debut, { hour: '2-digit', minute: '2-digit' })}`} · ${e.ville || 'lieu à préciser'}`
          : `${t ? fmtDate(t, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date à confirmer'} · ${e.medias.slice(0, 3).join(', ')}`;
        return (
          <div key={e.uid} className="ligne">
            {date}
            <Lien href={sous === 1 ? (e.url || URL.demosphere) : e.lien} className="mid">
              <div className="nom">{e.titre}</div>
              <div className="sousl">{sousTxt}</div>
            </Lien>
            {t ? <a className="act" href={`/api/ics?uid=${encodeURIComponent(e.uid)}`} aria-label="Ajouter au calendrier">＋</a> : null}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ onglet Comprendre
function Comprendre({ fiches, ouvrir }) {
  return (
    <div className="liste">
      {fiches.map((f, k) => (
        <button key={k} className="ligne" onClick={() => ouvrir(k)}>
          <span className="ic" style={{ background: rgb(f.couleur), fontSize: 18 }}>{f.icone}</span>
          <div className="mid"><div className="nom">{f.titre}</div><div className="sousl">{f.sous}</div></div>
          <span className="act" style={{ fontSize: 16, color: 'var(--t3)' }}>›</span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ panneaux
function Courbe({ serie, couleur }) {
  if (!serie || serie.length < 2) return null;
  const W = 340, H = 90, t0 = serie[0].t, t1 = Date.now();
  const smax = Math.ceil((Math.max(...serie.map((p) => p.s)) * 1.15) / 5) * 5;
  const X = (t) => 4 + ((t - t0) / Math.max(1, t1 - t0)) * (W - 8);
  const Y = (s) => H - 4 - (s / smax) * (H - 10);
  const ligne = serie.filter((p) => p.m !== null).map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.m).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {serie.map((p, i) => <circle key={i} cx={X(p.t)} cy={Y(p.s)} r="2.6" fill={rgb(couleur)} opacity=".45" />)}
      <path d={ligne} fill="none" stroke={rgb(couleur)} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PanneauCandidat({ c, retour, voirActus }) {
  const [d, setD] = useState(null);
  useEffect(() => { fetch(`/api/candidat/${c.id}`).then((r) => r.json()).then(setD).catch(() => setD({})); }, [c.id]);
  const f = d?.sondax, prog = d?.programme;
  const decl = f?.bio?.find((b) => b.includes('déclar'));
  return (
    <div>
      <button className="retour" onClick={retour}>‹ Retour</button>
      <div className="ph">
        <Icone photo={c.photo} couleur={c.couleur} texte={c.parti} grand />
        <div>
          <h2>{c.nom}</h2>
          <p>{c.partiNom}{f?.age ? ` · ${f.age}` : ''}</p>
          {decl ? <div className="decl">{decl}</div> : null}
        </div>
      </div>
      <div className="tuiles">
        <div className="tuile"><b>{c.affiche}</b><span>moyenne (±{v(c.marge)})</span></div>
        <div className="tuile"><b>{c.rang}{c.rang === 1 ? 'er' : 'e'}</b><span>rang au 1er tour</span></div>
        <div className="tuile"><b>{f?.chance ? `${f.chance.replace('plus de ', '>')} %` : (c.ficheSondax && !d ? '…' : '–')}</b><span>chances 2nd tour</span></div>
      </div>
      <div className="graph">
        <Courbe serie={d?.serie} couleur={c.couleur} />
        <div className="leg">
          Points : sondages · ligne : moyenne pondérée{d?.serie?.length ? ` · depuis le ${jourMois(d.serie[0].t)}` : ''}
          {f?.moyenneSondax ? <><br />Sondax mesure {f.moyenneSondax}.</> : null}
          {f?.chance ? <><br />Chances (modèle Sondax) : {f.verdict} {f.evolution}</> : null}
        </div>
      </div>
      <div className="h">{prog ? 'Programme en bref' : 'Programme'}</div>
      {prog ? (
        <div className="txt">
          <p className="txt">{prog.ligne}</p>
          <ul>{prog.points.map((p, k) => <li key={k}>{p}</li>)}</ul>
        </div>
      ) : <p className="txt">{d ? 'Pas encore de débrief : candidat peu testé ou programme non publié.' : 'Chargement…'}</p>}
      {prog?.cresus ? (
        <>
          <div className="h">L'avis de Crésus</div>
          <p className="txt">{prog.cresus}</p>
          <div className="note">{d.noteCresus}</div>
        </>
      ) : null}
      <div className="boutons">
        {prog?.video ? <Lien className="puce" href={prog.video.url}>▶ Vidéo Crésus</Lien> : null}
        {prog?.video2 ? <Lien className="puce" href={prog.video2.url}>▶ Son vote</Lien> : null}
        {prog?.site ? <Lien className="puce" href={prog.site}>Site officiel <Ext /></Lien> : null}
        <Lien className="puce" href={c.ficheSondax ? `https://sondax.fr/${c.id}.html` : URL.candidats}>Fiche Sondax <Ext /></Lien>
        <button className="puce" onClick={voirActus}>Ses actus</button>
      </div>
      {d?.redige ? <div className="note">Débrief rédigé le {d.redige}.</div> : null}
    </div>
  );
}

function PanneauFiche({ f, retour }) {
  return (
    <div>
      <button className="retour" onClick={retour}>‹ Retour</button>
      <div className="ph">
        <span className="ic grand" style={{ background: rgb(f.couleur) }}>{f.icone}</span>
        <div><h2>{f.titre}</h2><p>{f.sous}</p></div>
      </div>
      <div style={{ marginTop: 16 }}>{f.texte.map((t, k) => <p key={k} className="txt" style={{ marginBottom: 12 }}>{t}</p>)}</div>
      <div className="boutons">{f.liens.map((l, k) => <Lien key={k} className="puce" href={l.url}>{l.titre} <Ext /></Lien>)}</div>
    </div>
  );
}

// ------------------------------------------------------------------ feuille Story Instagram
function FeuilleStory({ mode, fermer }) {
  const q = mode === 'dernier' ? '?mode=dernier' : '';
  const [meta, setMeta] = useState(null);       // publication configurée côté serveur ?
  const [envoi, setEnvoi] = useState(0);
  const [retour, setRetour] = useState(null);
  useEffect(() => { fetch('/api/publier').then((r) => r.json()).then((d) => setMeta(!!d.configure)).catch(() => setMeta(false)); }, []);
  const publier = async (tour) => {
    let cle = '';
    try { cle = localStorage.getItem('cle-publication') || ''; } catch {}
    if (!cle) cle = window.prompt('Code de publication (PUBLICATION_CLE) :') || '';
    if (!cle) return;
    if (!window.confirm(`Publier la story du ${tour === 1 ? '1er' : '2nd'} tour sur Instagram ?`)) return;
    setEnvoi(tour); setRetour(null);
    try {
      const r = await fetch('/api/publier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tour, mode, cle }) });
      const d = await r.json();
      if (r.status === 403) { try { localStorage.removeItem('cle-publication'); } catch {} }
      else if (d.ok) { try { localStorage.setItem('cle-publication', cle); } catch {} }
      setRetour(d.ok ? { ok: true, texte: 'Story publiée sur Instagram.' } : { ok: false, texte: d.erreur || 'Échec de la publication.' });
    } catch {
      setRetour({ ok: false, texte: 'Le site ne répond pas.' });
    }
    setEnvoi(0);
  };
  const partager = async (tour) => {
    const url = `/api/story/${tour}${q}`;
    try {
      const r = await fetch(url);
      if (r.status === 451) { alert(await r.text()); return; }
      const fichier = new File([await r.blob()], `story-${tour === 1 ? '1er' : '2nd'}-tour.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [fichier] })) { await navigator.share({ files: [fichier] }); return; }
    } catch (e) { if (e?.name === 'AbortError') return; }
    window.open(url, '_blank');
  };
  return (
    <div className="voile" onClick={fermer}>
      <div className="feuille" onClick={(e) => e.stopPropagation()}>
        <h3>Story Instagram</h3>
        <p>Image 1080 × 1920 avec les sources. Touche une story pour la partager (Instagram, Enregistrer l'image…).</p>
        <div className="apercus">
          <button onClick={() => partager(1)}><img src={`/api/story/1${q}`} alt="Story 1er tour" />1er tour</button>
          <button onClick={() => partager(2)}><img src={`/api/story/2${q}`} alt="Story 2nd tour" />2nd tour</button>
        </div>
        {meta ? (
          <div className="publier">
            <div className="h">Publier sur Instagram (API Meta)</div>
            <div className="duo2">
              <button className="grosbtn ig" disabled={!!envoi} onClick={() => publier(1)}>{envoi === 1 ? 'Publication…' : 'Publier le 1er tour'}</button>
              <button className="grosbtn ig" disabled={!!envoi} onClick={() => publier(2)}>{envoi === 2 ? 'Publication…' : 'Publier le 2nd tour'}</button>
            </div>
            {retour ? <p className={retour.ok ? 'ok' : 'ko'}>{retour.texte}</p> : null}
          </div>
        ) : meta === false ? <p className="note">Publication Instagram : à configurer sur Vercel (voir le README).</p> : null}
        <button className="grosbtn" onClick={fermer}>Fermer</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ application
const ONGLETS = ['Sondages', 'Actu', 'Manifs', 'Comprendre'];
const SOUS = [['1er tour', '2nd tour', 'Liste'], ['Tout', 'Importantes'], ['Poitiers', 'Nationales'], []];

export default function App({ sondagesInitiaux, fiches, redige }) {
  const [onglet, setOnglet] = useState(0);
  const [sous, setSous] = useState([1, 1, 1, 1]);
  const [mode, setMode] = useState('moyenne');
  const [s, setS] = useState(sondagesInitiaux);
  const [actu, setActu] = useState(null);
  const [manifs, setManifs] = useState(null);
  const [panneau, setPanneau] = useState(null);
  const [filtre, setFiltre] = useState(null);
  const [story, setStory] = useState(false);
  const [charge, setCharge] = useState(false);

  // onglet mémorisé sur l'appareil
  useEffect(() => {
    try { const o = +localStorage.getItem('onglet'); if (o >= 0 && o < 4) setOnglet(o); } catch {}
  }, []);
  const choisir = (k) => { setOnglet(k); setPanneau(null); setFiltre(null); try { localStorage.setItem('onglet', String(k)); } catch {} window.scrollTo(0, 0); };

  const charger = useCallback(async (quoi) => {
    const j = (u) => fetch(u, { cache: 'no-store' }).then((r) => r.json());
    if (quoi === 'sondages') setS(await j(`/api/sondages${mode === 'dernier' ? '?mode=dernier' : ''}`));
    if (quoi === 'actu') setActu(await j('/api/actu'));
    if (quoi === 'manifs') setManifs(await j('/api/manifs'));
  }, [mode]);

  useEffect(() => { if (onglet === 1 && !actu) charger('actu').catch(() => {}); if (onglet === 2 && !manifs) charger('manifs').catch(() => {}); }, [onglet, actu, manifs, charger]);
  useEffect(() => { charger('sondages').catch(() => {}); }, [mode, charger]);

  const toutRafraichir = async () => {
    setCharge(true);
    await Promise.allSettled([charger('sondages'), charger('actu'), charger('manifs')]);
    setCharge(false);
  };

  const info = useMemo(() => {
    if (onglet === 0) return s ? (sous[0] === 3 ? `${s.total} sondages` : sous[0] === 2 ? (mode === 'dernier' ? 'Dernier sondage' : 'Moyenne des duels')
      : mode === 'dernier' ? s.sous.split(' · ')[0] : s.sous.replace('Moyenne de ', '').replace(' derniers jours', ' j')) : '';
    if (onglet === 1) return actu ? (filtre ? filtre.nom : `${actu.articles} articles · ${depuis(actu.maj)}`) : '';
    if (onglet === 2) return manifs ? (sous[2] === 1 ? `${manifs.locales.length} à venir` : `${manifs.nationales.length} appels`) : '';
    return `Rédigé le ${redige}`;
  }, [onglet, s, sous, mode, actu, manifs, filtre, redige]);

  let contenu;
  if (panneau?.type === 'candidat') {
    contenu = <PanneauCandidat c={panneau.c} retour={() => setPanneau(null)} voirActus={() => { setFiltre(panneau.c); setPanneau(null); setOnglet(1); }} />;
  } else if (panneau?.type === 'fiche') {
    contenu = <PanneauFiche f={fiches[panneau.k]} retour={() => setPanneau(null)} />;
  } else if (onglet === 0) {
    contenu = <Sondages s={s} sous={sous[0]} ouvrirCandidat={(c) => { setPanneau({ type: 'candidat', c }); window.scrollTo(0, 0); }} />;
  } else if (onglet === 1) {
    contenu = <Actu a={actu} sous={sous[1]} filtre={filtre} />;
  } else if (onglet === 2) {
    contenu = <Manifs m={manifs} sous={sous[2]} />;
  } else {
    contenu = <Comprendre fiches={fiches} ouvrir={(k) => { setPanneau({ type: 'fiche', k }); window.scrollTo(0, 0); }} />;
  }

  let credit;
  if (onglet === 1) credit = <>Une recherche Google Actualités par média : indépendants (sans actionnaire milliardaire), service public et non lucratif. « Important » = repris par au moins 2 médias.</>;
  else if (onglet === 2) credit = <>Poitiers : <Lien href={URL.demosphere}>Démosphère</Lien> (agenda militant). Nationales : appels repris par au moins 2 médias. « ＋ » ajoute au calendrier.</>;
  else if (onglet === 3) credit = <>Fiches rédigées à partir de l'Insee, vie-publique.fr et des vidéos de Crésus.</>;
  else credit = <>Données <Lien href={URL.donnees}>Sondax d'après Wikipédia</Lien> (CC BY-SA 4.0), via data.gouv.fr. Moyenne du dernier sondage de chaque institut sur 7 jours, pondérée par récence et échantillon.</>;

  return (
    <main className="app">
      <header className="hd">
        <div className="logo"><i /><i /><i /></div>
        <div className="ttl"><b>Présidentielle 2027</b><span>Sondages, actu, manifs et repères</span></div>
        <button className="btn" onClick={() => setStory(true)} aria-label="Story Instagram">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="3.5" /><path d="M8.5 6l1.5-2.5h4L15.5 6" /></svg>
        </button>
        <button className={`btn ${charge ? 'tourne' : ''}`} onClick={toutRafraichir} aria-label="Mettre à jour">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v4.5h-4.5" /></svg>
        </button>
      </header>

      <Decomptes />

      <nav className="seg">
        <div className="pill" style={{ transform: `translateX(${onglet * 100}%)` }} />
        {ONGLETS.map((o, k) => <button key={o} className={k === onglet ? 'on' : ''} onClick={() => choisir(k)}>{o}</button>)}
      </nav>

      {!panneau ? (
        <div className="sous">
          {SOUS[onglet].map((l, k) => (
            <button key={l} className={`puce ${sous[onglet] === k + 1 ? 'on' : ''}`} onClick={() => { setSous(sous.map((x, i) => (i === onglet ? k + 1 : x))); setFiltre(null); }}>{l}</button>
          ))}
          <span className="info">{info}</span>
        </div>
      ) : null}

      {contenu}

      <footer className="pied">
        {onglet === 0 && !panneau ? (
          <button className="mode" onClick={() => setMode(mode === 'moyenne' ? 'dernier' : 'moyenne')}>
            <span className="ic" style={{ background: 'var(--accent)' }}>📈</span>
            <div className="mid">
              <div className="nom">{mode === 'moyenne' ? 'Moyenne pondérée' : 'Dernier sondage seul'}</div>
              <div className="sousl">{mode === 'moyenne' ? 'Dernier sondage par institut · 7 j · récence · échantillon' : 'Mesure brute publiée par l\'institut'}</div>
            </div>
            <span className={`sw ${mode === 'moyenne' ? 'on' : ''}`} />
          </button>
        ) : null}
        <div className="credit">{credit}</div>
      </footer>

      {story ? <FeuilleStory mode={mode} fermer={() => setStory(false)} /> : null}
    </main>
  );
}
