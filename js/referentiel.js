"use strict";
/* ================= Référentiel : textes vérifiés et VLEP officielles ================= */
/* Seuls des textes lus à la source y figurent, avec leur lien et la date de lecture. « apport » dit ce que l'appli en tire,
   en résumé (pas une citation). Les tableaux de VLEP sont dans js/data/textes-vlep.js (copie contrôlée par empreinte). */
const REFERENTIEL = [
  {id:"arrete-2009", titre:"Arrêté du 15 décembre 2009 relatif aux contrôles techniques des VLEP et aux conditions d’accréditation des organismes", url:"https://www.legifrance.gouv.fr/loda/id/JORFTEXT000021487566", version:"En vigueur, non modifié depuis le 18/12/2009", luLe:"2026-10-25",
    apport:["3 mesures 8 h au moins par GEH et par campagne, 3 campagnes au plus en un an (annexe 1 § 1.2 et 2.3)", "GEH d’une ou deux personnes : 2 ou 3 jours de mesure ; mesurage exhaustif possible, par exemple une personne exposée 9 jours par an au plus (§ 1.3)", "8 h : toute la période d’exposition, exposition nulle hors période à justifier (§ 2.3)", "VLCT : 9 mesurages au moins sur l’évaluation initiale, 15 min, plusieurs pics possibles le même jour (§ 2.4)", "Respect dès la 1re campagne si tous les résultats sont sous 10 % de la VLEP (§ 4.2) ; seuils U de l’annexe 2", "Prélèvement hors EPI, interférences à vérifier (§ 2.2 et 3)"]},
  {id:"R4412-27", titre:"Code du travail, art. R. 4412-27 à R. 4412-31 (agents chimiques dangereux)", url:"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018490393", version:"En vigueur (R. 4412-30 modifié le 13/02/2021)", luLe:"2026-10-25",
    apport:["Contrôle technique par un organisme accrédité pour les VLEP des art. R. 4412-149 et R. 4412-150, au moins une fois par an et à chaque changement", "Dépassement d’une VLEP contraignante : mesures immédiates ; d’une VLEP indicative : nouvelle évaluation des risques", "Rapports communiqués au médecin du travail et au CSE"]},
  {id:"R4412-76", titre:"Code du travail, art. R. 4412-76 à R. 4412-80 (agents CMR)", url:"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018490522", version:"En vigueur (R. 4412-79 modifié le 13/02/2021)", luLe:"2026-10-25",
    apport:["Contrôle technique d’un CMR seulement s’il a une VLEP réglementaire (R. 4412-149 ou R. 4412-150)", "Dépassement d’une VLEP contraignante pour un CMR : arrêt du travail aux postes concernés"]},
  {id:"R4412-149", titre:"Code du travail, art. R. 4412-149 à R. 4412-151 (fixation des VLEP)", url:"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018490738", version:"R. 4412-149 modifié par le décret n° 2026-253 du 8 avril 2026", luLe:"2026-10-25",
    apport:["Tableau des VLEP contraignantes (repris en entier dans l’appli)", "Les VLEP indicatives sont fixées par arrêté (R. 4412-150)"]},
  {id:"arrete-2004", titre:"Arrêté du 30 juin 2004 établissant la liste des VLEP indicatives", url:"https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000440326", version:"Modifié par l’arrêté du 8 avril 2026", luLe:"2026-10-25",
    apport:["Tableau des VLEP indicatives réglementaires (repris en entier dans l’appli)"]},
  {id:"R4724-8", titre:"Code du travail, art. R. 4724-8 à R. 4724-13 (organismes accrédités)", url:"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018493907", version:"En vigueur (R. 4724-10 modifié le 01/01/2018)", luLe:"2026-10-25",
    apport:["La stratégie de prélèvement est établie par l’organisme accrédité après consultation de l’employeur, du médecin du travail et du CSE ; l’employeur communique son évaluation des risques chimiques", "Prélèvements sur des postes en situation représentative de l’exposition", "Analyse sous-traitable à un autre organisme accrédité ; résultats transmis à l’organisme national (base Scol@ de l’INRS)"]},
  {id:"inrs-vlep", titre:"INRS, base de données des VLEP françaises (reprend l’outil 65, export Excel)", url:"https://www.inrs.fr/publications/bdd/vlep.html", version:"Export fourni : "+(typeof INRS_VLEP!=="undefined" ? INRS_VLEP.version.toLowerCase() : "non chargé")+" ("+(typeof INRS_VLEP!=="undefined" ? INRS_VLEP.lignes.length : 0)+" agents)", luLe:"2026-10-25",
    apport:["Source des VLEP admises (circulaires), absentes des textes ci-dessus", "Une ligne par agent sous un seul type : une VLCT rangée sous « contraignante » peut être admise (l’INRS le précise en commentaire, ex. méthanol) ; la nature de chaque valeur se lit dans les textes", "Sert au contrôle de la base d’agents"]},
  {id:"lab-ref-27", titre:"Cofrac, LAB REF 27 révision 02 : exigences spécifiques pour l’accréditation des organismes contrôlant les expositions professionnelles aux agents chimiques", url:"", fichier:"lab-ref-27_rev02.pdf", version:"Applicable depuis le 1er juillet 2018", luLe:"2026-10-25",
    apport:["La stratégie explicite (§ 7.7) : objet, périmètre (locaux, horaires, ateliers, équipes, agents), documents fournis avec références et versions, personnes rencontrées, GES et nombre de travailleurs, et pour le plan : agents et types de VLEP avec n° CAS, type de mesure, durée compatible avec la méthode et la LQ visée, nombre de mesures, périodes, conditions d’activité, phases des mesures CT, fractionnements et périodes de port d’EPI, tableau des méthodes", "LQ globale (prélèvement et analyse) permettant de quantifier 0,1 VLEP 8 h ou CT (§ 7.5.2.1)", "Au moins un blanc de terrain par site, par campagne et par type de support (§ 7.5.3.1)", "Durée et débit fixés pour un résultat exploitable ; prélèvements simultanés compatibles avec le nombre de techniciens présents (§ 7.5.3.3 et 7.5.3.4)", "Visite préalable ; s’en passer seulement si c’est argumenté (§ 7.1.1) ; le contrat dit s’il s’agit d’un contrôle réglementaire"]},
  {id:"circulaire-2010", titre:"Circulaire DGT 2010/03 du 13 avril 2010 relative au contrôle du risque chimique sur les lieux de travail", url:"", fichier:"circulaire du 13 avril 2010.pdf", version:"Circulaire d’application du décret et de l’arrêté du 15 décembre 2009", luLe:"2026-10-25",
    apport:["CMR à VLEP réglementaire : contrôle annuel systématique (§ 2.2.1)", "ACD non CMR : contrôle selon l’évaluation des risques ; pas de contrôle si elle conclut à un risque faible (§ 2.2.2, art. R. 4412-12 et R. 4412-13)", "VLCT : toutes les mesures peuvent être faites sur une ou plusieurs journées consécutives (§ 4.2.1)", "Mesures antérieures (internes, Carsat, SST) : elles éclairent la stratégie mais ne remplacent pas les mesures réglementaires (§ 4.1 et 4.2.1)", "EPI respiratoires : concentration mesurée hors masque divisée par le FPA (NF EN 529 annexe C), le plus bas des facteurs de protection (§ 4.4)"]},
  {id:"ed-6443", titre:"INRS ED 6443 : Les valeurs limites d’exposition professionnelle", url:"", fichier:"ED 6443 - les VLEP.pdf", version:"1re édition, mars 2021", luLe:"2026-10-25",
    apport:["Convention d’additivité pour les VLEP 8 h quand les effets ne sont pas indépendants, notamment pour les mélanges de solvants (§ 1.2)", "Silice cristalline : Cns/Vns + Cq/0,1 + Cc/0,05 + Ct/0,05 ≤ 1, ce qui suppose de mesurer aussi les poussières alvéolaires non silicogènes (§ 2.3.4)", "Mention « peau » : la VLEP ne couvre pas la voie cutanée"]},
  {id:"ed-984", titre:"INRS ED 984 : VLEP aux agents chimiques en France (aide-mémoire technique)", url:"", fichier:"Aide mémoire technique.pdf", version:"Édition d’octobre 2016 : tableaux dépassés, remplacés par la base VLEP de l’INRS", luLe:"2026-10-25",
    apport:["Définitions (VLEP 8 h, CT, valeurs admises), conventions des fractions inhalable et alvéolaire ; valeurs à prendre dans la base INRS à jour"]},
  {id:"ed-6106", titre:"INRS ED 6106 : Les appareils de protection respiratoire, choix et utilisation", url:"", fichier:"Les appareils de protection respiratoire.pdf", version:"Document fourni", luLe:"2026-10-25",
    apport:["Tableaux des FPA (dont ceux de l’annexe C de la NF EN 529) pour la pondération par les EPI respiratoires, au moment du calcul des résultats"]},
  {id:"ed-6132", titre:"INRS ED 6132 : Les fumées de soudage et des techniques connexes", url:"https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-6132.pdf", fichier:"", version:"Octobre 2018", luLe:"2026-10-25",
    apport:["Polluants émis selon le procédé et le matériau (§ 4) : chrome VI et nickel sur inox, oxyde de zinc sur galvanisé, ozone en TIG et sur aluminium, dioxyde d’azote à la flamme, monoxyde de carbone en MAG CO₂ ; base de la table « procédés → agents » de la préparation"]},
  {id:"ed-972", titre:"INRS ED 972 : Captage et traitement des aérosols de fluides de coupe", url:"https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-972.pdf", fichier:"", version:"2005", luLe:"2026-10-25",
    apport:["Pas de VLEP française pour les aérosols de fluides de coupe ; objectif de 0,5 mg/m³ en fraction inhalable (§ 4.2.1) ; machines concernées : tours, fraiseuses, rectifieuses, perceuses, presses (§ 1)"]}
];

