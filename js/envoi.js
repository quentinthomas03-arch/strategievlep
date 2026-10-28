"use strict";
/* ================= Prêt à envoyer : contrôle final avant le Word ================= */
/* Reprend le contenu exigé d'une stratégie explicite (Cofrac LAB REF 27 § 7.7) et les règles de l'arrêté du 15/12/2009.
   Chaque point : {n:"ok"|"bloquant"|"verifier", t, p (onglet), s (source)}. « bloquant » : la stratégie serait incomplète ou
   contraire à l'arrêté ; « à vérifier » : elle reste envoyable mais un point mérite un regard. Rien n'empêche de générer. */
const SRC_77 = "Cofrac LAB REF 27 § 7.7";
/* alertes d'une ligne de plan qui rendent la stratégie non conforme (les autres sont à vérifier) */
const ALERTE_BLOQUANTE = /il en faut|jours de mesure nécessaires|débits incompatibles/;
function controleEnvoi(){
  const out = [], C = (n, t, p, s) => out.push({n, t, p, s}), gehs = S.ateliers.flatMap(a=>a.gehs).filter(g=>gehActive(g));
  const lignes = S.plan.filter(r=>r.kind!=="sec" && r.type), uids = new Set(lignes.flatMap(r=>r.ag||[])), ags = S.agents.filter(a=>uids.has(a.uid));
  const nomA = a => String(a.agent).split(" — ")[0], liste = l => l.slice(0,6).join(" ; ")+(l.length>6?"…":"");
  /* objet et périmètre */
  const ident = ["nom","adresse","cpville","activite"].filter(k=>!String(S.ent[k]||"").trim()).map(k=>ENT_LBL[k]);
  C(ident.length ? "bloquant" : "ok", ident.length ? "Entreprise : "+ident.join(", ")+" à renseigner" : "Entreprise identifiée (nom, adresse, activité)", "ent", SRC_77);
  const autres = ["siret","naf","affaire"].filter(k=>!String(S.ent[k]||"").trim()).map(k=>ENT_LBL[k]);
  if(autres.length) C("verifier", "Identification : "+autres.join(", ")+" à renseigner", "ent", "trame de stratégie");
  C(String(S.ent.dateMission||"").trim() ? "ok" : "verifier", String(S.ent.dateMission||"").trim() ? "Visite préalable datée" : "Date de la visite préalable absente (s’en passer doit être argumenté)", "ent", "Cofrac LAB REF 27 § 7.1.1");
  const pers = String(S.ent.contact||"").trim() && String(S.ent.contactFonction||"").trim();
  C(pers ? "ok" : "bloquant", pers ? "Personnes rencontrées et leur fonction" : "Personnes rencontrées : nom et fonction du contact sur site", "ent", SRC_77);
  const doc = S.ent.ercMode==="absent" || (String(S.ent.ercRef||"").trim() && String(S.ent.ercDate||"").trim());
  C(doc ? "ok" : "bloquant", doc ? "Documents fournis cités avec référence et version" : "Évaluation des risques fournie : référence et date à citer", "ent", SRC_77);
  /* GEH */
  if(!gehs.length) C("bloquant", "Aucun GEH défini", "geh", SRC_77);
  else {
    const sansEff = gehs.filter(g=>!(parseInt(g.eff)>0)).map(g=>g.des), sansOrga = gehs.filter(g=>!String(g.orga||"").trim()).map(g=>g.des), sansEp = gehs.filter(g=>!String(g.epc||"").trim() || !String(g.epi||"").trim()).map(g=>g.des);
    C(sansEff.length ? "bloquant" : "ok", sansEff.length ? "Nombre de travailleurs des GEH ("+sansEff.length+") : "+liste(sansEff) : gehs.length+" GEH avec leur nombre de travailleurs", "geh", SRC_77);
    C(sansOrga.length ? "bloquant" : "ok", sansOrga.length ? "Horaires et équipes (périmètre) des GEH ("+sansOrga.length+") : "+liste(sansOrga) : "Horaires et équipes de chaque GEH", "geh", SRC_77);
    const sansDF = gehs.filter(g=>(g.taches||[]).some(k=>(k.t||k.prod) && (!String(k.duree||"").trim() || !String(k.freq||"").trim()))).map(g=>g.des);
    if(sansDF.length) C("verifier", "Durée ou fréquence d’exposition de tâches manquante ("+sansDF.length+") : "+liste(sansDF), "geh", SRC.jours);
    C(sansEp.length ? "verifier" : "ok", sansEp.length ? "EPC et EPI (périodes de port) non décrits ("+sansEp.length+") : "+liste(sansEp)+" ; « / » si aucun" : "EPC et EPI décrits pour chaque GEH", "geh", SRC_77);
  }
  /* plan d'échantillonnage */
  if(!lignes.length){ C("bloquant", "Plan d’échantillonnage à générer", "plan", SRC_77); return out; }
  const sansVl = ags.filter(a=>!numOf(a.v8) && !numOf(a.vct)).map(nomA);
  C(sansVl.length ? "bloquant" : "ok", sansVl.length ? "Agents du plan sans VLEP 8 h ni CT : "+liste(sansVl) : ags.length+" agent(s) du plan avec leur VLEP", "agents", SRC_77);
  const hb = ags.filter(horsBase), hbR = hb.filter(a=>estCMR1(a) || !horsArrete(a)).map(nomA), hbA = hb.filter(a=>!(estCMR1(a) || !horsArrete(a))).map(nomA);
  if(hbR.length) C("bloquant", "Agents hors base sans méthode ni laboratoire (CMR ou VLEP réglementaire) : "+liste(hbR), "agents", SRC_77);
  if(hbA.length) C("verifier", "Agents hors base sans méthode ni laboratoire (hors arrêté) : "+liste(hbA), "agents", SRC_77);
  const sansMeth = ags.filter(a=>!String(a.methode||"").trim()).map(nomA);
  C(sansMeth.length ? "bloquant" : "ok", sansMeth.length ? "Méthode de prélèvement et d’analyse à renseigner : "+liste(sansMeth) : "Tableau des méthodes complet", "agents", SRC_77);
  const sansCompo = typeof exAll==="function" ? exAll().filter(x=>x.x.why==="sans-compo").length : 0;
  if(sansCompo) C("verifier", sansCompo+" produit(s) sans composition connue : FDS à obtenir pour savoir s’ils contiennent un agent à mesurer", "agents", SRC_77);
  const incomplet = lignes.filter(r=>!(parseFloat(r.nb)>0) || !String(r.plage||"").trim() || !String(r.jour||"").trim()).length;
  C(incomplet ? "bloquant" : "ok", incomplet ? incomplet+" ligne(s) du plan sans nombre de mesures, période ou jour" : lignes.length+" ligne(s) avec nombre de mesures, période et jour", "plan", SRC_77);
  const al = lignes.flatMap(r=>analyseLigne(r).alertes.map(a=>a.t)), alB = al.filter(t=>ALERTE_BLOQUANTE.test(t)), alV = al.filter(t=>!ALERTE_BLOQUANTE.test(t));
  C(alB.length ? "bloquant" : "ok", alB.length ? alB.length+" ligne(s) contraires à l’arrêté (nombre de mesures, jours, débits) : voir les alertes sous les lignes du plan" : "Nombre de mesures, jours et débits conformes à l’arrêté", "plan", SRC.nb8h);
  if(alV.length) C("verifier", alV.length+" point(s) à vérifier sous les lignes du plan (LQ au-dessus de 10 % de la VLEP, silice sans poussières alvéolaires…)", "plan", SRC.lq);
  const phases = lignes.filter(r=>r.type==="CT" && /^Sur phase exposante/.test(String(r.plage||""))).length;
  if(phases) C("verifier", phases+" ligne(s) CT dont la phase mesurée n’est pas précisée (« Sur phase exposante »)", "plan", SRC_77);
  const bl = blancsTerrain();
  if(bl.length) C("verifier", "Blancs de terrain à prévoir et à mentionner : au moins un par support et par campagne ("+bl.length+")", "plan", SRC.blancs);
  /* justifications */
  const tbc = (S.just||[]).filter(j=>j.on && ((j.txt||"").includes(TBC) || (j.list||[]).some(x=>String(x).includes(TBC)))).length;
  C(tbc ? "bloquant" : (S.just||[]).some(j=>j.on) ? "ok" : "bloquant", tbc ? tbc+" justification(s) contenant « "+TBC+" »" : (S.just||[]).some(j=>j.on) ? "Justifications rédigées" : "Aucune justification retenue", "just", SRC_77);
  const coh = controleJustifs();
  C(coh.length ? "bloquant" : "ok", coh.length ? coh.length+" justification(s) citant un agent absent du plan" : "Justifications cohérentes avec le plan", "just", "cohérence justifications / plan");
  return out;
}
const ENVOI_ICO = {ok:"✓", bloquant:"✕", verifier:"!"};
function envoiHtml(L){
  const nB = L.filter(x=>x.n==="bloquant").length, nV = L.filter(x=>x.n==="verifier").length;
  const tete = nB ? '<div class="warn"><b>Pas encore prêt : '+nB+' point(s) bloquant(s)</b>'+(nV?', '+nV+' à vérifier':'')+'.</div>'
    : '<div class="ok"><b>Prêt à envoyer</b>'+(nV?' ('+nV+' point(s) à vérifier)':'')+' : contenu exigé par le LAB REF 27 § 7.7 et règles de l’arrêté respectés.</div>';
  return tete+'<ul class="envoi">'+L.map(x=>'<li class="'+x.n+'"><span class="ico">'+ENVOI_ICO[x.n]+'</span><span>'+esc(x.t)+' <span class="src">('+esc(x.s)+')</span></span>'+(x.n!=="ok" && ONGLET_LBL[x.p] ? ' <button class="btn sm" data-goto="'+x.p+'">'+esc(ONGLET_LBL[x.p])+'</button>' : '')+'</li>').join("")+'</ul>';
}
function renderEnvoi(){ const W = $("#envoi"); if(W) W.innerHTML = '<h2>Prêt à envoyer ?</h2>'+envoiHtml(controleEnvoi()); }
/* « Générer le Word » : contrôle d'abord ; s'il reste des points bloquants, on les montre avec « Générer quand même » */
function wordAvecControle(){
  const L = controleEnvoi(); renderEnvoi();
  if(!L.some(x=>x.n==="bloquant")) return genererWord();
  const W = $("#envoi"); W.classList.remove("hide"); W.scrollIntoView({block:"start"});
  W.insertAdjacentHTML("beforeend", '<div class="row" style="margin-top:8px"><button class="btn" id="bWordForce">Générer quand même</button></div>');
  $("#bWordForce").onclick = ()=>{ $("#bWordForce").remove(); genererWord(); };
}
$("#bWord").onclick = wordAvecControle;
