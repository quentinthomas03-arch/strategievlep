"use strict";
/* ================= Génération automatique du plan ================= */
const DRANK = s => { s = norm(s); if(/plus de 4/.test(s)) return 4; if(/entre 1 et 4/.test(s)) return 3; if(/entre 15 min et 1/.test(s)) return 2; if(/moins de 15/.test(s)) return 1; return 0; };
const PLG = ["","15min","Entre 15min et 1h","Entre 1 et 4h","Plus de 4h"];
function durRank(g, a){
  const names = [a.agent].concat(candOfAgent(a).map(c=>c.nom)).map(norm).filter(x=>x.length>3);
  let L = g.taches.filter(k=>{ const p = norm(k.prod); return names.some(n=>p.includes(n)); }); if(!L.length) L = g.taches;
  return L.reduce((m,k)=>Math.max(m,DRANK(k.duree)),0);
}
const M_OPT = [["","—"],["8h","8h"],["CT","CT"],["8h+CT","8h + CT"],["x1","✕ exposition faible"],["x2","✕ quantité négligeable"],["x3","✕ produit disparu"],["x4","✕ autre (à justifier)"],["x5","✕ risque faible (ERC, non CMR)"]];
function matOpts(){ return {ct: $("#gpCT") ? $("#gpCT").checked : true, nb: Math.max(1, parseInt($("#gpNb") ? $("#gpNb").value : 3)||3)}; }
/* g (GEH complet, facultatif) : tâche courte non répétée + VLCT -> CT seul (VLEP 8 h vérifiée par pondération) */
function defState(a,o,g){ if(g && !estCMR1(a) && profilAgent(g,a).risqueFaible) return "x5"; if(g && a.vct && profilAgent(g,a).courte) return "CT"; if(a.v8 || !a.vct) return (o.ct && a.vct && ["contr","indic"].includes(vtype(a))) ? "8h+CT" : "8h"; return "CT"; }
function matCell(g,a,o,link){ const k = g.id+"|"+a.uid; if(S.mat[k]!=null) return S.mat[k]; return link[g.id] && link[g.id].has(a.uid) ? defState(a,o,S.ateliers.flatMap(x=>x.gehs).find(x=>x.id===g.id)) : ""; }
function linkMap(){ const link = {}; S.ateliers.forEach(at=>at.gehs.forEach(g=>{ link[g.id] = new Set(agentsOfGeh(g)); })); return link; }
/* nature de la VLEP pour le type de mesure (8h / CT) : réglementaire (contraignante ou indicative) => triplé ; admise, CMR sans VLEP => 1 mesure */
function isRegl(a, type){
  /* nature lue dans les textes en vigueur (R. 4412-149, arrêté du 30 juin 2004) quand le CAS y figure */
  const off = natureOfficielle(a, type); if(off) return off!=="aucune";
  const c = (S.cand||[]).find(x=>(x.cas && a.cas && x.cas===a.cas) || norm(x.nom)===norm(a.agent));
  const nat = c ? (type==="CT" ? c.natct : c.nat8) : "";
  if(nat) return /contraignante|indicative/.test(norm(nat));
  return vtype(a)==="contr" || vtype(a)==="indic";
}
const CAPK = ["pumps","techs","h8","ct"];
const capSet = () => CAPK.every(k=>parseInt((S.cap||{})[k])>0);
const CAP = () => { const c = {}; CAPK.forEach(k=>{ c[k] = Math.max(1, parseInt((S.cap||{})[k])||1); }); return c; };
const CAP_MSG = "Renseigne d’abord les paramètres de terrain de cette intervention : pompes disponibles, techniciens, nombre de 8 h et de CT par jour et par technicien.";
function genPlan(o){
  const rows = [], linked = new Set(), link = linkMap(); let nElim = 0;
  S.ateliers.forEach(at=>at.gehs.forEach(g=>{
    const nbG = parseInt(S.matNb[g.id]) || 0, nbOf = (a,type) => nbG || (profilAgent(g,a).exhaustif || !isRegl(a,type) ? 1 : o.nb), cells = S.agents.filter(a=>!noLab(a)).map(a=>({a, s:matCell(g,a,o,link)})).filter(c=>c.s);
    cells.forEach(c=>{ if(/^x/.test(c.s)) nElim++; else linked.add(c.a.uid); });
    const MT = mergedTasks(g, true), tasksOf = a => new Set(MT.filter(k=>k.ags.some(x=>norm(x)===norm(acdName(a.agent))||norm(x)===norm(a.agent))).map(k=>norm(k.t)));
    ["8h","CT"].forEach(type=>{
      const L = cells.filter(c=>c.s.split("+").includes(type)).map(c=>c.a); if(!L.length) return; const groups = {};
      L.forEach(a=>{ const k = o.grp && a.support ? norm(a.support)+"|"+norm(a.principe||"") : a.uid; (groups[k] = groups[k]||[]).push(a); });
      /* une pompe = agents de même support, même prétraitement, mesurés en même temps ; en CT (phase précise), même tâche en plus */
      const packs = []; Object.values(groups).forEach(G=>{
        if(type!=="CT" || G.length<2){ packs.push(G); return; }
        const comps = []; G.forEach(a=>{ const ts = tasksOf(a); const hit = comps.filter(c=>!ts.size || !c.ts.size || [...ts].some(t=>c.ts.has(t)));
          if(!hit.length){ comps.push({ags:[a], ts:new Set(ts)}); return; }
          const m = hit[0]; m.ags.push(a); ts.forEach(t=>m.ts.add(t)); hit.slice(1).forEach(h=>{ m.ags.push(...h.ags); h.ts.forEach(t=>m.ts.add(t)); comps.splice(comps.indexOf(h),1); }); });
        comps.forEach(c=>packs.push(c.ags)); });
      /* même pompe seulement si les plages de débit des méthodes se recouvrent */
      const pumps = []; packs.forEach(G=>{ const subs = []; G.forEach(a=>{ const s = subs.find(x=>{ const p = plageDebits(x.concat(a), type); return !p || !p.vide; }); if(s) s.push(a); else subs.push([a]); }); pumps.push(...subs); });
      pumps.forEach(G=>{ const rk = Math.max(...G.map(a=>durRank(g,a))), nb = Math.max(...G.map(a=>nbOf(a,type)));
        rows.push({gehId:g.id, ag:G.map(a=>a.uid), type, nb, plage: type==="CT" ? (plageAuto(g,G,"CT") || "Sur phase exposante")+(nb>=NB_CAMPAGNE ? " – "+CT_MENTION : "") : (plageAuto(g,G,"8h") || (rk ? PLG[rk] : "En journée"))}); });
    });
  }));
  /* planification : chaque prélèvement est placé au plus tôt, dans la limite des pompes et de la capacité des techniciens ;
     une même ligne prend au plus « mesures8hParJour » prélèvements 8 h par jour (travailleurs différents) ; ses CT, le même jour si la capacité le permet */
  const C = CAP(), cap8 = C.h8*C.techs, capC = C.ct*C.techs, day = []; let maxDay = 0;
  const fits = (d,t) => { const u = day[d] || {h8:0, ct:0}, h8 = u.h8+(t==="8h"?1:0), ct = u.ct+(t==="CT"?1:0); return h8<=cap8 && ct<=capC && (h8+Math.min(ct,C.techs))<=C.pumps; };
  const effOf = id => { const g = S.ateliers.flatMap(a=>a.gehs).find(x=>x.id===id); return g ? g.eff : ""; };
  rows.forEach(r=>{ const ds = [], perDay = r.type==="8h" ? mesures8hParJour(effOf(r.gehId), r.nb) : mesuresCTParJour(r.nb); let d = 1, n = 0;
    for(let i=0;i<Math.max(1,r.nb);i++){ while(!fits(d, r.type)){ d++; n = 0; } day[d] = day[d] || {h8:0, ct:0}; if(r.type==="8h") day[d].h8++; else day[d].ct++; ds.push(d); maxDay = Math.max(maxDay,d); if(++n>=perDay){ d++; n = 0; } }
    r.jour = [...new Set(ds)].map(x=>"J"+x).join(" / "); r.par = {}; ds.forEach(x=>{ r.par[x] = (r.par[x]||0)+1; }); });
  S.plan = rows.map(r=>({id:uid(), kind:"row", jour:r.jour, ag:r.ag, agTxt:"", gehId:r.gehId, gehTxt:"", nb:r.nb, type:r.type, plage:r.plage, rep:{jour:r.jour, nb:r.nb, type:r.type, par:r.par}}));
  persist(); return {n:rows.length, nElim, days:maxDay, orphans:S.agents.filter(a=>!noLab(a) && !linked.has(a.uid)).map(a=>a.agent)};
}
/* ---- matrice GEH x agents ---- */
function renderMat(){
  const gl = gehList(), ags = sortedIdx().map(k=>S.agents[k]).filter(a=>!noLab(a)), W = $("#matWrap");
  if(!gl.length || !ags.length){ W.innerHTML = '<div class="empty">La matrice apparaît dès qu\'il y a au moins un GEH et un agent retenu.</div>'; return; }
  const o = matOpts(), link = linkMap(); let nA = 0, nE = 0;
  const bulk = (kind,id) => '<select class="mb" data-mbulk="'+kind+'" data-id="'+id+'" title="Appliquer à toute la '+(kind==="r"?"ligne":"colonne")+'"><option value="">⋮</option>'+M_OPT.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("")+'<option value="__def">Auto</option></select>';
  const head = '<tr><th class="l">Agent \\ GEH</th>'+gl.map(g=>'<th title="'+esc(g.label)+'"><div class="mh">'+g.n+' – '+esc(g.des)+'</div>'+bulk("c",g.id)+'<input class="mn" type="number" min="1" data-mnb="'+g.id+'" value="'+esc(S.matNb[g.id]||"")+'" placeholder="'+o.nb+'" title="Nombre de prélèvements pour ce GEH"></th>').join("")+'</tr>';
  const body = ags.map(a=>{ const t = vtype(a);
    return '<tr><td class="l" style="'+(t==="contr"?'font-weight:700':(t==="indic"?'font-weight:700;color:#0000FF':''))+'">'+esc(a.agent)+bulk("r",a.uid)+'</td>'+gl.map(g=>{ const st = matCell({id:g.id},a,o,link); if(st) { if(/^x/.test(st)) nE++; else nA++; }
      return '<td class="mc s-'+(st||"n")+'"><select data-mk="'+g.id+'|'+a.uid+'">'+M_OPT.map(x=>'<option value="'+x[0]+'"'+(st===x[0]?' selected':'')+'>'+x[1]+'</option>').join("")+'</select></td>'; }).join("")+'</tr>'; }).join("");
  W.innerHTML = '<div class="legend" style="margin:0 0 6px">'+nA+' couple(s) GEH × agent à mesurer · '+nE+' éliminé(s) (justification générée). Le menu ⋮ applique un choix à toute une ligne ou colonne ; le nombre sous chaque GEH remplace le nombre par défaut.</div><div style="overflow:auto;max-height:560px"><table class="t mat"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>';
}
$("#matWrap").addEventListener("change", e=>{
  const t = e.target, o = matOpts();
  if(t.dataset.mk){ S.mat[t.dataset.mk] = t.value; persist(); renderMat(); return; }
  if(t.dataset.mbulk){ const kind = t.dataset.mbulk, id = t.dataset.id, v = t.value; if(v==="") return;
    const link = linkMap();
    S.ateliers.forEach(at=>at.gehs.forEach(g=>S.agents.forEach(a=>{ if((kind==="c" && g.id===id) || (kind==="r" && a.uid===id)){ const k = g.id+"|"+a.uid; if(v==="__def") delete S.mat[k]; else S.mat[k] = v; } })));
    persist(); renderMat(); return; }
  if(t.dataset.mnb){ if(t.value==="") delete S.matNb[t.dataset.mnb]; else S.matNb[t.dataset.mnb] = t.value; persist(); }
});
$("#bMatReset").onclick = ()=>{ if(!confirm("Réinitialiser la matrice (retour aux choix automatiques) ?")) return; S.mat = {}; S.matNb = {}; persist(); renderMat(); };
$("#gpCT").addEventListener("change", renderMat); $("#gpNb").addEventListener("change", renderMat);
$("#bGenPlan").onclick = ()=>{
  if(!S.ateliers.length) return alert("Crée d'abord les GEH (onglets 2 ou 4).");
  if(!capSet()){ alert(CAP_MSG); const f = $("#capP"); if(f) f.focus(); return; }
  if(S.plan.length && !confirm("Remplacer le plan actuel ("+S.plan.length+" lignes) par une proposition générée ?")) return;
  const r = genPlan({nb:Math.max(1,parseInt($("#gpNb").value)||3), ct:$("#gpCT").checked, grp:$("#gpGrp").checked, mode:"cap"});
  renderPlan(); if(S.just && S.just.some(i=>i.auto)) genJust();
  $("#gpMsg").innerHTML = r.n ? '<div class="ok"><b>'+r.n+' ligne(s) proposée(s), '+r.days+' jour(s) de terrain.</b> À relire : nombre de prélèvements, regroupements, plages horaires et jours.</div>' + (r.orphans.length ? '<div class="warn"><b>'+r.orphans.length+' agent(s) retenu(s) sans GEH dans la matrice</b>, donc absents du plan : '+esc(r.orphans.join(" ; "))+'</div>' : '') : '<div class="warn">Aucune ligne générée : coche des couples GEH × agent dans la matrice (ou saisis des polluants sur le terrain).</div>';
};

