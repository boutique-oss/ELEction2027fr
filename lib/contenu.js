// Contenu rédigé (débriefs, fiches Comprendre, médias retenus).
// contenu.json est généré depuis Contenu.lua du widget Rainmeter : modifier les deux ensemble.
import contenu from './contenu.json';

export const MAJ = contenu.MAJ;
export const NOTE_CRESUS = contenu.NOTE_CRESUS;
export const PROGRAMMES = contenu.programmes;
export const FICHES = contenu.fiches;

// domaine -> { nom, famille } ; familles : independant, public, nonlucratif
export const MEDIAS = Object.fromEntries(Object.entries(contenu.medias).map(([d, [nom, famille]]) => [d, { nom, famille }]));

// famille -> { nom, couleur }
export const FAMILLES = Object.fromEntries(Object.entries(contenu.familles).map(([k, [nom, couleur]]) => [k, { nom, couleur }]));
