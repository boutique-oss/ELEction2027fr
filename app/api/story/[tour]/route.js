// GET /api/story/1 ou /api/story/2 : story Instagram 1080 x 1920 (PNG) avec ses sources.
// Option ?mode=dernier pour le dernier sondage seul, ?pseudo=@moncompte pour signer l'image.
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chargerSondages, resume, REGLAGES } from '@/lib/sondages';
import { paris, MOIS_LONG } from '@/lib/format';

export const runtime = 'nodejs';

const racine = process.cwd();
const polices = Promise.all(
  [['Inter-Regular.ttf', 400], ['Inter-Medium.ttf', 500], ['Inter-SemiBold.ttf', 600], ['Inter-Bold.ttf', 700]].map(async ([f, weight]) => ({
    name: 'Inter', data: await readFile(join(racine, 'assets', 'fonts', f)), weight, style: 'normal',
  })),
);

async function imagePhoto(chemin) {
  if (!chemin) return null;
  try {
    const b = await readFile(join(racine, 'public', chemin));
    return `data:image/png;base64,${b.toString('base64')}`;
  } catch { return null; }
}

const BLANC = '#f5f5f7', GRIS = '#aeaeb2', MUET = '#808086';
const rgb = (c, a = 1) => `rgba(${c},${a})`;

