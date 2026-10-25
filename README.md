# Présidentielle 2027 : version mobile

Version web (Next.js, hébergée sur Vercel) du widget Rainmeter « Présidentielle 2027 » :

- **Sondages** : moyenne pondérée du 1er tour (dernier sondage de chaque institut sur 7 jours, sans accumulation), duels du 2nd tour, liste des sondages, fiche de chaque candidat (courbe, chances Sondax, débrief du programme).
- **Actu** : une recherche Google Actualités par média retenu (filtre `site:`), le média étant vérifié sur la source réelle de l'article. Trois familles : **indépendants** sans actionnaire milliardaire (Mediapart, Canard enchaîné, Arrêt sur images, Les Jours, Alternatives Économiques, Politis, Disclose, Contexte, Mediacités, Reporterre, Basta!), **service public** (franceinfo, Radio France, France 24, RFI, Public Sénat, LCP, AFP, Arte, TV5Monde) et **non lucratif** (Ouest-France, La Croix). « Important » = repris par au moins 2 médias.
- **Manifs** : Démosphère Poitiers et appels nationaux. Le bouton « ＋ » ajoute l'événement au calendrier (fichier .ics).
- **Comprendre** : 8 fiches (dette, budget, retraites, BCE, comment voter…).
- **Décomptes** : fin officielle de la campagne (vendredi 16 avril 2027 à minuit) et jour du vote, avec les étapes à venir.
- **Story Instagram** : PNG 1080 × 1920 avec les sources, partageable depuis l'iPhone, ou publiée directement via l'API Meta.

## API

| Route | Contenu | Cache |
|---|---|---|
| `/api/sondages?mode=moyenne\|dernier` | 1er tour, duels, liste, sources | 1 h (CSV data.gouv.fr) |
| `/api/csv` | CSV Sondax relayé pour le widget Rainmeter | 1 h |
| `/api/actu` (`?format=tsv` pour Rainmeter) | infos regroupées par sujet | 15 min |
| `/api/manifs` (`?format=tsv` pour Rainmeter) | Démosphère + appels nationaux | 1 h |
| `/api/publier` (POST) | publie une story sur Instagram via l'API Meta | — |
| `/api/candidat/[id]` | courbe, fiche Sondax, débrief | 6 h |
| `/api/story/1` · `/api/story/2` | story PNG (`?mode=dernier`, `?pseudo=@compte`, `?format=jpg`) | 15 min |
| `/api/ics?uid=…` | un événement au format iCalendar | — |
| `/scriptable` | script du widget iPhone, déjà réglé sur l'adresse du site | — |

## Mettre la page sur l'écran d'accueil de l'iPhone

Ouvrir le site dans Safari, puis Partager › « Sur l'écran d'accueil ».

## Widget iPhone (app Scriptable)

1. Installer **Scriptable** (gratuite, App Store).
2. Dans Safari, ouvrir `https://<ton-site>.vercel.app/scriptable`, tout sélectionner et copier.
3. Dans Scriptable : « + », coller, nommer le script « Présidentielle 2027 ».
4. Écran d'accueil : appui long › « + » › Scriptable › taille au choix › modifier le widget › Script : « Présidentielle 2027 ».

## Publication Instagram (API Meta)

La publication passe **uniquement** par l'API officielle de Meta (Instagram Graph API). Pour l'activer :

1. Passer le compte Instagram en compte **professionnel** (créateur ou entreprise) et le relier à une **page Facebook**.
2. Sur [developers.facebook.com](https://developers.facebook.com), créer une application de type « Entreprise », ajouter le produit **Instagram** (API Graph).
3. Générer un **jeton d'accès longue durée** avec les permissions `instagram_basic`, `instagram_content_publish`, `pages_show_list` et `pages_read_engagement`.
4. Récupérer l'**identifiant du compte Instagram professionnel** (`GET /me/accounts`, puis `GET /{page-id}?fields=instagram_business_account`).
5. Dans Vercel › Settings › Environment Variables, ajouter :
   - `META_IG_USER_ID` : l'identifiant du compte Instagram ;
   - `META_ACCESS_TOKEN` : le jeton longue durée ;
   - `PUBLICATION_CLE` : un code secret de ton choix (demandé avant chaque publication) ;
   - `META_API_VERSION` (facultatif) : version de l'API Graph, `v23.0` par défaut.
6. Redéployer. Le bouton « Publier » apparaît dans la feuille Story.

Les stories sont envoyées en JPEG (seul format accepté par Meta). La publication est refusée la veille et le jour du vote (loi du 19 juillet 1977). Le jeton longue durée expire au bout de 60 jours : il faut le renouveler.

## Développement

```bash
npm install
npm run dev
```

## Sources et licences

- Sondages : [Sondax](https://sondax.fr) d'après Wikipédia (CC BY-SA 4.0), via [data.gouv.fr](https://www.data.gouv.fr/datasets/sondages-dintentions-de-vote-election-presidentielle-2027/).
- Portraits : Wikimedia Commons, crédits dans `public/photos/CREDITS.txt`.
- Police Inter : SIL Open Font License (`assets/fonts/Inter-LICENSE.txt`).
- Débriefs et fiches (`lib/contenu.json`) : rédigés le 17 octobre 2026 à partir des vidéos de Crésus et de sources publiques. Crésus a annoncé voter Mélenchon « par calcul », ses analyses restent une opinion.