const casNorm = s => (CAS_RE.exec(String(s||""))||[""])[0];
const vNum = v => { const n = parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",",".")); return isFinite(n) ? n : null; };
/* VLEP officielles d'un n° CAS : [{texte, nature, v8, vct, ligne}] (vide si le CAS ne figure dans aucun texte) */
function vlepOfficielles(cas){
  cas = casNorm(cas); if(!cas || typeof TEXTES_VLEP==="undefined") return [];
  return TEXTES_VLEP.flatMap(T=>T.lignes.filter(l=>casNorm(l.cas)===cas).map(l=>({texte:T.id, titre:T.titre, nature:T.nature, v8:vNum(l.v8), vct:vNum(l.vct), ligne:l})));
}
/* Nature officielle de la VLEP 8 h ou CT d'un agent : « contraignante », « indicative », « aucune » (CAS listé mais pas
   de valeur pour ce type : VLEP admise ou sans VLEP), ou null (CAS absent des textes : on ne sait pas) */
function natureOfficielle(a, type){
  const L = vlepOfficielles(a && a.cas); if(!L.length) return null;
  const k = type==="CT" ? "vct" : "v8", c = L.find(x=>x[k]!=null && x.nature==="contraignante"), i = L.find(x=>x[k]!=null && x.nature==="indicative");
  return c ? "contraignante" : (i ? "indicative" : "aucune");
}
/* Ligne INRS d'un n° CAS (null si absent ou export non chargé) */
function vlepInrs(cas){ cas = casNorm(cas); if(!cas || typeof INRS_VLEP==="undefined") return null; return INRS_VLEP.lignes.find(l=>casNorm(l.cas)===cas) || null; }
/* Nature d'une VLEP 8 h ou CT : « contraignante » ou « indicative » (textes), « admise » (valeur INRS absente des textes),
   « aucune » (CAS connu, pas de valeur pour ce type), null (CAS inconnu des textes et de l'INRS) */
