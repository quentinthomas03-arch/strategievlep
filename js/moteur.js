"use strict";
/* ================= Moteur de stratégie : règles sourcées ================= */
/* Chaque règle renvoie une raison lisible et sa source. Le moteur propose et justifie ; le technicien tranche.
   Source principale : arrêté du 15 décembre 2009 (version en vigueur, non modifiée depuis le 18/12/2009),
   https://www.legifrance.gouv.fr/loda/id/JORFTEXT000021487566 */
const SRC = {
  nb8h: "arrêté du 15/12/2009, annexe 1 § 2.3",
  ct: "arrêté du 15/12/2009, annexe 1 § 2.4",
  jours: "arrêté du 15/12/2009, annexe 1 § 1.3",
  exhaustif: "arrêté du 15/12/2009, annexe 1 § 1.3",
  debits: "plages de débit des méthodes, base des agents",
  lq: "arrêté du 15/12/2009, annexe 1 § 4.2 ; Cofrac LAB REF 27 § 7.5.2.1 ; LQ et débits de la base des agents",
  silice: "INRS ED 6443 § 2.3.4 (indice silice cristalline)",
  additivite: "INRS ED 6443 § 1.2 (convention d’additivité)",
  blancs: "Cofrac LAB REF 27 § 7.5.3.1"
};
const NB_CAMPAGNE = 3;      /* mesures par GEH et par campagne, 8 h comme CT (choix SOCOTEC pour le CT : 3 par campagne, 9 sur les 3 campagnes) */
const NB_EVAL_INITIALE = 9; /* mesures sur l'évaluation initiale (3 campagnes) */
const RARE_AN = 12;         /* tâche réalisée moins de 12 fois par an : mesures à caler sur ses jours de réalisation */
const CT_MIN = 15;          /* durée d'un prélèvement court terme (min) */
const POSTE_MIN = 480;      /* période de référence 8 h (min) */
const CT_MENTION = "3 CT en 1re campagne (9 sur les 3 campagnes de l’évaluation initiale)";

const numOf = v => { const n = parseFloat(String(v==null?"":v).replace(",",".")); return isFinite(n) && n>0 ? n : null; };
/* VLEP en f/cm³ (fibres) : le calcul en µg ne s'applique pas */
const isFibre = a => /fibre|amiante/i.test((a&&a.agent)||"");
const pct = x => (x<0.01 ? "< 1" : String(Math.round(x*1000)/10).replace(".",",")) + " %";
const fmtDebit = d => String(d).replace(".",",");

/* plage de débit commune à plusieurs agents sur une même pompe (L/min), null si inconnue, {vide:true} si incompatible */
function plageDebits(ags, type){
  const k = type==="CT" ? ["dminCT","dmaxCT"] : ["dmin8","dmax8"]; let mn = 0, mx = Infinity, connu = false;
  ags.forEach(a=>{ const lo = numOf(a[k[0]]), hi = numOf(a[k[1]]); if(lo==null && hi==null) return; connu = true; if(lo!=null) mn = Math.max(mn, lo); if(hi!=null) mx = Math.min(mx, hi); });
  if(!connu) return null;
  return mn<=mx ? {min:mn, max:mx===Infinity ? null : mx} : {vide:true, min:mn, max:mx};
}

/* Fraction de la VLEP atteinte par la LQ au débit maximal : LQ (µg) / (débit (L/min) × durée (min) × VLEP (mg/m³ = µg/L)).
   En 8 h, le résultat est pondéré sur 480 min : la fraction ne dépend pas de la durée d'exposition (prélèvement sur toute la période exposée). */
function fractionLQ(a, type, debitMax){
  if(!a || isFibre(a)) return null;
  /* VLEP en mg/m³ : celle du texte en vigueur si le CAS y figure (la base contient quelques valeurs en ppm), sinon celle de la base */
  const off = vlepOfficielles(a.cas).find(x=>x[type==="CT" ? "vct" : "v8"]!=null);
  const lq = numOf(a.lq), vlep = off ? off[type==="CT" ? "vct" : "v8"] : numOf(type==="CT" ? a.vct : a.v8), q = debitMax!=null ? debitMax : numOf(type==="CT" ? a.dmaxCT : a.dmax8);
  if(lq==null || vlep==null || q==null) return null;
  return lq / (q * (type==="CT" ? CT_MIN : POSTE_MIN) * vlep);
}

