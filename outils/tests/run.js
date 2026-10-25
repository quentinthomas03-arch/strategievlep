// Tests automatiques de l'appli Stratégie VLEP (garde-fous) — à lancer avant chaque commit :
//   node outils/tests/run.js
// Charge les vrais fichiers de l'appli dans Node, dans l'ordre de index.html, avec un faux DOM qui accepte tout,
// puis vérifie la génération du plan, la planification, l'import d'inventaire et les justifications.
// Sortie : liste des tests en échec et code de retour 1 s'il y en a un.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const racine = path.join(__dirname, '..', '..');

// ---------- Contexte « navigateur » ----------
// Tout élément du DOM est un objet fantôme : on peut lire, écrire, appeler n'importe quoi sans erreur.
const fantome = new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === Symbol.iterator ? function* () {} : k === 'length' ? 0 : k === 'then' ? undefined : fantome,
  set: () => true, apply: () => fantome, construct: () => fantome, has: () => true
});
const store = {};
const ctx = {
  console: { log() {}, warn() {}, error: console.error }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, URL, Blob: function () {},
  TextDecoder, TextEncoder, Uint8Array, ArrayBuffer, DataView, Promise,
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: fantome, navigator: fantome, location: { protocol: 'file:' }, alert() {}, confirm: () => true, innerWidth: 1200,
  getSelection: () => fantome, addEventListener() {}, matchMedia: () => fantome
};
ctx.window = ctx;
vm.createContext(ctx);

// ---------- Mini-cadre de test ----------
let nOk = 0; const echecs = [];
function egal(nom, obtenu, attendu) {
  if (JSON.stringify(obtenu) === JSON.stringify(attendu)) nOk++;
  else echecs.push(nom + '\n      obtenu  : ' + JSON.stringify(obtenu) + '\n      attendu : ' + JSON.stringify(attendu));
}
function vrai(nom, cond) { egal(nom, !!cond, true); }
const run = code => vm.runInContext(code, ctx);