function natureVlep(a, type){
  const off = natureOfficielle(a, type); if(off==="contraignante" || off==="indicative") return off;
  const i = vlepInrs(a && a.cas); if(i && vNum(type==="CT" ? i.vct : i.v8)!=null) return "admise";
  return off || (i ? "aucune" : null);
}
/* Contrôle de la base d'agents contre les textes et l'INRS : valeurs et natures qui diffèrent */
function controleBase(){
  const out = [];
  /* VLEP admises : valeurs de la base comparées à l'INRS quand le CAS n'est pas dans les textes */
  BASE.forEach(b=>{ if(vlepOfficielles(b.cas).length) return; const i = vlepInrs(b.cas); if(!i) return; const nom = cleanName(b.agent);
    ["8h","CT"].forEach(type=>{ const k = type==="CT" ? "vct" : "v8", vi = vNum(i[k]), vb = vNum(b[k]);
      if(vi!=null && vb!=null && Math.abs(vi-vb)>1e-9*Math.max(1,vi)) out.push({agent:nom, cas:casNorm(b.cas), t:"VLEP "+type+" admise : "+fmt(vb)+" dans la base, "+fmt(vi)+" mg/m³ à l’INRS"});
      if(vi!=null && vb==null) out.push({agent:nom, cas:casNorm(b.cas), t:"VLEP "+type+" admise de l’INRS ("+fmt(vi)+" mg/m³) absente de la base"}); }); });
  BASE.forEach(b=>{ const L = vlepOfficielles(b.cas); if(!L.length) return; const nom = cleanName(b.agent);
    ["8h","CT"].forEach(type=>{ const k = type==="CT" ? "vct" : "v8", off = L.find(x=>x[k]!=null), nat = natureOfficielle(b, type), base = vNum(b[k]);
      if(off && base!=null && Math.abs(base-off[k])>1e-9*Math.max(1,off[k])) out.push({agent:nom, cas:casNorm(b.cas), t:"VLEP "+type+" : "+fmt(base)+" dans la base, "+fmt(off[k])+" mg/m³ dans le texte ("+off.texte+")"});
      /* valeur absente des textes : écart seulement si l'INRS ne la donne pas comme admise et si le texte ne l'exprime pas en ppm seulement */
      const inrs = vlepInrs(b.cas), admiseOk = inrs && vNum(inrs[k])!=null && Math.abs(vNum(inrs[k])-base)<=1e-9*Math.max(1,base), ppmSeul = L.some(x=>vNum(x.ligne[k+"ppm"])!=null);
      if(!off && base!=null && !admiseOk && !ppmSeul) out.push({agent:nom, cas:casNorm(b.cas), t:"VLEP "+type+" de la base ("+fmt(base)+") absente des textes réglementaires : VLEP admise, à traiter comme telle"});
      if(off && base==null) out.push({agent:nom, cas:casNorm(b.cas), t:"VLEP "+type+" réglementaire ("+fmt(off[k])+" mg/m³, "+off.texte+") absente de la base"}); });
    const nb = vtype(b), n8 = natureOfficielle(b,"8h");
    if(n8==="contraignante" && nb!=="contr") out.push({agent:nom, cas:casNorm(b.cas), t:"nature : « "+TYPE_LBL[nb]+" » dans la base, contraignante dans R. 4412-149"});
    if(n8==="indicative" && nb!=="indic" && nb!=="contr") out.push({agent:nom, cas:casNorm(b.cas), t:"nature : « "+TYPE_LBL[nb]+" » dans la base, indicative dans l’arrêté du 30 juin 2004"}); });
  return out;
}
function referentielHtml(){
  const ecarts = controleBase(), T = typeof TEXTES_VLEP!=="undefined" ? TEXTES_VLEP : [];
  return '<h2>Référentiel</h2><p class="legend" style="margin-top:0">Textes lus à la source par l’appli, avec la date de lecture. Les VLEP réglementaires ('+T.map(t=>t.lignes.length+" lignes "+t.nature+"s").join(", ")+') servent à classer chaque VLEP 8 h et CT.</p>'+
    '<ul style="margin:0 0 0 18px;padding:0">'+REFERENTIEL.map(r=>'<li style="margin-bottom:6px">'+(r.url ? '<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.titre)+'</a>' : esc(r.titre))+' <span class="legend">— '+esc(r.version)+(r.fichier ? ' · document fourni ('+esc(r.fichier)+')' : '')+' · lu le '+esc(r.luLe.split("-").reverse().join("/"))+'</span><ul style="margin:2px 0 0 16px;padding:0;font-size:12.5px">'+r.apport.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></li>').join("")+'</ul>'+
    (ecarts.length ? '<div class="warn"><b>Base d’agents : '+ecarts.length+' écart(s) avec les textes en vigueur</b> (à corriger dans la base, ou à garder en connaissance de cause)<ul style="margin:4px 0 0 18px;padding:0">'+ecarts.map(e=>'<li>'+esc(e.agent)+' ('+esc(e.cas)+') : '+esc(e.t)+'</li>').join("")+'</ul></div>' : '<div class="ok">Base d’agents conforme aux tableaux des textes en vigueur.</div>');
}