/* jours nécessaires pour faire nb mesures 8 h sur des travailleurs différents quand le GEH compte eff personnes */
function joursMini(nb, eff){ const e = parseInt(eff); return e>0 ? Math.ceil(nb/Math.min(e, nb)) : null; }
/* mesures 8 h d'une même ligne le même jour : une par travailleur ; effectif inconnu -> une par jour (prudent) */
function mesures8hParJour(eff, nb){ const e = parseInt(eff); return e>0 ? Math.max(1, Math.min(e, parseInt(nb)||1)) : 1; }
/* CT d'une même ligne : tous le même jour (pics d'une même journée, annexe 1 § 2.4), dans la limite de la capacité */
function mesuresCTParJour(nb){ return Math.max(1, parseInt(nb)||1); }

/* Substance candidate dans le périmètre du contrôle technique : VLEP réglementaire, contraignante (R. 4412-149) ou indicative
   (R. 4412-150), CMR compris (R. 4412-27 et R. 4412-76) ; un CMR sans VLEP réglementaire n'y entre pas. Nature lue dans
   l'inventaire, sinon dans la base. Une VLEP « indicative par circulaire » est une VLEP admise. */
function candReglementaire(c){
  if(vlepOfficielles(c.cas).length) return true;
  const n = norm(c.nat); if(n) return /contraignante|reglementaire/.test(n) && !/circulaire|admise/.test(n);
  return (c.refs||[]).some(r=>BASE[r] && ["contr","indic"].includes(vtype(BASE[r])));
}

/* Tâches d'un GEH où l'agent intervient (produit ou substance de la ligne), avec durée (min), fréquence par an et par jour */
function tachesAgent(g, a){
  const out = [], noms = [a.agent].concat(candOfAgent(a).map(c=>c.nom));
  const dur = x => jDur(x.duree)!=null ? jDur(x.duree) : jDur(x.freq), an = x => perYear(x.freq)!=null ? perYear(x.freq) : perYear(x.duree), jr = x => perDay(x.freq)!=null ? perDay(x.freq) : perDay(x.duree);
  taskGroups(g).forEach(gr=>{ const h = gr.items[0]; gr.items.forEach(k=>{ if(!noms.some(n=>prodMatch(k.prod, n, k))) return;
    out.push({nom:gr.name, risque:String(k.risque||h.risque||"").trim(), duree:(k.duree||h.duree||"").trim(), freqTxt:(k.freq||h.freq||"").trim(), min: dur(k)!=null ? dur(k) : dur(h), an: an(k)!=null ? an(k) : an(h), jour: jr(k)!=null ? jr(k) : jr(h)}); }); });
  return out;
}
/* Profil d'un couple GEH × agent :
   - courte : toutes ses tâches durent 15 min au plus et ne sont pas répétées dans la journée -> CT seul si VLCT, sinon 8 h pondérée sur la tâche
   - exhaustif : GEH d'une seule personne exposée 9 jours par an au plus (annexe 1 § 1.3) -> chaque jour d'exposition mesuré, 1 mesure par campagne */
