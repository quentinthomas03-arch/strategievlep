// Fabrique js/data/textes-vlep.js à partir des tableaux officiels recopiés de Légifrance (une ligne par substance,
// colonnes séparées par « | », dans l'ordre du texte). Chaque tableau est contrôlé par l'empreinte calculée sur la page
// Légifrance au moment de la lecture : si la copie diffère d'un seul caractère, rien n'est écrit.
//   node outils/textes-vlep/generer.js <r4412-149.txt> <arrete-2004.txt>
// Pour mettre à jour : relire les pages ci-dessous, recopier les tableaux, mettre à jour empreinte, longueur et dates.
const fs = require('fs');
const path = require('path');

const TEXTES = [
  { id: 'R4412-149', titre: 'Code du travail, article R. 4412-149 (VLEP contraignantes)', nature: 'contraignante',
    url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018490738',
    version: 'Modifié par le décret n° 2026-253 du 8 avril 2026, en vigueur depuis le 10 avril 2026', luLe: '2026-10-25',
    empreinte: -943961251, longueur: 8861 },
  { id: 'arrete-2004', titre: 'Arrêté du 30 juin 2004 établissant la liste des VLEP indicatives (art. R. 4412-150)', nature: 'indicative',
    url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000440326',
    version: 'Modifié par l’arrêté du 8 avril 2026 (mise à jour Légifrance du 10 avril 2026)', luLe: '2026-10-25',
    empreinte: 1923054084, longueur: 5128 }
];
const COLS = ['nom', 'ce', 'cas', 'v8', 'v8ppm', 'v8f', 'vct', 'vctppm', 'vctf', 'obs', 'trans'];
const empreinte = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

const sorties = process.argv.slice(2).map((f, i) => {
  const T = TEXTES[i];
  const lignes = fs.readFileSync(f, 'utf8').replace(/\r/g, '').replace(/\n$/, '').split('\n');
  const tsv = lignes.map(l => l.split('|').join('\t')).join('\n');
  if (empreinte(tsv) !== T.empreinte || tsv.length !== T.longueur) throw new Error(T.id + ' : la copie ne correspond pas au texte lu sur Légifrance (empreinte ' + empreinte(tsv) + ', longueur ' + tsv.length + ')');
  const rows = lignes.map(l => { const c = l.split('|'); if (c.length !== 11) throw new Error(T.id + ' : ligne mal formée : ' + l); return Object.fromEntries(COLS.map((k, j) => [k, c[j]])); });
  return Object.assign({}, T, { lignes: rows });
});
if (sorties.length !== TEXTES.length) throw new Error('usage : node generer.js <r4412-149.txt> <arrete-2004.txt>');

const js = '/* VLEP réglementaires officielles, recopiées de Légifrance et contrôlées par empreinte (outils/textes-vlep/generer.js).\n' +
  '   Ne pas modifier à la main : relire les textes et relancer le générateur. */\n' +
  'const TEXTES_VLEP = ' + JSON.stringify(sorties) + ';\n';
const dest = path.join(__dirname, '..', '..', 'js', 'data', 'textes-vlep.js');
fs.writeFileSync(dest, js);
console.log('Écrit : js/data/textes-vlep.js (' + sorties.map(s => s.id + ' ' + s.lignes.length + ' lignes').join(', ') + ')');
