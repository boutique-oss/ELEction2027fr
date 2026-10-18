# Présidentielle 2027 : version mobile

Version web (Next.js, hébergée sur Vercel) du widget Rainmeter « Présidentielle 2027 » :

- **Sondages** : moyenne pondérée du 1er tour, duels du 2nd tour, liste des sondages, fiche de chaque candidat (courbe, chances Sondax, débrief du programme).
- **Actu** : Google Actualités filtré sur 40 médias reconnus. « Important » = repris par au moins 2 médias.
- **Manifs** : Démosphère Poitiers et appels nationaux. Le bouton « ＋ » ajoute l'événement au calendrier (fichier .ics).
- **Comprendre** : 8 fiches (dette, budget, retraites, BCE, comment voter…).
- **Story Instagram** : PNG 1080 × 1920 avec les sources, partageable depuis l'iPhone.

## API

| Route | Contenu | Cache |
|---|---|---|
| `/api/sondages?mode=moyenne\|dernier` | 1er tour, duels, liste, sources | 1 h (CSV data.gouv.fr) |
| `/api/actu` | infos regroupées par sujet | 15 min |
| `/api/manifs` | Démosphère + appels nationaux | 1 h |
| `/api/candidat/[id]` | courbe, fiche Sondax, débrief | 6 h |
| `/api/story/1` · `/api/story/2` | story PNG (`?mode=dernier`, `?pseudo=@compte`) | 15 min |
| `/api/ics?uid=…` | un événement au format iCalendar | — |
| `/scriptable` | script du widget iPhone, déjà réglé sur l'adresse du site | — |

## Mettre la page sur l'écran d'accueil de l'iPhone

Ouvrir le site dans Safari, puis Partager › « Sur l'écran d'accueil ».

## Widget iPhone (app Scriptable)

1. Installer **Scriptable** (gratuite, App Store).
2. Dans Safari, ouvrir `https://<ton-site>.vercel.app/scriptable`, tout sélectionner et copier.
3. Dans Scriptable : « + », coller, nommer le script « Présidentielle 2027 ».
4. Écran d'accueil : appui long › « + » › Scriptable › taille au choix › modifier le widget › Script : « Présidentielle 2027 ».

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