function profilAgent(g, a){
  const T = g && a ? tachesAgent(g, a) : [], eff = g ? parseInt(g.eff) : NaN;
  /* exposition continue (« continu », « en permanence ») : jamais traitée comme une tâche courte */
  const continu = T.some(t=>/continu|en permanence|toute la journ/i.test(t.duree+" "+(t.freqTxt||"")));
  const courte = !continu && T.length>0 && T.every(t=>t.min!=null && t.min<=CT_MIN && (t.jour==null || t.jour<=1));
  const jours = T.length && T.every(t=>t.an!=null) ? T.reduce((s,t)=>s+t.an, 0) : null;
  /* ERC de l'employeur : GEH déclaré à risque faible, ou toutes les tâches de l'agent cotées en risque faible */
  const risqueFaible = !!(g && g.ercFaible) || (T.length>0 && T.every(t=>/faible|low|vert|green|^1$/i.test(t.risque)));
  /* tâche peu fréquente : moins de 12 fois par an, les jours de mesure doivent coïncider avec ceux de la tâche */
  const rare = !continu && jours!=null && jours<RARE_AN;
  return {taches:T, courte, continu, jours, rare, exhaustif: eff===1 && jours!=null && jours<=NB_EVAL_INITIALE, risqueFaible};
}
/* Plage horaire écrite à partir des tâches de l'inventaire (sinon null) */
function plageAuto(g, ags, type){
  const T = []; ags.forEach(a=>profilAgent(g, a).taches.forEach(t=>{ if(t.nom && !T.some(x=>norm(x.nom)===norm(t.nom))) T.push(t); }));
  if(!T.length) return null;
  const noms = T.length>3 ? "plusieurs tâches ("+T.length+")" : T.map(t=>t.nom).join(" / ");
  const P = ags.map(a=>profilAgent(g, a)), rare = P.every(p=>p.rare) && !P.every(p=>p.exhaustif) ?" – tâche réalisée "+Math.max(...P.map(p=>p.jours))+" fois par an au plus : à caler sur ses jours de réalisation" : "";
  if(type==="CT") return "Sur phase exposante"+(T.length>1 ? " – plusieurs phases : " : " : ")+noms+rare;
  const courte = P.every(p=>p.courte);
  return noms+(T.length===1 && T[0].duree ? " ("+T[0].duree+")" : "")+(courte ? " – prélèvement sur la tâche, pondéré sur 8 h" : "")+rare;
}
/* Justifications qui citent un agent absent du plan (sections durée, nombre de mesures, VLCT, informations) */
function controleJustifs(){
  const out = [], dansPlan = new Set(); S.plan.forEach(r=>{ if(r.kind!=="sec") planAgents(r).forEach(n=>dansPlan.add(norm(n))); });
  if(!dansPlan.size) return out;
  const cles = a => [norm(a.agent), norm(String(a.agent).split(" (")[0]), norm(String(a.agent).split(" ou ")[0])].filter(k=>k.length>3);
  (S.just||[]).forEach(j=>{ if(!j.on || !/^(duree|nb|vlepct|infos)$/.test(j.sec)) return;
    const txt = " "+norm([j.txt].concat(j.list||[]).join(" "))+" ";
    S.agents.forEach(a=>{ if(dansPlan.has(norm(a.agent))) return; if(cles(a).some(k=>txt.includes(" "+k+" "))) out.push({t:"une justification cite « "+String(a.agent).split(" — ")[0]+" », absent du plan : retirer la phrase ou ajouter la ligne", s:"cohérence justifications / plan"}); }); });
  return out.filter((x,i)=>out.findIndex(y=>y.t===x.t)===i);
}

