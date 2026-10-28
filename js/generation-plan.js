"use strict";
/* ================= Génération automatique du plan ================= */
const DRANK = s => { s = norm(s); if(/plus de 4/.test(s)) return 4; if(/entre 1 et 4/.test(s)) return 3; if(/entre 15 min et 1/.test(s)) return 2; if(/moins de 15/.test(s)) return 1; return 0; };
const PLG = ["","15min","Entre 15min et 1h","Entre 1 et 4h","Plus de 4h"];
function durRank(g, a){
  const names = [a.agent].concat(candOfAgent(a).map(c=>c.nom)).map(norm).filter(x=>x.length>3);
  let L = g.taches.filter(k=>{ const p = norm(k.prod); return names.some(n=>p.includes(n)); }); if(!L.length) L = g.taches;
  return L.reduce((m,k)=>Math.max(m,DRANK(k.duree)),0);
}
const M_OPT = [["","—"],["8h","8h"],["CT","CT"],["8h+CT","8h + CT"],["x1","✕ exposition faible"],["x2","✕ quantité négligeable"],["x3","✕ produit disparu"],["x4","✕ autre (à justifier)"],["x5","✕ risque faible (ERC, non CMR)"],["x6","✕ hors arrêté (VLEP admise ou sans VLEP)"]];
function matOpts(){ return {ct: $("#gpCT") ? $("#gpCT").checked : true, nb: Math.max(1, parseInt($("#gpNb") ? $("#gpNb").value : 3)||3)}; }
/* hors du champ de l'arrêté du 15/12/2009 : aucune VLEP réglementaire (8 h ni CT), CMR compris */
const horsArrete = a => !isRegl(a,"8h") && !isRegl(a,"CT");
/* g (GEH complet, facultatif) : hors arrêté -> non mesuré par défaut (ajout possible, mesure unique) ; risque faible ERC (non CMR) -> éliminé ;
   exposition continue -> 8 h ; tâche courte non répétée + VLCT -> CT seul (VLEP 8 h vérifiée par pondération) */
function defState(a,o,g){ if(horsArrete(a)) return "x6"; const p = g ? profilAgent(g,a) : null;
  if(p && !estCMR1(a) && p.risqueFaible) return "x5"; if(p && a.vct && !p.continu && p.courte) return "CT";
  if(a.v8 || !a.vct) return (o.ct && a.vct && ["contr","indic"].includes(vtype(a))) ? "8h+CT" : "8h"; return "CT"; }
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
  const effOf = id => { const g = S.ateliers.flatMap(a=>a.gehs).find(x=>x.id===id); return g ? g.eff : ""; };
  const P = planifier(rows, CAP(), effOf);
  rows.forEach((r,i)=>{ const ds = P.jours[i]; r.jour = [...new Set(ds)].sort((a,b)=>a-b).map(x=>"J"+x).join(" / "); r.par = {}; ds.forEach(x=>{ r.par[x] = (r.par[x]||0)+1; }); });
  S.plan = rows.map(r=>({id:uid(), kind:"row", jour:r.jour, ag:r.ag, agTxt:"", gehId:r.gehId, gehTxt:"", nb:r.nb, type:r.type, plage:r.plage, rep:{jour:r.jour, nb:r.nb, type:r.type, par:r.par}}));
  persist(); return {n:rows.length, nElim, days:P.days, daysGlouton:P.glouton, daysBorne:P.borne, orphans:S.agents.filter(a=>!noLab(a) && !linked.has(a.uid)).map(a=>a.agent)};
}
/* ---- planification des jours de terrain ----
   Contraintes (identiques pour les deux méthodes) : par jour, au plus h8 × techniciens prélèvements 8 h et ct × techniciens CT,
   et pas plus de pompes que disponibles (une pompe par 8 h, les CT d'un technicien se suivent sur une pompe) ;
   une ligne prend au plus « mesures8hParJour » prélèvements 8 h par jour (travailleurs différents) et ses CT le même jour si possible.
   1. placement au plus tôt, ligne par ligne (méthode historique) ;
   2. recherche du nombre de jours minimal : en partant de la borne basse, les lignes les plus contraintes d'abord,
      chaque bloc de la journée sur le jour le moins chargé où il tient. Le plan retenu est le plus court des deux. */