/* ================= Pilote automatique ================= */
$("#bAuto").onclick = ()=>{
  if(!S.ateliers.length) return alert("Importe d'abord un inventaire (Seirich ou autre) ou crée des GEH.");
  if(!capSet()){ alert(CAP_MSG); const f = document.querySelector("#p-geh [data-cap]"); if(f) f.focus(); return; }
  /* 1. agents */
  const before = S.agents.length; const f0 = $("#candF").value; $("#candF").value = $("#autoAdm") && $("#autoAdm").checked ? "regadm" : "reg";
  S.cand.forEach((c,i)=>{ if(candOK(c) && (c.refs.length || (!c.emis && (c.v8||c.vct||c.cmr)))) addCand(i); }); $("#candF").value = f0;
  /* 1 bis. GEH homonymes (inventaire à une ligne par produit) */
  let msgFus = ""; const hom = gehHomonymes();
  if(hom.length && confirm("Fusionner les GEH qui portent le même nom ?\n\n"+hom.map(l=>"• "+l[0].des+" ("+l.length+" GEH"+(l.ateliers.length>1 ? ", ateliers : "+l.ateliers.join(", ") : "")+")").join("\n")+"\n\n(OK = fusionner, Annuler = les garder séparés)")){
    hom.forEach(fusionGeh); msgFus = hom.reduce((n,l)=>n+l.length-1,0)+" GEH fusionné(s). "; }
  /* 2. GEH sans agent */
  const dropped = []; S.ateliers.forEach(a=>a.gehs.forEach(g=>{ if(!agentsOfGeh(g).length && !(g.agents||[]).length) dropped.push(g); }));
  const total = S.ateliers.reduce((n,a)=>n+a.gehs.length,0);
  let msgDrop = "";
  if(dropped.length && dropped.length<total){
    if(confirm("Écarter "+dropped.length+" GEH sans agent retenu ?\n\n"+dropped.map(g=>"• "+g.des).join("\n")+"\n\n(OK = les supprimer, Annuler = les garder)")){
      const ids = new Set(dropped.map(g=>g.id)); dropGehRefs(ids); S.ateliers.forEach(a=>{ a.gehs = a.gehs.filter(g=>!ids.has(g.id)); }); cleanEmptyAteliers(); msgDrop = dropped.length+" GEH écarté(s). ";
    }
  }
  /* 3. plan + justifications */
  const r = genPlan({nb:3, ct:true, grp:true, mode:"cap"}); S.just = (S.just||[]).filter(i=>!i.auto || i.edited); const nj = genJust();
  persist(); renderGeh(); renderSel(); renderList(); renderCand();
  $("#autoMsg").innerHTML = '<b>'+(S.agents.length-before)+' agent(s) ajouté(s), '+msgFus+msgDrop+r.n+' ligne(s) de plan, '+nj+' justification(s) proposée(s).</b> Relis l\'onglet 5 (matrice et plan), puis l\'onglet 6.';
};