/* Analyse d'une ligne du plan : {raisons:[...], alertes:[...]} ; chaque entrée = texte + source */
function analyseLigne(r){
  const out = {raisons:[], alertes:[]}, R = (t,s) => out.raisons.push({t, s}), A = (t,s) => out.alertes.push({t, s});
  if(r.kind==="sec" || !r.type) return out;
  const ags = (r.ag||[]).map(u=>S.agents.find(a=>a.uid===u)).filter(Boolean), nb = parseFloat(r.nb);
  const g = S.ateliers.flatMap(a=>a.gehs).find(x=>x.id===r.gehId), eff = g ? parseInt(g.eff) : NaN;
  const nomA = a => String(a.agent).split(" — ")[0];
  /* mesure hors arrêté (aucune VLEP réglementaire pour ce type) ou mesurage exhaustif : 1 mesure suffit */
  const regl = ags.some(a=>isRegl(a, r.type)), P = ags.map(a=>profilAgent(g, a)), exh = ags.length>0 && P.every(p=>p.exhaustif);
  if(ags.length && !regl) R("VLEP non réglementaire (admise) : hors du champ de l’arrêté, une mesure", SRC.nb8h);
  if(exh) R("1 seule personne exposée "+Math.max(...P.map(p=>p.jours))+" jour(s) par an au plus : mesurage exhaustif, chaque jour d’exposition est mesuré et comparé directement à la VLEP", SRC.exhaustif);
  if(P.some(p=>p.continu)) R("exposition continue sur le poste : la VLEP 8 h est mesurée sur la durée du poste", SRC.nb8h);
  if(ags.length && P.every(p=>p.rare) && !exh){ const j = Math.max(...P.map(p=>p.jours));
    A("tâche réalisée "+j+" fois par an au plus : les jours proposés ne valent que si elle est programmée ces jours-là, à caler avec le client"+(isNaN(eff) && j<=NB_EVAL_INITIALE ? " (si une seule personne l’effectue : mesurage exhaustif possible)" : ""), SRC.jours); }
  const nbOk = !regl || exh || isNaN(nb) || nb>=NB_CAMPAGNE;
  if(r.type==="8h"){
    if(regl && !exh) R("3 mesures 8 h par GEH et par campagne, sur des travailleurs différents", SRC.nb8h);
    if(!nbOk) A("seulement "+nb+" mesure(s) 8 h : il en faut au moins 3 par GEH et par campagne", SRC.nb8h);
    if(P.length && P.every(p=>p.courte)) R("tâche de 15 min au plus, non répétée : prélèvement sur la tâche, résultat pondéré sur 8 h (exposition nulle le reste du poste, à justifier)", SRC.nb8h);
    const nbJ = isNaN(nb) ? NB_CAMPAGNE : nb;
    if(nbJ<=1){ /* une seule mesure : pas de répartition sur plusieurs jours */ }
    else if(eff>0 && eff<nbJ){ const jm = joursMini(nbJ, eff), jours = new Set([...(r.jour||"").matchAll(/J\s*(\d+)/gi)].map(m=>m[1])).size;
      R("GEH de "+eff+" personne"+(eff>1?"s":"")+" : les "+nbJ+" mesures se répartissent sur "+jm+" jours au moins", SRC.jours);
      if(jours && jours<jm) A("GEH de "+eff+" personne"+(eff>1?"s":"")+" : "+jm+" jours de mesure nécessaires, "+jours+" prévu"+(jours>1?"s":""), SRC.jours); }
    else if(eff>0) R("GEH de "+eff+" personnes : les "+nbJ+" mesures 8 h peuvent être faites le même jour sur des travailleurs différents", SRC.jours);
    else if(g) R("effectif du GEH non renseigné : une mesure 8 h par jour par prudence (avec 3 personnes ou plus, les 3 mesures tiennent en un jour)", SRC.jours);
  } else {
    if(regl && !exh) R(CT_MENTION+", prélèvements de 15 min encadrant le pic ; plusieurs pics peuvent être mesurés dans la même journée", SRC.ct);
    if(!nbOk) A("seulement "+nb+" CT : il en faut 3 par campagne (9 sur l’évaluation initiale)", SRC.ct);
    const seul = ags.filter((a,i)=>P[i].courte && numOf(a.v8));
    if(seul.length) R("tâche de 15 min au plus, non répétée : seule la VLCT est mesurée, la VLEP 8 h est vérifiée par pondération du CT ("+seul.map(nomA).join(", ")+")", SRC.ct);
  }
  /* une pompe pour plusieurs agents : les débits doivent être compatibles */
  const pl = plageDebits(ags, r.type);
  if(ags.length>1 && pl){
    if(pl.vide) A("débits incompatibles sur une même pompe ("+ags.map(a=>nomA(a)+" "+fmtDebit(numOf(a[r.type==="CT"?"dminCT":"dmin8"])||"?")+"–"+fmtDebit(numOf(a[r.type==="CT"?"dmaxCT":"dmax8"])||"?")+" L/min").join(" ; ")+") : séparer les prélèvements", SRC.debits);
    else R("même support, débit commun "+fmtDebit(pl.min)+(pl.max!=null && pl.max!==pl.min?"–"+fmtDebit(pl.max):"")+" L/min", SRC.debits);
  }
  /* LQ : peut-on conclure dès la 1re campagne (tous les résultats < 0,1 VLEP) ? */
  const qmax = pl && !pl.vide && pl.max!=null ? pl.max : null;
  const vl = r.type==="CT" ? "VLCT" : "VLEP 8 h", okLQ = [];
  ags.forEach(a=>{ const f = fractionLQ(a, r.type, qmax); if(f==null) return;
    if(f>0.1) A(nomA(a)+" : la LQ correspond à "+pct(f)+" de la "+vl+" au débit maximal, au-dessus de 10 % : le respect ne pourra pas être conclu dès la 1re campagne"+(r.type==="CT"?" (9 CT nécessaires)":""), SRC.lq);
    else okLQ.push(nomA(a)+" "+pct(f)); });
  if(okLQ.length) R("LQ suffisantes pour conclure sous 10 % de la "+vl+" : "+okLQ.join(", "), SRC.lq);
  /* silice cristalline : l'indice Cns/Vns + Cq/0,1 + Cc/0,05 + Ct/0,05 suppose les poussières alvéolaires non silicogènes du même GEH */
  if(r.type==="8h" && ags.some(estSilice)){
    const alv = S.plan.some(x=>x.kind!=="sec" && x.gehId===r.gehId && x.type==="8h" && (x.ag||[]).some(u=>{ const b = S.agents.find(a=>a.uid===u); return b && estAlveolaireNonSilice(b); }));
    if(!alv) A("silice cristalline sans poussières alvéolaires non silicogènes dans ce GEH : elles entrent dans l’indice d’exposition Cns/Vns + Cq/0,1 + Cc/0,05 + Ct/0,05 ≤ 1", SRC.silice);
    else R("silice cristalline et poussières alvéolaires mesurées ensemble : indice d’exposition cumulé calculable", SRC.silice); }
  /* plusieurs vapeurs sur une même ligne 8 h : additivité à examiner si les effets ne sont pas indépendants */
  if(r.type==="8h" && ags.filter(estVapeur).length>1) R("mélange de vapeurs : la convention d’additivité Σ Ci/VLEPi ≤ 1 est à examiner si les effets ne sont pas indépendants (solvants)", SRC.additivite);
  return out;
}
/* CMR au sens du code du travail : catégorie 1A ou 1B, ou « par arrêté » (les C2, M2, R2 n'en sont pas) ;
   « certains composés » : traité comme CMR par prudence */
