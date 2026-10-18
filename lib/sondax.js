// Page Sondax d'un candidat : âge, bio, chances d'être au second tour, moyenne Sondax.
import { FICHES_SONDAX } from './candidats';
import { sansBalises } from './format';

export async function chargerFicheSondax(id) {
  if (!FICHES_SONDAX.has(id)) return null;
  const r = await fetch(`https://sondax.fr/${id}.html`, { next: { revalidate: 21600 } });
  if (!r.ok) return null;
  const txt = await r.text();
  const un = (re) => { const m = re.exec(txt); return m ? sansBalises(m[1]) : ''; };
  const ul = /<ul class="bio">([\s\S]*?)<\/ul>/.exec(txt);
  const bio = ul ? [...ul[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => sansBalises(m[1])) : [];
  const chance = /class="mc-chance">([\s\S]*?)<\/p>/.exec(txt);
  return {
    age: un(/class="statut">([^<]+)/),
    bio,
    chance: chance ? sansBalises((/<b>([\s\S]*?)<\/b>/.exec(chance[1]) || [])[1]) : '',
    verdict: un(/class="mc-verdict">([\s\S]*?)<\/p>/),
    evolution: un(/class="mc-evo">([\s\S]*?)<\/p>/),
    duel: un(/second tour le plus fréquent : ([^<]+)/),
    moyenneSondax: un(/est mesurée? à ([\s\S]*?)sur les trente derniers jours/).replace(/,\s*$/, ''),
    url: `https://sondax.fr/${id}.html`,
  };
}
