// Partis, couleurs et repérage des candidats (mêmes valeurs que le widget Rainmeter)

export const PARTIS = {
  RN: { nom: 'Rassemblement national', couleur: '24,62,150' },
  LFI: { nom: 'La France insoumise', couleur: '204,36,67' },
  PP: { nom: 'Place publique', couleur: '226,74,134' },
  PS: { nom: 'Parti socialiste', couleur: '236,72,104' },
  LE: { nom: 'Les Écologistes', couleur: '22,163,74' },
  PCF: { nom: 'Parti communiste français', couleur: '214,24,24' },
  LO: { nom: 'Lutte ouvrière', couleur: '150,20,20' },
  NPA: { nom: 'Nouveau Parti anticapitaliste', couleur: '170,30,40' },
  HOR: { nom: 'Horizons', couleur: '30,150,215' },
  RE: { nom: 'Renaissance', couleur: '255,196,0', encre: '30,30,30' },
  MD: { nom: 'MoDem', couleur: '250,140,20', encre: '30,30,30' },
  LR: { nom: 'Les Républicains', couleur: '0,92,190' },
  REC: { nom: 'Reconquête', couleur: '72,72,110' },
  DLF: { nom: 'Debout la France', couleur: '0,130,196' },
  LFH: { nom: 'La France humaniste', couleur: '130,96,176' },
  UDI: { nom: 'UDI', couleur: '0,160,200' },
};

export function couleurParti(code) {
  return (PARTIS[code] && PARTIS[code].couleur) || '128,128,136';
}

// Candidats qui ont une page dédiée sur sondax.fr
export const FICHES_SONDAX = new Set(['le-pen', 'philippe', 'melenchon', 'glucksmann', 'hollande', 'attal', 'retailleau', 'tondelier', 'zemmour', 'roussel']);

// Portraits disponibles dans public/photos
export const PHOTOS = new Set(['arthaud', 'attal', 'bardella', 'bertrand', 'bouamrane', 'dupont-aignan', 'glucksmann', 'hollande', 'knafo',
  'le-pen', 'lisnard', 'melenchon', 'philippe', 'retailleau', 'roussel', 'ruffin', 'tondelier', 'villepin', 'zemmour']);

export function photo(id) {
  return PHOTOS.has(id) ? `/photos/${id}.png` : null;
}

// Repérage des candidats dans les titres d'articles
export const NOMS = [
  ['le-pen', ['Le Pen']], ['melenchon', ['Mélenchon', 'Melenchon']], ['bardella', ['Bardella']],
  ['philippe', ['Édouard Philippe', 'Edouard Philippe']], ['glucksmann', ['Glucksmann']], ['retailleau', ['Retailleau']],
  ['attal', ['Attal']], ['zemmour', ['Zemmour']], ['tondelier', ['Tondelier']], ['roussel', ['Fabien Roussel']],
  ['hollande', ['Hollande']], ['arthaud', ['Arthaud']], ['dupont-aignan', ['Dupont-Aignan']], ['villepin', ['Villepin']],
  ['knafo', ['Knafo']], ['ruffin', ['Ruffin']], ['lisnard', ['Lisnard']],
];

export const NOM_COMPLET = {
  'le-pen': 'Marine Le Pen', melenchon: 'Jean-Luc Mélenchon', bardella: 'Jordan Bardella', philippe: 'Édouard Philippe',
  glucksmann: 'Raphaël Glucksmann', retailleau: 'Bruno Retailleau', attal: 'Gabriel Attal', zemmour: 'Éric Zemmour',
  tondelier: 'Marine Tondelier', roussel: 'Fabien Roussel', hollande: 'François Hollande', arthaud: 'Nathalie Arthaud',
  'dupont-aignan': 'Nicolas Dupont-Aignan', villepin: 'Dominique de Villepin', knafo: 'Sarah Knafo', ruffin: 'François Ruffin',
  lisnard: 'David Lisnard',
};

export const PARTI_DE = {
  'le-pen': 'RN', bardella: 'RN', melenchon: 'LFI', philippe: 'HOR', glucksmann: 'PP', retailleau: 'LR', attal: 'RE',
  zemmour: 'REC', knafo: 'REC', tondelier: 'LE', roussel: 'PCF', hollande: 'PS', arthaud: 'LO', 'dupont-aignan': 'DLF',
  villepin: 'LFH', ruffin: 'PS', lisnard: 'LR',
};