const estCMR1 = a => /1\s*A|1\s*B|cat[ée]gorie 1|par arr[êe]t[ée]|certains/i.test(String((a && a.cmr) || ""));
/* gaz / vapeur selon la base (l'agent du dossier n'en garde pas la marque : on la relit par sa référence) */
const estVapeur = a => { const b = a.ref!=null ? BASE[a.ref] : null; return !!((a.gaz || (b && b.gaz)) && !(a.partic || (b && b.partic))); };
const estSilice = a => /silice cristalline|quartz|cristobalite|tridymite/i.test(a.agent||"");
const estAlveolaireNonSilice = a => /alv[ée]olaire/i.test(a.agent||"") && /pollution particulaire|poussi[èe]res alv/i.test(a.agent||"") && !estSilice(a);
/* blancs de terrain : au moins un par site, par campagne et par type de support (LAB REF 27 § 7.5.3.1) */
function blancsTerrain(){
  const sup = new Map(); S.plan.forEach(r=>{ if(r.kind==="sec") return; (r.ag||[]).forEach(u=>{ const a = S.agents.find(x=>x.uid===u); const s = a && String(a.support||"").replace(/\s+/g," ").trim(); if(s && !sup.has(norm(s))) sup.set(norm(s), s); }); });
  return [...sup.values()];
}

/* Raisons d'une ligne en HTML (sous la ligne du plan) */
function raisonsHtml(r){
  const x = analyseLigne(r); if(!x.raisons.length && !x.alertes.length) return "";
  const li = (o,cls) => '<li'+(cls?' class="'+cls+'"':'')+'>'+esc(o.t)+' <span class="src">('+esc(o.s)+')</span></li>';
  return '<ul class="why">'+x.alertes.map(o=>li(o,"al")).join("")+x.raisons.map(o=>li(o)).join("")+'</ul>';
}

