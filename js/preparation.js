"use strict";
/* ================= Préparer la stratégie en un bouton ================= */
/* Après un import : les décisions sont proposées à cocher (au lieu de fenêtres de confirmation), les paramètres de terrain
   reprennent ceux de la mission précédente, puis un bouton applique tout, génère plan et justifications et ouvre le plan.
   Chaque « proposeur » renvoie des propositions {id, groupe, titre, detail, coche, type, ...données} ; elles sont calculées
   sur une copie (agents retenus déjà ajoutés) puis appliquées par identifiants sur la mission réelle. */
const CAP_DEFAUT = "vlep-cap-defaut";
const PROPOSEURS = [];

/* agents retenus : VLEP réglementaire (CMR compris), admises en option */
function ajouterAgentsRetenus(admises){
  const before = S.agents.length, f0 = $("#candF") ? $("#candF").value : "all";
  if($("#candF")) $("#candF").value = admises ? "regadm" : "reg";
  S.cand.forEach((c,i)=>{ if(candOK(c) && (c.refs.length || (!c.emis && (c.v8||c.vct||c.cmr)))) addCand(i); });
  if($("#candF")) $("#candF").value = f0;
  return S.agents.length-before;
}
const tousGeh = () => S.ateliers.flatMap(a=>a.gehs);
/* fusion des GEH homonymes (inventaires à une ligne par produit) */
PROPOSEURS.push(()=>gehHomonymes().map(l=>({id:"fus:"+l.map(g=>g.id).join(","), groupe:"GEH", type:"fusion", ids:l.map(g=>g.id), coche:true,
  titre:"Fusionner les "+l.length+" GEH « "+l[0].des+" »", detail:l.ateliers.length>1 ? "ateliers : "+l.ateliers.join(", ") : "même atelier"})));
/* GEH sans aucun agent retenu */
PROPOSEURS.push(()=>{ const G = tousGeh(), proc = new Set(agentsProcedes().flatMap(p=>p.gehs.map(g=>g.id)));   /* un procédé repéré lui donnera un agent */
  const sans = G.filter(g=>!agentsOfGeh(g).length && !(g.agents||[]).length && !proc.has(g.id));
  return sans.length && sans.length<G.length ? sans.map(g=>({id:"ecarter:"+g.id, groupe:"GEH", type:"ecarter", ids:[g.id], coche:true,
    titre:"Écarter le GEH « "+g.des+" »", detail:"aucun agent retenu ne lui est rattaché"})) : []; });

/* GEH d'un même atelier au profil d'exposition identique : regroupement possible, non coché (choix du technicien) */
PROPOSEURS.push(()=>gehARegrouper().map(r=>({id:"regr:"+r.gehs.map(g=>g.id).join(","), groupe:"GEH", type:"regrouper", ids:r.gehs.map(g=>g.id), coche:false,
  nom:r.gehs.map(g=>g.des).join(" / "), titre:"Regrouper « "+r.gehs.map(g=>g.des).join(" » et « ")+" »",
  detail:"même atelier, mêmes agents ("+r.agents.slice(0,4).join(", ")+(r.agents.length>4?"…":"")+") et même profil d’exposition ("+SRC_GEH+")"})));
/* GEH peut-être hétérogène : à vérifier, rien à cocher */
PROPOSEURS.push(()=>gehHeterogenes().map(h=>({id:"het:"+h.g.id, groupe:"À vérifier", type:"info", ids:[h.g.id], coche:false,
  titre:"GEH « "+h.g.des+" » peut-être hétérogène", detail:"« "+h.taches[0]+" » et « "+h.taches[1]+" » n’ont aucun agent commun et des durées très différentes : si ce sont des personnes différentes, scinder le GEH ("+SRC_GEH+")"})));
/* agents émis par les procédés repérés (soudage, bois, silice, usinage, diesel), absents de l'inventaire produits */
PROPOSEURS.push(()=>agentsProcedes().map(p=>({id:"proc:"+p.procede.id+":"+p.ref, groupe:"Agents émis par les procédés", type:"agent", ref:p.ref, gehs:p.gehs.map(g=>g.id), coche:p.coche,
  titre:"Ajouter « "+cleanName(BASE[p.ref].agent)+" » ("+p.procede.nom+")", detail:p.pourquoi+" — GEH : "+p.gehs.map(g=>g.des).join(", ")+" ("+p.procede.src+")"})));

