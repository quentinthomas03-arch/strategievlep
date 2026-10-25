// Met la base d'agents (js/data/agents.js) en accord avec les VLEP en vigueur :
//   1. tableaux officiels (js/data/textes-vlep.js : R. 4412-149 et arrêté du 30 juin 2004 modifié), par n° CAS ;
//   2. à défaut, export INRS (js/data/inrs-vlep.js) pour les VLEP admises ;
//   3. agents de groupe sans n° CAS (cadmium, diesel, diisocyanates…) : correspondance par nom, ci-dessous.
// Seules les valeurs (v8, vct en mg/m³) et la nature (vContr / vIndic / vAdm) sont touchées ; méthodes, supports, débits,
// LQ et commentaires restent tels quels. Chaque changement est écrit dans un journal ; ce qui demande un avis est listé à part.
//   node outils/corriger-base/corriger.js [--simuler]
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..', '..');
const lireConst = (f, nom) => JSON.parse(new RegExp('const ' + nom + ' = (.*);\\s*$', 's').exec(fs.readFileSync(path.join(racine, f), 'utf8'))[1]);
const AGENTS = lireConst('js/data/agents.js', 'AGENTS');
const TEXTES = lireConst('js/data/textes-vlep.js', 'TEXTES_VLEP');
const INRS = lireConst('js/data/inrs-vlep.js', 'INRS_VLEP');
const simuler = process.argv.includes('--simuler');

const CAS_RE = /\b\d{2,7}-\d{2}-\d\b/;
const casDe = s => (CAS_RE.exec(String(s || '')) || [''])[0];
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
const egal = (a, b) => a != null && b != null && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const fr = v => v == null ? '—' : String(v).replace('.', ',');
const nomDe = a => String(a.agent).replace(/\s+/g, ' ').trim();
const LBL = { contraignante: 'contraignante', indicative: 'indicative', admise: 'admise' };
const natureBase = a => a.vContr ? 'contraignante' : a.vIndic ? 'indicative' : a.vAdm ? 'admise' : '';