/* ================= Ce qui manque pour terminer la stratégie ================= */
/* Liste {t, p} : t = ce qui manque, p = onglet où le compléter. Rien n'est bloqué : l'appli remplit ce qu'elle peut. */
const ENT_LBL = {nom:"nom", adresse:"adresse", cpville:"code postal et ville", siret:"SIRET", naf:"code NAF", contact:"contact sur site", contactFonction:"fonction du contact (personnes rencontrées, LAB REF 27 § 7.7)", activite:"activité", affaire:"n° d'affaire", dateMission:"date de la visite préalable"};
function manques(){
  const out = [], M = (t, p) => out.push({t, p}), gehs = S.ateliers.flatMap(a=>a.gehs).filter(g=>gehActive(g));
  const ent = Object.keys(ENT_LBL).filter(k=>!String(S.ent[k]||"").trim()).map(k=>ENT_LBL[k]);
  if(ent.length) M("Identification de l’entreprise : "+ent.join(", "), "ent");
  if(!S.agents.length) M("Aucun agent chimique retenu : importer un inventaire, une évaluation des risques ou des FDS, ou ajouter les agents depuis la base", "agents");
  const sansCompo = typeof exAll==="function" ? exAll().filter(x=>x.x.why==="sans-compo").length : 0;
  if(sansCompo) M(sansCompo+" ligne(s) produit sans composition connue : FDS à obtenir pour savoir quels agents mesurer", "agents");
  /* LAB REF 27 § 7.7 : documents fournis cités avec leurs références et versions */
  if(S.ent.ercMode!=="absent" && ((S.cand||[]).length || S.ent.ercMode==="present") && (!String(S.ent.ercRef||"").trim() || !String(S.ent.ercDate||"").trim())) M("Référence et date de l’évaluation des risques chimiques fournie (LAB REF 27 § 7.7 : documents fournis avec références et versions)", "ent");
  const sansMeth = S.agents.filter(a=>!noLab(a) && !String(a.methode||"").trim()).map(a=>String(a.agent).split(" — ")[0]);
  if(sansMeth.length) M("Méthode de prélèvement et d’analyse non renseignée (tableau des méthodes, LAB REF 27 § 7.7) : "+sansMeth.slice(0,8).join(" ; ")+(sansMeth.length>8?"…":""), "agents");
  if(!gehs.length) M("Aucun GEH : postes, tâches, durées et fréquences à définir lors de la visite préalable", "geh");
  else {
    const L = (f, txt) => { const l = gehs.filter(f).map(g=>g.des||"(sans nom)"); if(l.length) M(txt+" ("+l.length+") : "+l.slice(0,8).join(" ; ")+(l.length>8?"…":""), "geh"); };
    L(g=>!String(g.eff||"").trim(), "Effectif des GEH, utile pour savoir combien de jours de mesure prévoir");
    gehHeterogenes().forEach(h=>M("GEH « "+h.g.des+" » peut-être hétérogène : « "+h.taches[0]+" » et « "+h.taches[1]+" » sans agent commun et de durées très différentes (scinder si ce sont des personnes différentes)", "geh"));
    L(g=>!String(g.orga||"").trim(), "Organisation du travail des GEH : équipes, horaires (périmètre et périodes de prélèvement, LAB REF 27 § 7.7)");
    L(g=>(g.taches||[]).some(k=>(k.t||k.prod) && !String(k.duree||"").trim()), "Durée d’exposition des tâches");
    L(g=>(g.taches||[]).some(k=>(k.t||k.prod) && !String(k.freq||"").trim()), "Fréquence d’exposition des tâches");
    L(g=>!String(g.epc||"").trim() || !String(g.epi||"").trim(), "Environnement de travail / EPC et EPI (« / » si aucun)");
  }
  if(gehs.length && S.agents.length){
    if(!capSet()) M("Paramètres de terrain : pompes, techniciens, nombre de 8 h et de CT par jour", "plan");
    const lignes = S.plan.filter(r=>r.kind!=="sec");
    if(!lignes.length) M("Plan d’échantillonnage à générer", "plan");
    else { const n = lignes.reduce((s,r)=>s+analyseLigne(r).alertes.length, 0); if(n) M(n+" point(s) du plan à reprendre selon les règles", "plan"); }
  }
  const tbc = (S.just||[]).filter(j=>j.on && ((j.txt||"").includes("[à compléter]") || (j.list||[]).some(x=>String(x).includes("[à compléter]")))).length;
  if(tbc) M(tbc+" justification(s) contenant « [à compléter] »", "just");
  controleJustifs().forEach(x=>M(x.t.charAt(0).toUpperCase()+x.t.slice(1), "just"));
  return out;
}
const ONGLET_LBL = {ent:"1 · Entreprise", agents:"3 · Agents", geh:"4 · GEH & tâches", plan:"5 · Plan", just:"6 · Justifications"};
function manquesHtml(){
  const L = manques();
  if(!L.length) return '<div class="ok"><b>Rien ne manque :</b> la stratégie peut être générée.</div>';
  return '<div class="warn"><b>Ce qu’il reste à compléter ('+L.length+')</b> — l’appli a rempli tout ce qu’elle pouvait à partir des documents fournis.<ul style="margin:6px 0 0 18px;padding:0">'+
    L.map(x=>'<li>'+esc(x.t)+' <button class="btn sm" data-goto="'+x.p+'">'+esc(ONGLET_LBL[x.p]||x.p)+'</button></li>').join("")+'</ul></div>';
}
document.addEventListener("click", e=>{ const b = e.target.closest("[data-goto]"); if(b) show(b.dataset.goto); });