// ---------- 0. Chargement des modules dans l'ordre de index.html ----------
const page = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');
const scripts = [...page.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
vrai('index.html charge des modules', scripts.length > 20);
scripts.forEach(f => {
  try { vm.runInContext(fs.readFileSync(path.join(racine, f), 'utf8'), ctx, { filename: f }); nOk++; }
  catch (e) { echecs.push('chargement ' + f + ' : ' + e.message); }
});
scripts.filter(f => /^js\/(?!lib\/|data\/)/.test(f)).forEach(f =>
  vrai(f + ' commence par "use strict"', fs.readFileSync(path.join(racine, f), 'utf8').startsWith('"use strict";')));
vrai('démarrage chargé en dernier (après toutes les fonctions)', scripts.filter(f => !/lib\//.test(f)).pop() === 'js/demarrage.js');

// ---------- Dossier fictif (aléatoire figé) ----------
function dossierFictif() {
  run(`(() => {
    let seed = 42; Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    S = normalize({ v: 1, ent: { nom: 'Entreprise fictive', affaire: 'TEST-0001' } });
    S.cap = { pumps: 6, techs: 1, h8: 4, ct: 3 };
    const T = (t, duree, prod) => ({ id: uid(), t, duree, freq: 'Quotidienne', prod });
    const g1 = Object.assign(newGeh('Peintre cabine', '3'), { taches: [T('Application peinture au pistolet', 'Entre 1 et 4h', 'Peinture PU\\ntoluène, xylène')] });
    const g3 = Object.assign(newGeh('Agent de maintenance', '1'), { taches: [T('Nettoyage pistolets', 'Moins de 15 min', 'Diluant\\ntoluène')] });
    const g2 = Object.assign(newGeh('Opérateur dégraissage', '2'), { taches: [T('Dégraissage au trempé', 'Plus de 4h', 'Dégraissant\\nacétone')] });
    S.ateliers = [{ id: uid(), nom: 'Atelier peinture', gehs: [g1, g3] }, { id: uid(), nom: 'Atelier traitement', gehs: [g2] }];
    const add = (re, gehs) => { const b = BASE.find(x => re.test(x.agent) && String(x.labo || '').trim()); const a = snapshot(b); gehs.forEach(g => g.agents.push(a.uid)); S.agents.push(a); };
    add(/^toluène$/i, [g1, g3]); add(/^o-xylène/i, [g1]); add(/^acétate de n-butyle/i, [g1]); add(/^acétone$/i, [g2]); add(/^formaldéhyde$/i, [g2]);
  })()`);
}
const lignesPlan = () => run(`S.plan.map(p => [p.jour, p.ag.map(agName).join('+'), planGeh(p), p.nb, p.type, p.plage])`);

// ---------- 1. Base des agents ----------
vrai('base des agents chargée', run('BASE.length') > 250);
egal('toluène : VLEP réglementaire contraignante', run(`vtype(BASE.find(b => b.agent === 'toluène'))`), 'contr');

// ---------- 2. Génération du plan ----------
dossierFictif();
const r = run(`genPlan({ nb: 3, ct: true, grp: true, mode: 'cap' })`);
egal('plan : nombre de lignes et de jours', [r.n, r.days, r.nElim, r.orphans], [8, 4, 0, []]);
const CT = ' – 3 CT en 1re campagne (9 sur les 3 campagnes de l’évaluation initiale)';
egal('plan : lignes', lignesPlan(), [
  // plage écrite à partir de la tâche de l'inventaire
  ['J1', 'toluène+o-xylène', '1 - Peintre cabine', 3, '8h', 'Application peinture au pistolet (Entre 1 et 4h)'],
  // GEH de 3 personnes : 3 mesures 8 h le même jour ; 4 × 8 h par jour au plus -> l'acétate déborde sur J2
  // acétate de n-butyle : 0,05 L/min en 8 h contre 0,1 L/min pour toluène et xylène -> pompe à part ; absent des produits -> plage par défaut
  ['J1 / J2', 'acétate de n-butyle', '1 - Peintre cabine', 3, '8h', 'Entre 1 et 4h'],
  // les 3 CT d'une ligne le même jour, 3 CT par jour au plus (1 technicien)
  ['J1', 'toluène+o-xylène+acétate de n-butyle', '1 - Peintre cabine', 3, 'CT', 'Sur phase exposante : Application peinture au pistolet' + CT],
  // nettoyage des pistolets : 15 min, 1 fois par jour, toluène avec VLCT -> CT seul, pas de ligne 8 h
  ['J2', 'toluène', '2 - Agent de maintenance', 3, 'CT', 'Sur phase exposante : Nettoyage pistolets' + CT],
  // GEH de 2 personnes : 2 jours
  ['J2 / J3', 'acétone', '3 - Opérateur dégraissage', 3, '8h', 'Dégraissage au trempé (Plus de 4h)'],
  ['J3 / J4', 'formaldéhyde', '3 - Opérateur dégraissage', 3, '8h', 'Plus de 4h'],
  ['J3', 'acétone', '3 - Opérateur dégraissage', 3, 'CT', 'Sur phase exposante : Dégraissage au trempé' + CT],
  ['J4', 'formaldéhyde', '3 - Opérateur dégraissage', 3, 'CT', 'Sur phase exposante' + CT]
]);
// La planification ne dépasse jamais la capacité saisie (4 × 8 h, 3 CT, 6 pompes par jour pour 1 technicien)
const charge = run(`(() => { const d = {}; S.plan.forEach(p => p.jour.split(' / ').forEach(j => { d[j] = d[j] || { h8: 0, ct: 0 }; d[j][p.type === '8h' ? 'h8' : 'ct']++; })); return d; })()`);
vrai('planification : capacité 8 h respectée chaque jour', Object.values(charge).every(c => c.h8 <= 4));
vrai('planification : capacité CT respectée chaque jour', Object.values(charge).every(c => c.ct <= 3));
vrai('planification : pompes suffisantes chaque jour', Object.values(charge).every(c => c.h8 + Math.min(c.ct, 1) <= 6));
egal('justifications générées', run('genJust()'), 24);
vrai('justification : 3 CT par campagne, 9 sur l’évaluation initiale', run(`S.just.some(j => j.key === 'nb.ct' && /neuf sur les trois campagnes/.test(j.txt))`));
vrai('justification LQ absente quand toutes les LQ suffisent', !run(`S.just.some(j => j.key === 'infos.lq')`));

// Matrice : choix par défaut d'une case
egal('matrice : agent 8 h + CT réglementaire -> 8h+CT', run(`defState(BASE.find(b => b.agent === 'toluène'), { ct: true })`), '8h+CT');
egal('matrice : option CT décochée -> 8h', run(`defState(BASE.find(b => b.agent === 'toluène'), { ct: false })`), '8h');
egal('matrice : agent sans VLEP 8 h -> CT', run(`defState({ vct: 5 }, { ct: true })`), 'CT');
egal('durées Seirich classées', run(`['Moins de 15 min', 'Entre 15 min et 1h', 'Entre 1 et 4h', 'Plus de 4h', ''].map(DRANK)`), [1, 2, 3, 4, 0]);

// ---------- 2 bis. Moteur : règles sourcées (arrêté du 15/12/2009) ----------
const B = n => `BASE.find(b => b.agent === '${n}')`;
egal('débits : toluène + o-xylène sur une pompe en 8 h', run(`plageDebits([${B('toluène')}, ${B('o-xylène')}], '8h')`), { min: 0.1, max: 0.1 });
egal('débits : toluène (0,1) + acétate de n-butyle (0,05) incompatibles en 8 h', run(`!!plageDebits([${B('toluène')}, ${B('acétate de n-butyle')}], '8h').vide`), true);
egal('débits : toluène + acétate de n-butyle compatibles en CT', run(`!!plageDebits([${B('toluène')}, ${B('acétate de n-butyle')}], 'CT').vide`), false);
egal('débits inconnus : pas de contrainte', run(`plageDebits([{}, {}], '8h')`), null);
// formaldéhyde : LQ 0,12 µg ; 8 h : 0,2 L/min × 480 min × 0,37 mg/m³ ; CT : 0,5 L/min × 15 min × 0,74 mg/m³
egal('LQ formaldéhyde en 8 h ≈ 0,34 % de la VLEP', Math.round(run(`fractionLQ(${B('formaldéhyde')}, '8h')`) * 1e5), 338);
egal('LQ formaldéhyde en CT ≈ 2,2 % de la VLCT', Math.round(run(`fractionLQ(${B('formaldéhyde')}, 'CT')`) * 1e4), 216);
egal('LQ : agent fibreux non calculé', run(`fractionLQ({ agent: 'fibres céramiques réfractaires', lq: 1, v8: 0.1, dmax8: 1 }, '8h')`), null);
egal('LQ : données manquantes -> pas de calcul', run(`fractionLQ({ agent: 'x', v8: 1 }, '8h')`), null);
egal('mesures 8 h par jour : GEH de 1 / 2 / 5 personnes, effectif inconnu', run(`[1, 2, 5, ''].map(e => mesures8hParJour(e, 3))`), [1, 2, 3, 1]);
egal('CT par jour : tous ceux de la ligne', run(`[3, 1, ''].map(mesuresCTParJour)`), [3, 1, 1]);
egal('jours mini : 3 mesures, GEH de 1 / 2 / 5 personnes', run(`[1, 2, 5, ''].map(e => joursMini(3, e))`), [3, 2, 1, null]);
const ligne = (o, ags, geh) => run(`(() => { const g = newGeh('G', '${geh.eff}'); g.taches = ${JSON.stringify(geh.taches || [])}; S = normalize({ v: 1 }); S.ateliers = [{ id: 'a', nom: 'A', gehs: [g] }];
  S.agents = ${JSON.stringify(ags)}.map((a, i) => Object.assign({ uid: 'u' + i }, a)); const r = Object.assign({ kind: 'row', gehId: g.id, ag: S.agents.map(a => a.uid) }, ${JSON.stringify(o)});
  const x = analyseLigne(r); return { r: x.raisons.map(y => y.t), a: x.alertes.map(y => y.t) }; })()`);
const tol = run(`(() => { const a = Object.assign({}, ${B('toluène')}); delete a.ref; return a; })()`), but = run(`(() => { const a = Object.assign({}, ${B('acétate de n-butyle')}); delete a.ref; return a; })()`);
let x = ligne({ type: 'CT', nb: 3, jour: 'J1' }, [tol], { eff: '4' });
vrai('ligne CT : mention 3 CT en 1re campagne / 9 sur l’évaluation initiale', x.r.some(t => /3 CT en 1re campagne \(9 sur les 3 campagnes/.test(t)) && !x.a.length);
x = ligne({ type: 'CT', nb: 1, jour: 'J1' }, [tol], { eff: '4' });
vrai('ligne CT à 1 mesure : alerte', x.a.some(t => /il en faut 3 par campagne/.test(t)));
x = ligne({ type: '8h', nb: 3, jour: 'J1' }, [tol], { eff: '4' });
vrai('GEH de 4 personnes : 3 mesures 8 h le même jour, sans alerte', x.r.some(t => /le même jour sur des travailleurs différents/.test(t)) && !x.a.length);
x = ligne({ type: '8h', nb: 3, jour: 'J1 / J2 / J3' }, [tol], { eff: '' });
vrai('effectif inconnu : une mesure par jour par prudence, signalé', x.r.some(t => /effectif du GEH non renseigné/.test(t)));
x = ligne({ type: '8h', nb: 2, jour: 'J1 / J2' }, [tol], { eff: '4' });
vrai('ligne 8 h à 2 mesures : alerte', x.a.some(t => /au moins 3 par GEH/.test(t)));
x = ligne({ type: '8h', nb: 3, jour: 'J1' }, [tol], { eff: '1' });
vrai('GEH d’1 personne avec 3 mesures sur 1 jour : alerte 3 jours', x.a.some(t => /3 jours de mesure nécessaires, 1 prévu/.test(t)));
x = ligne({ type: '8h', nb: 3, jour: 'J1 / J2 / J3' }, [tol], { eff: '1' });
vrai('GEH d’1 personne sur 3 jours : pas d’alerte de jours', !x.a.some(t => /jours de mesure/.test(t)));
x = ligne({ type: '8h', nb: 3, jour: 'J1 / J2 / J3' }, [tol], { eff: '1', taches: [{ t: 'Vidange', freq: 'Mensuelle', duree: '1h', prod: 'Diluant\ntoluène' }] });
vrai('1 personne, 12 j/an : pas de mesurage exhaustif proposé (> 9 j)', !x.r.some(t => /exhaustif/.test(t)));
x = ligne({ type: '8h', nb: 3, jour: 'J1 / J2 / J3' }, [tol], { eff: '1', taches: [{ t: 'Vidange', freq: 'Annuelle', duree: '1h', prod: 'Diluant\ntoluène' }] });
vrai('1 personne, 1 j/an : mesurage exhaustif envisageable', x.r.some(t => /mesurage exhaustif, chaque jour d’exposition est mesuré/.test(t)));
x = ligne({ type: '8h', nb: 3, jour: 'J1' }, [tol, but], { eff: '4' });
vrai('toluène + acétate de n-butyle sur une ligne 8 h : alerte débits', x.a.some(t => /débits incompatibles/.test(t)));
x = ligne({ type: '8h', nb: 3, jour: 'J1' }, [{ agent: 'agent fictif', lq: 10, v8: 1, dmax8: 0.1 }], { eff: '4' });
vrai('LQ à 21 % de la VLEP : alerte « pas de conclusion dès la 1re campagne »', x.a.some(t => /20,8 % de la VLEP 8 h.*dès la 1re campagne/.test(t)));

// ---------- 3. Import d'un inventaire tableur ----------
// ---------- 2 ter. Règles relevées dans les dossiers réels, alignées sur l'arrêté ----------
// GEH d'une personne, opération 4 fois par an, toluène ; GEH de 3 personnes, nettoyage 10 min quotidien à l'acétone
run(`(() => { let seed = 7; Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  S = normalize({ v: 1 }); S.cap = { pumps: 8, techs: 2, h8: 4, ct: 4 };
  const T = (t, duree, freq, prod) => ({ id: uid(), t, duree, freq, prod });
  const gA = Object.assign(newGeh('Retouches', '1'), { taches: [T('Retouche peinture', 'Entre 1 et 4h', '4 fois / an', 'Peinture R\\ntoluène')] });
  const gB = Object.assign(newGeh('Conducteurs', '3'), { taches: [T('Nettoyage des rouleaux', '10 min', '1 fois / jour', 'Nettoyant\\nacétone'), T('Conduite', 'Plus de 4h', 'Quotidienne', '')] });
  const gC = Object.assign(newGeh('Soudeur', '1'), { taches: [T('Soudure', '2h', 'Quotidienne', 'Fumées\\ntoluène')] });
  S.ateliers = [{ id: uid(), nom: 'Atelier', gehs: [gA, gB, gC] }];
  const add = (n, gs) => { const a = snapshot(BASE.find(b => b.agent === n)); gs.forEach(g => g.agents.push(a.uid)); S.agents.push(a); };
  add('toluène', [gA, gC]); add('acétone', [gB]);
  genPlan({ nb: 3, ct: true, grp: true, mode: 'cap' });
})()`);
const P2 = lignesPlan();
egal('exhaustif (1 personne, 4 j/an) : 1 mesure 8 h et 1 CT, plage = tâche', P2.filter(l => /Retouches/.test(l[2])).map(l => [l[3], l[4], l[5]]),
  [[1, '8h', 'Retouche peinture (Entre 1 et 4h)'], [1, 'CT', 'Sur phase exposante : Retouche peinture']]);
egal('tâche de 10 min non répétée, acétone avec VLCT : CT seul (pas de 8 h)', P2.filter(l => /Conducteurs/.test(l[2])).map(l => [l[3], l[4]]), [[3, 'CT']]);
egal('1 personne exposée tous les jours : 3 mesures, pas d’exhaustif', P2.filter(l => /Soudeur/.test(l[2])).map(l => [l[3], l[4]]), [[3, '8h'], [3, 'CT']]);
vrai('lignes exhaustives et CT seul : aucune alerte', run(`S.plan.every(r => !analyseLigne(r).alertes.length)`));
egal('profil : jours d’exposition par an cumulés', run(`profilAgent(S.ateliers[0].gehs[0], S.agents[0]).jours`), 4);
run('genJust()');
vrai('justification exhaustive : cite l’arrêté § 1.3 et la tâche', run(`S.just.some(j => /^nb\\./.test(j.key) && /ne comporte qu’une personne/.test(j.txt) && /§ 1.3/.test(j.txt) && /Retouche peinture/.test(j.txt) && j.list.includes('toluène'))`));
vrai('pas de justification exhaustive pour le soudeur (exposé tous les jours)', !run(`S.just.some(j => /^nb\\./.test(j.key) && /Soudeur/.test(j.txt))`));
vrai('justification CT seul : VLEP 8 h vérifiée par pondération du CT (acétone)', run(`S.just.some(j => /^duree\\./.test(j.key) && /seule la VLEP court terme/.test(j.txt) && /acétone/i.test(j.txt + (j.list || []).join(' ')))`));
egal('aucune incohérence justifications / plan', run('controleJustifs().length'), 0);
run(`S.just.push({ id: 'x', sec: 'nb', key: 'manuel', on: true, txt: 'Mesurages exhaustifs prévus pour l’éthylèneglycol (vapeur).', list: [] });
  S.agents.push(snapshot(BASE.find(b => /^éthylèneglycol/.test(b.agent))));`);
egal('justification citant un agent absent du plan : signalée', run('controleJustifs().map(x => x.t)'), ['une justification cite « éthylèneglycol (vapeur) », absent du plan : retirer la phrase ou ajouter la ligne']);
const soude = run(`(() => { const a = Object.assign({}, BASE.find(b => /^hydroxyde de sodium/.test(b.agent))); delete a.ref; return a; })()`);
x = ligne({ type: '8h', nb: 1, jour: 'J1' }, [soude], { eff: '4' });
vrai('VLEP admise à 1 mesure : pas d’alerte', !x.a.length && x.r.some(t => /non réglementaire/.test(t)));

// GEH homonymes (inventaire à une ligne par produit) : détectés sur tout le site, fusionnés sur demande
egal('GEH homonymes : détection et fusion', run(`(() => { S = normalize({ v: 1 });
  const g1 = Object.assign(newGeh('Technicien de laboratoire', '10'), { taches: [{ id: 'a', t: 'DCO' }] }), g2 = Object.assign(newGeh('technicien de laboratoire'), { taches: [{ id: 'b', t: 'Phénol' }] }), g3 = newGeh('Cariste');
  S.ateliers = [{ id: 'x', nom: 'Labo 1', gehs: [g1, g3] }, { id: 'y', nom: 'Labo 2', gehs: [g2] }];
  const h = gehHomonymes(); const m = fusionGeh(h[0]);
  return [h.length, h[0].ateliers, m.taches.map(k => k.t), m.eff, S.ateliers.map(a => a.nom + ':' + a.gehs.length)]; })()`),
  [1, ['Labo 1', 'Labo 2'], ['DCO', 'Phénol'], '10', ['Labo 1:2']]);
// Périmètre du contrôle technique (R. 4412-27, R. 4412-76) : VLEP réglementaire, CMR compris ; ni VLEP admise ni CMR sans VLEP
egal('périmètre réglementaire', run(`[{ nat: 'Réglementaire contraignante' }, { nat: 'Réglementaire indicative' }, { nat: 'Indicative par circulaire' }, { nat: 'Admise' }, { cmr: 'C1B' }, { nat: '', refs: [BASE.findIndex(b => b.agent === 'toluène')] }].map(candReglementaire)`),
  [true, true, false, false, false, true]);

const inv = run(`parseInventaire({ Inventaire: [
  ['Atelier', 'Poste', 'Tâche', 'Produit', 'Substance', 'CAS', 'Durée', 'Fréquence'],
  ['Peinture', 'Peintre', 'Pistolage', 'Peinture A', 'toluène', '108-88-3', 'Entre 1 et 4h', 'Quotidienne'],
  ['Peinture', 'Peintre', 'Pistolage', 'Peinture A', 'acétone', '67-64-1', 'Entre 1 et 4h', 'Quotidienne'],
  ['Montage', 'Monteur', 'Collage', 'Colle B', 'acétone', '67-64-1', 'Moins de 15 min', 'Hebdomadaire'],
  ['Montage', 'Tous', 'Nettoyage', 'Nettoyant C', 'acétone', '67-64-1', 'Moins de 15 min', 'Quotidienne']
] })`);
egal('inventaire : ateliers et GEH', inv.ateliers.map(a => a.nom + ':' + a.gehs.map(g => g.des).join(',')), ['Peinture:Peintre', 'Montage:Monteur']);
egal('inventaire : substances candidates', inv.cand.map(c => c.cas + ' ' + c.gehs.join(',')).sort(), ['108-88-3 Peintre', '67-64-1 Peintre,Monteur']);
egal('inventaire : « Tous » ajouté à chaque GEH', inv.ateliers.flatMap(a => a.gehs).map(g => g.taches.length), [2, 2]);
egal('inventaire : VLEP reprise de la base', inv.cand.find(c => c.cas === '108-88-3').v8, String(run(`BASE.find(b => b.agent === 'toluène').v8`)));

// Risque faible dans l'ERC (colonne de l'inventaire) : ACD non CMR éliminé et justifié, CMR toujours mesuré (circulaire DGT 2010/03 § 2.2.2)
run(`(() => { const R = parseInventaire({ ERC: [
    ['Poste', 'Tâche', 'Produit', 'Substance', 'CAS', 'Durée', 'Fréquence', 'Effectif', 'Niveau de risque'],
    ['Laborantin', 'Dosage', 'Solvant A', 'toluène', '108-88-3', 'Entre 1 et 4h', 'Quotidienne', '3', 'Faible'],
    ['Laborantin', 'Fixation', 'Formol', 'formaldéhyde', '50-00-0', 'Entre 1 et 4h', 'Quotidienne', '3', 'Faible']] });
  S = normalize({ v: 1 }); S.ateliers = R.ateliers; S.cand = R.cand; S.cap = { pumps: 8, techs: 1, h8: 4, ct: 4 };
  ['108-88-3', '50-00-0'].forEach(cas => { const b = BASE.find(x => x._c === cas && String(x.labo || '').trim()); const a = snapshot(b); S.ateliers[0].gehs[0].agents.push(a.uid); S.agents.push(a); });
  genPlan({ nb: 3, ct: true, grp: true, mode: 'cap' }); genJust(); })()`);
egal('risque faible : toluène éliminé (x5), formaldéhyde (CMR) mesuré', run(`S.agents.map(a => matCell(S.ateliers[0].gehs[0], a, { ct: true }, linkMap()))`), ['x5', '8h+CT']);
vrai('risque faible : justification circulaire DGT 2010/03 § 2.2.2 avec le toluène', run(`S.just.some(j => j.key === 'mat.x5' && /2010\\/03/.test(j.txt) && j.list.some(x => /toluène/.test(x)))`));

// Import tolérant : simple liste de substances (sans poste), lieu servant de GEH, noms de FDS pollués
const liste = run(`parseInventaire({ Feuil1: [['Substance', 'Numéro CAS', 'VLEP8H'], ['TOLUENE', '108-88-3', '76,8'], ['ACETONE', '67-64-1', '1210']] })`);
egal('liste de substances sans poste : reprise sans GEH', [liste.sansGeh, liste.ateliers.length, liste.cand.map(c => c.cas).sort()], [true, 0, ['108-88-3', '67-64-1']]);
const loc = run(`parseInventaire({ 'Composition (4)': [['Produit', 'Localisation/ Utilisation', 'Numéro CAS', 'Nom de la substance'], ['Diluant X', 'Laboratoire', '108-88-3', 'toluène'], ['Colle Y', 'Atelier montage', '67-64-1', 'acétone']] })`);
egal('colonne de localisation prise comme GEH', [loc.sansGeh, loc.ateliers.flatMap(a => a.gehs.map(g => g.des))], [false, ['Laboratoire', 'Atelier montage']]);
const fds = run(`parseInventaire({ Composants: [['fichier', 'nom_produit_fds', 'nom_chimique', 'cas'], ['a.pdf', 'Produit A', '[1]', '108-88-3'], ['a.pdf', 'Produit A', 'Isopentyl acetate substance possédant une/des valeurs limites', '123-92-2']] })`);
egal('noms de substances pollués par la FDS : nom de la base', fds.cand.map(c => c.nom).sort(), run(`[BASE.find(b => b._c === '108-88-3'), BASE.find(b => b._c === '123-92-2')].map(b => cleanName(b.agent)).sort()`));
vrai('aucune colonne CAS : message clair', (() => { try { run(`parseInventaire({ F: [['Produit', 'Poste'], ['X', 'Y']] })`); return false; } catch (e) { return /colonne « CAS »/.test(e.message); } })());
// Ce qui manque : dossier vide puis dossier fictif complet
run(`S = normalize({ v: 1 })`);
egal('dossier vide : identification, agents, GEH manquants', run(`manques().map(x => x.p)`), ['ent', 'agents', 'geh']);
dossierFictif(); run(`Object.assign(S.ent, { adresse: 'a', cpville: 'b', siret: 'c', naf: 'd', contact: 'e', contactFonction: 'Responsable HSE', activite: 'f', dateMission: '2026-10-01' }); S.ateliers.forEach(a => a.gehs.forEach(g => { g.epc = '/'; g.epi = '/'; g.orga = '2 x 8'; })); genPlan({ nb: 3, ct: true, grp: true, mode: 'cap' }); genJust();`);
egal('dossier fictif complet : rien ne manque hors phrases à compléter', run(`manques().filter(x => x.p !== 'just').map(x => x.t)`), []);
egal('blancs de terrain : un par type de support (LAB REF 27)', run(`blancsTerrain()`), run(`[...new Set(S.agents.map(a => String(a.support).replace(/\\s+/g, ' ').trim()))]`));
vrai('mélange de vapeurs sur une ligne 8 h : additivité signalée (ED 6443)', run(`S.plan.some(r => r.type === '8h' && analyseLigne(r).raisons.some(x => /additivité/.test(x.t)))`));
run(`S.ateliers[0].gehs[0].eff = ''`);
vrai('effectif manquant signalé avec le nom du GEH', run(`manques().some(x => x.p === 'geh' && /Effectif/.test(x.t) && /Peintre cabine/.test(x.t))`));
run(`S.ent.ercMode = 'present'; S.ent.ercRef = ''`);
vrai('référence de l’ERC manquante signalée (LAB REF 27 § 7.7)', run(`manques().some(x => /évaluation des risques chimiques fournie/.test(x.t))`));
// silice cristalline seule dans un GEH : alerte (indice avec les poussières alvéolaires non silicogènes)
const silice = ligne({ type: '8h', nb: 3, jour: 'J1' }, [run(`(() => { const a = Object.assign({}, BASE.find(b => /silice cristalline \\(quartz\\)$/.test(b.agent))); delete a.ref; return a; })()`)], { eff: '4' });
vrai('silice sans poussières alvéolaires : alerte indice ED 6443', silice.a.some(t => /Cns\/Vns/.test(t)));

// ---------- 3 bis. Référentiel : VLEP officielles (R. 4412-149 du 8 avril 2026, arrêté du 30 juin 2004 modifié) ----------
egal('textes : 118 VLEP contraignantes et 75 indicatives', run(`TEXTES_VLEP.map(t => t.id + ':' + t.lignes.length)`), ['R4412-149:118', 'arrete-2004:75']);
egal('nature officielle : toluène 8 h, méthanol CT, phosphine CT, acide acétique 8 h, soude 8 h',
  run(`[['108-88-3', '8h'], ['67-56-1', 'CT'], ['7803-51-2', 'CT'], ['64-19-7', '8h'], ['1310-73-2', '8h']].map(([cas, t]) => natureOfficielle({ cas }, t))`),
  ['contraignante', 'aucune', 'indicative', 'indicative', null]);
vrai('méthanol : VLCT de la base traitée comme admise (1 CT, hors arrêté)', !run(`isRegl(BASE.find(b => b._c === '67-56-1'), 'CT')`) && run(`isRegl(BASE.find(b => b._c === '67-56-1'), '8h')`));
const ecarts = run('controleBase()');
// base corrigée le 25/10/2026 (outils/corriger-base) : plus d'écart avec les textes ni l'INRS
egal('contrôle de la base : aucun écart restant', ecarts.map(e => e.agent + ' : ' + e.t), []);
egal('base corrigée : triméthylamine contraignante, CO en mg/m³, tridymite inchangée', run(`[vtype(BASE.find(b => b._c === '75-50-3')), BASE.find(b => b._c === '630-08-0').v8, BASE.find(b => /silice cristalline \\(tridymite\\)$/.test(b.agent)).v8]`), ['contr', 23, 0.05]);
vrai('référentiel : lien officiel ou document fourni, date de lecture et apport pour chaque texte', run(`REFERENTIEL.every(r => (/^https:\\/\\/www\\.(legifrance\\.gouv|inrs)\\.fr\\//.test(r.url) || (!r.url && /\\.pdf$/.test(r.fichier))) && /^\\d{4}-\\d{2}-\\d{2}$/.test(r.luLe) && r.apport.length)`));
egal('INRS : export du 09/10/2026, 585 agents', run(`[INRS_VLEP.version, INRS_VLEP.lignes.length]`), ['Version du 09/10/2026', 585]);
egal('nature : VLCT méthanol admise, soude 8 h admise, toluène 8 h contraignante, soude CT aucune',
  run(`[['67-56-1', 'CT'], ['1310-73-2', '8h'], ['108-88-3', '8h'], ['1310-73-2', 'CT']].map(([cas, t]) => natureVlep({ cas }, t))`), ['admise', 'admise', 'contraignante', 'aucune']);

// ---------- 3 ter. Relecture experte (IA) : dossier envoyé, schéma, consignes, affichage (aucun appel à l'API) ----------
dossierFictif(); run(`Object.assign(S.ent, { nom: 'Chocolaterie Dupont', adresse: '12 rue des Lilas', siret: '12345678900011', contact: 'Jean Martin', contactFonction: 'Responsable HSE', ercRef: 'ERC Dupont 2026' });
  S.ateliers[0].gehs[0].notes = [{ txt: 'Vu avec Jean Martin : pistolage le matin' }]; genPlan({ nb: 3, ct: true, grp: true, mode: 'cap' }); genJust();`);
const dossAnon = JSON.stringify(run('dossierRelecture(true)')), dossClair = JSON.stringify(run('dossierRelecture(false)'));
vrai('relecture : anonymisé, aucune donnée d’identification du client', !/Dupont|Lilas|12345678900011|Jean Martin/.test(dossAnon) && /\[masqué\]/.test(dossAnon));
vrai('relecture : non anonymisé sur demande', /Chocolaterie Dupont/.test(dossClair));
vrai('relecture : le dossier porte le plan, les alertes du moteur, les VLEP officielles et les manques', (() => { const d = JSON.parse(dossAnon);
  return d.plan.length === 8 && d.plan.every(l => Array.isArray(l.moteur_raisons)) && d.agents.find(a => a.cas === '108-88-3').vlep_8h.nature === 'contraignante' && Array.isArray(d.analyse_moteur.manques) && d.ateliers.length === 2; })());
vrai('relecture : consignes identiques d’un appel à l’autre (cache) et référentiel inclus', run('relectSysteme() === relectSysteme()') && /LAB REF 27/.test(run('relectSysteme()')) && /circulaire DGT 2010\/03/i.test(run('relectSysteme()')));
vrai('relecture : schéma strict (tous les objets fermés, tous les champs requis)', run(`(() => { const ok = o => o.type !== 'object' || (o.additionalProperties === false && Object.keys(o.properties).every(k => o.required.includes(k)) && Object.values(o.properties).every(p => ok(p.type === 'array' ? p.items : p)));
  return ok(RELECT_SCHEMA); })()`));
const rendu = run(`relectureHtml({ date: '2026-10-25T10:00:00Z', modele: 'claude-opus-5-5', anonyme: true, resultat: { verdict: 'à reprendre', synthese: 'Deux points.', questions_visite: ['Combien de peintres ?'],
  constats: [{ gravite: 'majeur', theme: 'GEH', cible: 'GEH 1', constat: 'Tâches hétérogènes', pourquoi: 'Durées de 15 min à 4 h', source: 'arrêté, annexe 1 § 2.2', correction: 'Scinder le GEH' }] } })`);
vrai('relecture : affichage du verdict, des constats par gravité, des questions et du lien vers l’onglet', /à reprendre/.test(rendu) && /Majeur \(1\)/.test(rendu) && /Combien de peintres/.test(rendu) && /data-goto="geh"/.test(rendu));
vrai('relecture : SDK officiel embarqué (version figée)', /^\d+\.\d+\.\d+$/.test(run('ANTHROPIC_SDK.version')) && run('ANTHROPIC_SDK.source.length') > 100000);

// ---------- 4. Version un seul fichier ----------
const dist = path.join(racine, 'dist', 'Strategie_VLEP.html');
if (fs.existsSync(dist)) {
  const d = fs.readFileSync(dist, 'utf8');
  vrai('version un fichier : aucun script externe', !/<script src=/.test(d) && !/<link rel="stylesheet"/.test(d));
  vrai('version un fichier : plus récente que les modules', scripts.every(f => fs.statSync(path.join(racine, f)).mtimeMs <= fs.statSync(dist).mtimeMs));
}

// ---------- Bilan ----------
if (echecs.length) { console.log(echecs.length + ' test(s) en échec sur ' + (nOk + echecs.length) + ' :\n  - ' + echecs.join('\n  - ')); process.exit(1); }
console.log(nOk + ' tests OK');