/* agents de groupe sans n° CAS dans les textes : ligne officielle par nom ; « garder8 » = valeur transitoire en vigueur */
const GROUPES = [
  { re: /^cadmium et compos/i, texte: 'R4412-149', ligne: /^Cadmium/, garder8: 0.004, note: 'valeur transitoire 0,004 mg/m³ applicable jusqu’au 11 juillet 2027, puis 0,001 mg/m³ (R. 4412-149)' },
  { re: /^emissions d.échappement/i, texte: 'R4412-149', ligne: /^Emissions d'échappement/ },
  { re: /^diisocyanates exprim/i, texte: 'arrete-2004', ligne: /^Diisocyanates/, note: 'VLEP indicative depuis le 9 avril 2026 ; contraignante à 0,006 / 0,012 mg/m³ au 1er janvier 2029 (R. 4412-149)' },
  { re: /^acide ars[ée]nique/i, texte: 'arrete-2004', ligne: /^Acide arsénique/ },
  { re: /^chrome VI/i, texte: 'R4412-149', ligne: /^Chrome hexavalent/ },
  { re: /^compos[ée]s du nickel.*inhalable/i, texte: 'R4412-149', ligne: /Nickel.*inhalable/ },
  { re: /^compos[ée]s du nickel.*alv[ée]olaire/i, texte: 'R4412-149', ligne: /Nickel.*alvéolaire/ },
  { re: /^plomb m[ée]tallique/i, texte: 'R4412-149', ligne: /^Plomb/ },
  { re: /^poussi[èe]res de bois/i, texte: 'R4412-149', ligne: /^Bois/ },
  { re: /^mercure et compos/i, texte: 'R4412-149', ligne: /^Mercure/ },
  { re: /^fibres c[ée]ramiques/i, texte: 'R4412-149', ligne: /^Fibres céramiques/, fibres: true },
  { re: /^mangan[èe]se.*alv[ée]olaire/i, texte: 'arrete-2004', ligne: /^Manganèse.*alvéolaire/ },
  { re: /^mangan[èe]se.*inhalable/i, texte: 'arrete-2004', ligne: /^Manganèse.*inhalable/ },
  { re: /^argent \(compos/i, texte: 'arrete-2004', ligne: /^Argent \(composés/ },
  { re: /^baryum/i, texte: 'arrete-2004', ligne: /^Baryum/ },
  { re: /^chrome \(m[ée]tal\)/i, texte: 'arrete-2004', ligne: /^Métal chrome/ },
  { re: /^fluorures inorganiques/i, texte: 'arrete-2004', ligne: /^Fluorures inorganiques/ },
  { re: /fraction alv[ée]olaire de silice cristalline \(quartz\)/i, texte: 'R4412-149', ligne: /dont le quartz/ },
  /* attention : le libellé du quartz se termine aussi par « …de cristobalite et de tridymite) » */
  { re: /fraction alv[ée]olaire de silice cristalline \(cristobalite\)/i, texte: 'R4412-149', ligne: /^Silice cristalline \(fraction alvéolaire de cristobalite\)$/ },
  { re: /fraction alv[ée]olaire de silice cristalline \(tridymite\)/i, texte: 'R4412-149', ligne: /^Silice cristalline \(fraction alvéolaire de tridymite\)$/ },
  { re: /^b[ée]ryl+ium/i, texte: 'R4412-149', ligne: /^Béryllium/ }
];
/* à ne pas corriger automatiquement : l'avis du technicien est nécessaire */
const A_REVOIR = [
  { re: /^4,4' MDI/i, t: 'MDI : la base garde une VLEP admise de 0,1 / 0,2 mg/m³ (exprimée en MDI) ; depuis le 9 avril 2026, les diisocyanates ont une VLEP indicative de groupe exprimée en NCO (0,01 / 0,02 mg/m³, arrêté du 30 juin 2004 modifié). Comparer au groupe « Diisocyanates exprimés en NCO » suppose de convertir le résultat en NCO.' }
];

const parTexte = id => TEXTES.find(t => t.id === id);
const officiel = cas => TEXTES.flatMap(t => t.lignes.filter(l => casDe(l.cas) === cas).map(l => ({ t, l })));
const inrsDe = cas => INRS.lignes.find(l => casDe(l.cas) === cas) || null;

const journal = [], revoir = [], vus = new Set();
const changer = (a, champ, avant, apres, source) => {
  journal.push({ agent: nomDe(a), cas: casDe(a.cas), champ, avant, apres, source });
  if (apres == null) delete a[champ]; else a[champ] = apres;
};
const fixerNature = (a, nat, source) => {
  const avant = natureBase(a); if (!nat || avant === nat) return;
  ['vContr', 'vIndic', 'vAdm'].forEach(k => delete a[k]);
  a[{ contraignante: 'vContr', indicative: 'vIndic', admise: 'vAdm' }[nat]] = 'X';
  journal.push({ agent: nomDe(a), cas: casDe(a.cas), champ: 'nature', avant: avant || '(aucune)', apres: nat, source });
};
const fixerValeur = (a, k, cible, source) => {
  const b = num(a[k]); if (cible == null || egal(b, cible)) return;
  changer(a, k, a[k] == null ? '(aucune)' : a[k], cible, source);
};

AGENTS.forEach(a => {
  const nom = nomDe(a), cas = casDe(a.cas);
  A_REVOIR.forEach(r => { if (r.re.test(nom)) revoir.push({ agent: nom, t: r.t }); });
  if (A_REVOIR.some(r => r.re.test(nom))) return;
  const groupe = GROUPES.find(g => g.re.test(nom));
  let L = cas && !groupe ? officiel(cas) : [];
  if (!L.length && groupe) { const T = parTexte(groupe.texte), l = T.lignes.find(x => groupe.ligne.test(x.nom)); if (l) L = [{ t: T, l }]; else revoir.push({ agent: nom, t: 'ligne officielle introuvable pour ce groupe' }); }
  if (L.length) {
    vus.add(nom);
    if (groupe && groupe.fibres) { fixerNature(a, 'contraignante', 'R. 4412-149'); return; }
    const c8 = L.find(x => num(x.l.v8) != null && x.t.nature === 'contraignante') || L.find(x => num(x.l.v8) != null);
    const cct = L.find(x => num(x.l.vct) != null && x.t.nature === 'contraignante') || L.find(x => num(x.l.vct) != null);
    const src = x => x.t.id === 'R4412-149' ? 'R. 4412-149 (décret du 8 avril 2026)' : 'arrêté du 30 juin 2004 modifié (8 avril 2026)';
    if (c8) fixerValeur(a, 'v8', groupe && groupe.garder8 != null ? groupe.garder8 : num(c8.l.v8), src(c8) + (groupe && groupe.note ? ' — ' + groupe.note : ''));
    if (cct) fixerValeur(a, 'vct', num(cct.l.vct), src(cct));
    /* valeur de la base sans équivalent dans les textes : VLEP admise si l'INRS la donne, sinon à revoir */
    const i = cas ? inrsDe(cas) : null;
    if (!c8 && num(a.v8) != null) { if (i && num(i.v8) != null) fixerValeur(a, 'v8', num(i.v8), 'INRS (VLEP 8 h admise)'); else revoir.push({ agent: nom, t: 'VLEP 8 h de la base (' + fr(a.v8) + ') absente des textes et de l’INRS' }); }
    /* texte en ppm seulement (ex. isocyanate de méthyle, 0,02 ppm) : la valeur de la base en mg/m³ est gardée */
    const ppmCT = L.some(x => num(x.l.vctppm) != null && num(x.l.vct) == null);
    if (!cct && num(a.vct) != null && ppmCT) journal.push({ agent: nom, cas, champ: 'vct (vérifiée)', avant: a.vct, apres: a.vct, source: 'texte en ppm seulement (' + L.find(x => num(x.l.vctppm) != null).l.vctppm + ' ppm) : valeur en mg/m³ de la base gardée' });
    else if (!cct && num(a.vct) != null) { if (i && num(i.vct) != null) fixerValeur(a, 'vct', num(i.vct), 'INRS (VLCT admise, non réglementaire)'); else revoir.push({ agent: nom, t: 'VLCT de la base (' + fr(a.vct) + ') absente des textes et de l’INRS' }); }
    const nat = c8 ? c8.t.nature : (cct ? cct.t.nature : '');
    fixerNature(a, nat, (c8 || cct) ? src(c8 || cct) : '');
    if (groupe && groupe.note && !journal.some(j => j.agent === nom)) journal.push({ agent: nom, cas, champ: 'note', avant: '', apres: '', source: groupe.note });
    return;
  }
  /* VLEP admises : export INRS */
  const i = cas ? inrsDe(cas) : null;
  if (i) {
    vus.add(nom);
    if (i.type !== 'admise') { revoir.push({ agent: nom, t: 'l’INRS la classe « ' + i.type + ' » mais son n° CAS ne figure pas dans les tableaux officiels' }); return; }
    fixerValeur(a, 'v8', num(i.v8), 'INRS (VLEP admise)');
    fixerValeur(a, 'vct', num(i.vct), 'INRS (VLEP admise)');
    fixerNature(a, 'admise', 'INRS (valeurs limites admises, circulaires)');
  }
});

/* VLEP officielles dont le n° CAS manque dans la base (on ne crée pas d'agent sans méthode ni support) */
const absents = TEXTES.flatMap(t => t.lignes.filter(l => casDe(l.cas) && !AGENTS.some(a => casDe(a.cas) === casDe(l.cas))).map(l => l.nom + ' (' + casDe(l.cas) + ', ' + t.nature + ')'));

const date = '2026-10-25';
const md = ['# Base d’agents : corrections du ' + date.split('-').reverse().join('/'), '',
  'Script : `node outils/corriger-base/corriger.js`. Sources : R. 4412-149 (décret n° 2026-253 du 8 avril 2026), arrêté du 30 juin 2004 modifié (arrêté du 8 avril 2026), export INRS ' + INRS.version.toLowerCase() + '. Valeurs en mg/m³.', '',
  '## Changements (' + journal.length + ')', '', '| Agent | CAS | Champ | Avant | Après | Source |', '|---|---|---|---|---|---|',
  ...journal.map(j => '| ' + [j.agent, j.cas || '—', j.champ, fr(j.avant), fr(j.apres), j.source].map(x => String(x).replace(/\|/g, '/')).join(' | ') + ' |'), '',
  '## À revoir par le technicien (' + revoir.length + ')', '', ...revoir.map(r => '- **' + r.agent + '** : ' + r.t), '',
  '## VLEP réglementaires sans agent dans la base (' + absents.length + ')', '', 'Non créés : il faut une méthode, un support et un laboratoire.', '', ...absents.map(x => '- ' + x), ''].join('\n');

if (!simuler) {
  fs.writeFileSync(path.join(racine, 'js', 'data', 'agents.js'), '/* Base des agents chimiques (méthodes, supports, VLEP) — VLEP mises en accord avec les textes le ' + date.split('-').reverse().join('/') + ' (outils/corriger-base) */\nconst AGENTS = ' + JSON.stringify(AGENTS) + ';\n');
  fs.writeFileSync(path.join(__dirname, 'journal-' + date + '.md'), md);
}
console.log(md);