/* ================= GEH à regrouper ou à scinder ================= */
/* Un GEH réunit des fonctions ou tâches similaires justifiant des situations d'exposition comparables (arrêté du 15/12/2009,
   annexe 1 § 2.2) ; il concerne des travailleurs exposés aux mêmes agents et effectuant les mêmes tâches (circulaire DGT
   2010/03 § 4.1). */
const SRC_GEH = "arrêté du 15/12/2009, annexe 1 § 2.2 ; circulaire DGT 2010/03 § 4.1";
const rangDuree = t => { const m = t.min; if(m==null) return DRANK(t.duree)||0; return m<=15 ? 1 : m<=60 ? 2 : m<=240 ? 3 : 4; };
/* profil d'exposition d'un GEH : pour chaque agent retenu, tâche courte ou non, rang de durée, fréquence quotidienne ou non */
function signatureGeh(g){
  const ags = agentsOfGeh(g).map(u=>S.agents.find(a=>a.uid===u)).filter(a=>a && !noLab(a)); if(!ags.length) return null;
  return ags.map(a=>{ const p = profilAgent(g, a), rk = Math.max(0, ...p.taches.map(rangDuree)), an = Math.max(0, ...p.taches.map(t=>t.an||0));
    return (casNorm(a.cas)||norm(a.agent))+"|"+(p.courte?"courte":"longue")+"|"+rk+"|"+(an>=52?"frequent":"rare"); }).sort().join(";");
}
/* groupes de GEH d'un même atelier au profil identique : regroupement possible (à décider par le technicien) */
function gehARegrouper(){
  const out = [];
  S.ateliers.forEach(at=>{ const by = {}; at.gehs.filter(gehActive).forEach(g=>{ const s = signatureGeh(g); if(s) (by[s] = by[s]||[]).push(g); });
    Object.values(by).forEach(l=>{ if(l.length>1 && new Set(l.map(g=>norm(g.des))).size>1) out.push({atelier:at.nom, gehs:l, agents:agentsOfGeh(l[0]).map(agName).filter(Boolean)}); }); });
  return out;
}
/* GEH dont deux tâches n'ont aucun agent commun et des durées très différentes : peut-être deux populations distinctes */
function gehHeterogenes(){
  const out = [];
  const court = s => { s = String(s).replace(/\s+/g," ").trim(); return s.length>60 ? s.slice(0,57)+"…" : s; };
  S.ateliers.forEach(at=>at.gehs.filter(gehActive).forEach(g=>{
    if(parseInt(g.eff)===1) return;   /* une seule personne : pas deux populations */
    const T = {}; S.agents.filter(a=>!noLab(a)).forEach(a=>profilAgent(g, a).taches.forEach(t=>{ if(!t.nom) return; const k = norm(t.nom); T[k] = T[k] || {nom:t.nom, ags:new Set(), rk:0}; T[k].ags.add(a.uid); T[k].rk = Math.max(T[k].rk, rangDuree(t)); }));
    const L = Object.values(T); let paire = null;
    L.forEach((x,i)=>L.slice(i+1).forEach(y=>{ if(!paire && Math.abs(x.rk-y.rk)>=2 && ![...x.ags].some(u=>y.ags.has(u))) paire = [x, y]; }));
    if(paire) out.push({g, taches:paire.map(x=>court(x.nom))}); }));
  return out;
}