function Portrait({ src, couleur, sigle, taille }) {
  return (
    <div style={{ display: 'flex', width: taille, height: taille, borderRadius: taille, border: `5px solid ${rgb(couleur)}`,
      background: src ? '#3a3a3e' : rgb(couleur), alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {src ? <img src={src} width={taille - 10} height={taille - 10} style={{ borderRadius: taille }} />
        : <div style={{ display: 'flex', color: 'white', fontSize: taille * 0.3, fontWeight: 700 }}>{sigle}</div>}
    </div>
  );
}

export async function GET(req, { params }) {
  const { tour } = await params;
  const t = tour === '2' ? 2 : 1;
  const q = new URL(req.url).searchParams;
  const mode = q.get('mode') === 'dernier' ? 'dernier' : 'moyenne';
  const pseudo = (q.get('pseudo') || '').slice(0, 40);

  // publication de sondages interdite la veille et le jour du vote (loi du 19 juillet 1977)
  const p = paris(Date.now());
  const auj = `${p.an}-${String(p.mois).padStart(2, '0')}-${String(p.jour).padStart(2, '0')}`;
  if (['2027-04-17', '2027-04-18', '2027-05-01', '2027-05-02'].includes(auj)) {
    return new Response('Publication de sondages interdite la veille et le jour du vote.', { status: 451 });
  }

  const r = resume(await chargerSondages(), { mode });
  const fonts = await polices;
  const dateTxt = `Au ${p.jour} ${MOIS_LONG[p.mois - 1]} ${p.an}`;

  let corps, sous, sources;
  if (t === 1) {
    sous = mode === 'dernier' ? `Intentions de vote : ${r.sous}.`
      : `Intentions de vote : moyenne pondérée de ${r.sous.match(/\d+/)?.[0]} sondages publiés ces ${REGLAGES.fenetre} derniers jours. Flèches : évolution sur ${REGLAGES.tendance} jours.`;
    sources = r.sources.premierTour;
    const lignes = await Promise.all(r.premierTour.slice(0, 10).map(async (c) => ({ ...c, img: await imagePhoto(c.photo) })));
    corps = (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lignes.map((c) => {
          const e = c.evolution;
          const tend = e === null ? '' : Math.abs(e) < 0.25 ? `= ${Math.abs(e).toFixed(1).replace('.', ',')}` : `${e > 0 ? '↑ +' : '↓ −'}${Math.abs(e).toFixed(1).replace('.', ',')}`;
          const tc = e === null || Math.abs(e) < 0.25 ? MUET : e > 0 ? '#30d158' : '#ff6358';
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', height: 86 }}>
              <Portrait src={c.img} couleur={c.couleur} sigle={c.parti} taille={72} />
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flexBasis: 0, minWidth: 0, marginLeft: 24, marginRight: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', fontSize: 36, fontWeight: 600, color: BLANC }}>{c.nom}</div>
                  <div style={{ display: 'flex', fontSize: 22, fontWeight: 500, color: MUET, marginLeft: 14 }}>{c.parti}</div>
                </div>
                <div style={{ display: 'flex', height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.09)', marginTop: 10 }}>
                  <div style={{ display: 'flex', width: `${Math.max(3, c.largeur * 100)}%`, height: 14, borderRadius: 7, background: rgb(c.couleur) }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: 170, flexShrink: 0 }}>
                <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: BLANC }}>{c.affiche}</div>
                <div style={{ display: 'flex', fontSize: 24, fontWeight: 500, color: tc }}>{tend}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    sous = mode === 'dernier' ? 'Intentions de vote au second tour, dernier sondage publié.'
      : `Intentions de vote au second tour : moyenne pondérée des duels testés ces ${REGLAGES.fenetre} derniers jours (sur les suffrages exprimés).`;
    sources = r.sources.secondTour;
    const duels = await Promise.all(r.secondTour.slice(0, 5).map(async (d) => ({
      ...d, ig: await imagePhoto(d.g.photo), id: await imagePhoto(d.d.photo),
    })));
    corps = (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {duels.map((d, k) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', height: 160 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Portrait src={d.ig} couleur={d.g.couleur} sigle={d.g.parti} taille={68} />
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, marginLeft: 18, marginRight: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 34, fontWeight: 600, color: BLANC }}>
                  <div style={{ display: 'flex' }}>{d.g.nom}</div><div style={{ display: 'flex' }}>{d.d.nom}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', fontSize: 23, color: MUET, marginTop: 4 }}>
                  {`${d.nb} sondage${d.nb > 1 ? 's' : ''} · dernier : ${d.dernier}`}
                </div>
              </div>
              <Portrait src={d.id} couleur={d.d.couleur} sigle={d.d.parti} taille={68} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
              <div style={{ display: 'flex', width: 160, fontSize: 40, fontWeight: 700, color: BLANC }}>{`${String(d.sg).replace('.', ',')} %`}</div>
              <div style={{ display: 'flex', flexGrow: 1, height: 24 }}>
                <div style={{ display: 'flex', width: `${d.sg}%`, height: 24, borderRadius: 12, background: rgb(d.g.couleur), marginRight: 8 }} />
                <div style={{ display: 'flex', flexGrow: 1, height: 24, borderRadius: 12, background: rgb(d.d.couleur) }} />
              </div>
              <div style={{ display: 'flex', width: 160, justifyContent: 'flex-end', fontSize: 40, fontWeight: 700, color: BLANC }}>
                {`${(Math.round((100 - d.sg) * 10) / 10).toString().replace('.', ',')} %`}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const image = new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: 1080, height: 1920, padding: '230px 80px 120px',
        fontFamily: 'Inter', color: BLANC,
        background: 'radial-gradient(circle at 0% 0%, rgba(0,85,164,0.35), transparent 45%), radial-gradient(circle at 100% 100%, rgba(239,65,53,0.25), transparent 45%), linear-gradient(180deg, #18181e, #0c0c10)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 64, height: 64, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', width: 22, background: '#0055a4' }} />
            <div style={{ display: 'flex', width: 21, background: '#ffffff' }} />
            <div style={{ display: 'flex', width: 21, background: '#ef4135' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 22 }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: GRIS, letterSpacing: 1 }}>PRÉSIDENTIELLE 2027</div>
            <div style={{ display: 'flex', fontSize: 28, color: MUET }}>{dateTxt}</div>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, marginTop: 40 }}>{t === 1 ? '1er tour' : '2nd tour'}</div>
        <div style={{ display: 'flex', fontSize: 31, color: GRIS, marginTop: 10, marginBottom: 34, lineHeight: 1.3 }}>{sous}</div>
        {corps}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid rgba(255,255,255,0.15)', paddingTop: 20 }}>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 600, color: GRIS, letterSpacing: 1 }}>SOURCES</div>
          <div style={{ display: 'flex', fontSize: 23, color: GRIS, marginTop: 10, lineHeight: 1.35 }}>{`Sondages : ${sources}.`}</div>
          <div style={{ display: 'flex', fontSize: 23, color: GRIS, marginTop: 8, lineHeight: 1.35 }}>
            Données : Sondax d'après Wikipédia (CC BY-SA 4.0), via data.gouv.fr. Moyenne pondérée par récence, taille d'échantillon et institut. Notices complètes sur commission-des-sondages.fr.
          </div>
          <div style={{ display: 'flex', fontSize: 21, color: MUET, marginTop: 8, lineHeight: 1.35 }}>
            Un sondage est une photographie de l'opinion, pas une prévision. Marge d'erreur de 1 à 3 points selon la taille de l'échantillon.
          </div>
          {pseudo ? <div style={{ display: 'flex', justifyContent: 'center', fontSize: 30, fontWeight: 600, marginTop: 24 }}>{pseudo}</div> : null}
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts },
  );
  image.headers.set('Content-Disposition', `inline; filename="story-${t === 1 ? '1er' : '2nd'}-tour-${auj}.png"`);
  image.headers.set('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  return image;
}