const gainJours = r => (r.daysGlouton>r.days ? " au lieu de "+r.daysGlouton : "")+(r.days && r.days===r.daysBorne ? ", le minimum possible avec ces moyens" : "");
function planifier(rows, C, effOf){
  const cap8 = C.h8*C.techs, capC = C.ct*C.techs;
  const tient = (u, h8, ct) => u.h8+h8<=cap8 && u.ct+ct<=capC && (u.h8+h8+Math.min(u.ct+ct, C.techs))<=C.pumps;
  const parJour = r => r.type==="8h" ? mesures8hParJour(effOf(r.gehId), r.nb) : mesuresCTParJour(r.nb);
  /* 1. au plus tôt */
  const glouton = () => { const day = [], jours = []; let max = 0;
    rows.forEach(r=>{ const ds = [], pj = parJour(r); let d = 1, n = 0;
      for(let i=0;i<Math.max(1,r.nb);i++){ while(!tient(day[d] || {h8:0, ct:0}, r.type==="8h"?1:0, r.type==="CT"?1:0)){ d++; n = 0; }
        day[d] = day[d] || {h8:0, ct:0}; if(r.type==="8h") day[d].h8++; else day[d].ct++; ds.push(d); max = Math.max(max,d); if(++n>=pj){ d++; n = 0; } }
      jours.push(ds); });
    return {jours, days:max}; };
  /* 2. en D jours au plus : blocs d'une journée (taille « par jour » de la ligne), lignes aux blocs les plus nombreux puis les plus gros d'abord */
  const essai = D => { const day = Array.from({length:D+1}, ()=>({h8:0, ct:0})), jours = rows.map(()=>[]);
    const ordre = rows.map((r,i)=>{ const n = Math.max(1,r.nb), pj = Math.min(parJour(r), n); return {i, r, pj, nbBlocs:Math.ceil(n/pj)}; })
      .sort((a,b)=>b.nbBlocs-a.nbBlocs || b.pj-a.pj || a.i-b.i);
    for(const o of ordre){ let reste = Math.max(1,o.r.nb); const pris = new Set();
      while(reste>0){ const t = Math.min(o.pj, reste), h = o.r.type==="8h" ? t : 0, c = o.r.type==="CT" ? t : 0; let best = 0;
        for(let d=1; d<=D; d++){ if(pris.has(d) || !tient(day[d], h, c)) continue; if(!best || day[d].h8+day[d].ct < day[best].h8+day[best].ct) best = d; }
        if(!best){ /* bloc trop gros pour une journée restante : un prélèvement à la fois */
          for(let d=1; d<=D && !best; d++) if(!pris.has(d) && tient(day[d], h?1:0, c?1:0)) best = d;
          if(!best) return null; day[best].h8 += h?1:0; day[best].ct += c?1:0; jours[o.i].push(best); pris.add(best); reste--; continue; }
        day[best].h8 += h; day[best].ct += c; for(let k=0;k<t;k++) jours[o.i].push(best); pris.add(best); reste -= t; } }
    return {jours, days:Math.max(0, ...jours.flat())}; };
  const G = glouton();
  const n8 = rows.filter(r=>r.type==="8h").reduce((s,r)=>s+Math.max(1,r.nb),0), nC = rows.filter(r=>r.type==="CT").reduce((s,r)=>s+Math.max(1,r.nb),0);
  const borne = Math.max(1, Math.ceil(n8/Math.min(cap8, C.pumps)), Math.ceil(nC/capC), ...rows.map(r=>Math.ceil(Math.max(1,r.nb)/Math.min(parJour(r), Math.max(1,r.nb)))));
  let lo = borne, hi = G.days-1, best = null;   /* recherche par dichotomie : les grosses missions comptent des centaines de lignes */
  while(lo<=hi){ const D = (lo+hi)>>1, E = essai(D); if(E){ best = E; hi = Math.min(D, E.days)-1; } else lo = D+1; }
  return Object.assign(best || G, {glouton:G.days, borne});
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
  $("#gpMsg").innerHTML = r.n ? '<div class="ok"><b>'+r.n+' ligne(s) proposée(s), '+r.days+' jour(s) de terrain'+gainJours(r)+'.</b> À relire : nombre de prélèvements, regroupements, plages horaires et jours.</div>' + (r.orphans.length ? '<div class="warn"><b>'+r.orphans.length+' agent(s) retenu(s) sans GEH dans la matrice</b>, donc absents du plan : '+esc(r.orphans.join(" ; "))+'</div>' : '') : '<div class="warn">Aucune ligne générée : coche des couples GEH × agent dans la matrice (ou saisis des polluants sur le terrain).</div>';
};

/* ================= Pilote automatique : voir js/preparation.js ================= */