function propositionsPreparation(admises){
  const copie = JSON.stringify(S); let out = [];
  try{ ajouterAgentsRetenus(admises); PROPOSEURS.forEach(f=>{ try{ out = out.concat(f()); }catch(e){ console.error(e); } }); }
  finally{ S = normalize(JSON.parse(copie)); }
  return out;
}
function appliquerProposition(p){
  const parId = id => tousGeh().find(g=>g.id===id);
  if(p.type==="fusion" || p.type==="regrouper"){ const l = p.ids.map(parId).filter(Boolean); if(l.length>1){ const m = fusionGeh(l); if(p.nom) m.des = p.nom; } }
  else if(p.type==="ecarter"){ const g = parId(p.ids[0]); if(g && !agentsOfGeh(g).length){ const ids = new Set([g.id]); dropGehRefs(ids); S.ateliers.forEach(a=>{ a.gehs = a.gehs.filter(x=>!ids.has(x.id)); }); cleanEmptyAteliers(); } }
  else if(p.type==="agent" && p.ref!=null){ let a = S.agents.find(x=>x.ref===p.ref); if(!a){ a = snapshot(BASE[p.ref]); S.agents.push(a); }
    (p.gehs||[]).forEach(id=>{ const g = parId(id); if(g && !(g.agents = g.agents||[]).includes(a.uid)) g.agents.push(a.uid); }); }
}
/* applique les propositions retenues puis génère plan et justifications (S.cap doit être renseigné) */
function appliquerPreparation(retenues, admises){
  const agents = ajouterAgentsRetenus(admises);
  /* ordre : agents ajoutés, regroupements et fusions, puis GEH à écarter (après fusion, un GEH peut avoir gagné des agents) */
  const ordre = {agent:0, fusion:1, regrouper:1, ecarter:2};
  retenues.slice().sort((a,b)=>(ordre[a.type]||0)-(ordre[b.type]||0)).forEach(appliquerProposition);
  const plan = genPlan({nb:3, ct:true, grp:true, mode:"cap"}); S.just = (S.just||[]).filter(i=>!i.auto || i.edited); const just = genJust();
  persist(); return {agents, decisions:retenues.length, plan, just};
}
/* préparation sans interface : propositions cochées par défaut (rejeu, tests) */
function preparerAuto(admises){ return appliquerPreparation(propositionsPreparation(admises).filter(p=>p.coche), admises); }
let PREP = null;
function ouvrirPreparation(motif){
  if(!S.ateliers.length && !S.cand.length){ show("ent"); return; }
  let defaut = {}; try{ defaut = JSON.parse(localStorage.getItem(CAP_DEFAUT)||"{}"); }catch(e){}
  const cap = Object.assign({}, defaut, S.cap||{}), adm = !!(PREP && PREP.adm);
  PREP = {adm, props: propositionsPreparation(adm), cap};
  show("ent"); renderPreparation(motif); window.scrollTo(0,0);   /* le panneau est en tête de l'étape 01 */
}
function renderPreparation(motif){
  const W = $("#prepPanel"); if(!W || !PREP) return;
  const c = PREP.cap, champ = (k, lbl) => '<label>'+lbl+' <input type="number" min="1" data-prepcap="'+k+'" value="'+esc(c[k]||"")+'" style="width:58px;padding:3px 6px"></label>';
  const grp = {}; PREP.props.forEach(p=>{ (grp[p.groupe] = grp[p.groupe]||[]).push(p); });
  W.classList.remove("hide");
  W.innerHTML = '<h2>⚡ Préparer la stratégie</h2>'+(motif ? '<div class="ok" style="margin-top:0">'+esc(motif)+'</div>' : '')+
    '<p class="legend" style="margin-top:0">Coche ce que tu acceptes, vérifie le terrain, puis génère : agents retenus, matrice, plan et justifications. Tout reste modifiable ensuite.</p>'+
    '<div class="row" style="flex-wrap:wrap;gap:10px;margin:0 0 8px"><b style="font-size:13px">Terrain :</b>'+champ("pumps","Pompes")+champ("techs","Techniciens")+champ("h8","8 h / jour / tech")+champ("ct","CT / jour / tech")+
      '<label style="font-size:13px"><input type="checkbox" id="prepAdm"'+(PREP.adm?' checked':'')+'> inclure les VLEP admises</label></div>'+
    (PREP.props.length ? Object.keys(grp).map(g=>'<div style="margin:6px 0"><b style="font-size:13px">'+esc(g)+' ('+grp[g].length+')</b>'+
      grp[g].map(p=>'<label class="prep-prop">'+(p.type==="info" ? '<span class="prep-info">!</span>' : '<input type="checkbox" data-prep="'+esc(p.id)+'"'+(p.coche?' checked':'')+'>')+' <span><b>'+esc(p.titre)+'</b> <span class="legend">— '+esc(p.detail)+'</span></span></label>').join("")+'</div>').join("")
      : '<div class="legend">Aucune décision à prendre : tout est prêt.</div>')+
    '<div class="row" style="margin-top:10px;gap:8px"><button class="btn pri" id="prepGo">Appliquer et générer le plan</button><button class="btn" id="prepX">Plus tard</button></div><div id="prepMsg" style="font-size:13px;margin-top:6px"></div>';
  $("#prepAdm").onchange = e=>{ PREP.adm = e.target.checked; PREP.props = propositionsPreparation(PREP.adm); renderPreparation(motif); };
  $("#prepX").onclick = ()=>{ W.classList.add("hide"); };
  $("#prepGo").onclick = ()=>{
    const cap = {}; $$("[data-prepcap]").forEach(i=>{ cap[i.dataset.prepcap] = parseInt(i.value)||""; });
    if(!["pumps","techs","h8","ct"].every(k=>cap[k]>0)){ $("#prepMsg").innerHTML = '<div class="warn">Renseigne les quatre paramètres de terrain : ils fixent le nombre de jours.</div>'; return; }
    S.cap = cap; try{ localStorage.setItem(CAP_DEFAUT, JSON.stringify(cap)); }catch(e){}
    const choix = new Set($$("[data-prep]").filter(i=>i.checked).map(i=>i.dataset.prep));
    const R = appliquerPreparation(PREP.props.filter(p=>choix.has(p.id)), PREP.adm);
    W.classList.add("hide"); PREP = null;
    show("plan"); $("#gpMsg").innerHTML = '<div class="ok"><b>Stratégie préparée :</b> '+R.agents+' agent(s) retenu(s), '+R.decisions+' décision(s) appliquée(s), '+R.plan.n+' ligne(s) de plan sur '+R.plan.days+' jour(s)'+gainJours(R.plan)+', '+R.just+' justification(s). Relis les alertes sous chaque ligne.</div>';
    const g = $("#gpMsg"); if(g) g.scrollIntoView({block:"center"});
  };
}
$("#bAuto").onclick = ()=>ouvrirPreparation();
