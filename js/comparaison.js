"use strict";
/* ================= Comparaison : stratégie en cours <-> Seirich / inventaire mis à jour ================= */
const wset = t => new Set(norm(t).split(" ").filter(w=>w.length>2));
const jac = (a,b)=>{ const A = wset(a), B = wset(b); if(!A.size||!B.size) return 0; let i = 0; A.forEach(w=>{ if(B.has(w)) i++; }); return i/(A.size+B.size-i); };
const prodSet = s => { const m = new Map(); String(s||"").split(/\n|[,;]/).map(x=>x.trim()).filter(Boolean).forEach(x=>{ const k = norm(x); if(k) m.set(k,x); }); return m; };
let CMP = null;
function matchBy(oldL, newL, key, thr){ const pairs = [], usedN = new Set(); oldL.forEach(o=>{ let best = null, bs = 0; newL.forEach((n,i)=>{ if(usedN.has(i)) return; const sc = norm(key(o))===norm(key(n)) ? 1 : jac(key(o),key(n)); if(sc>bs){ bs = sc; best = i; } }); if(best!=null && bs>=thr){ usedN.add(best); pairs.push([o,newL[best]]); } else pairs.push([o,null]); });
  return {pairs, added:newL.filter((n,i)=>!usedN.has(i))}; }
function grpTasks(L){ const m = new Map(); L.forEach(k=>{ const key = norm(k.t||k.prod); if(!m.has(key)) m.set(key,{id:uid(), t:k.t||"", duree:k.duree||"", freq:k.freq||"", prod:"", ag:[]}); const g = m.get(key), cur = prodSet(g.prod); prodSet(k.prod).forEach((v,kk)=>{ if(!cur.has(kk)) cur.set(kk,v); }); g.prod = [...cur.values()].join("\n"); (k.ag||[]).forEach(u=>{ if(!g.ag.includes(u)) g.ag.push(u); }); if(!g.duree) g.duree = k.duree||""; if(!g.freq) g.freq = k.freq||""; }); return [...m.values()]; }
const cut = (a,n)=> a.length>n ? a.slice(0,n).join(", ")+" … (+"+(a.length-n)+")" : a.join(", ");
function buildCmp(R){
  const oldG = S.ateliers.flatMap(a=>a.gehs.map(g=>({a,g}))), newG = R.ateliers.flatMap(a=>a.gehs.map(g=>({a,g})));
  const gm = matchBy(oldG, newG, o=>o.g.des, .5), rep = {gehNew:[], gehGone:[], gehChg:[], agNew:[], agGone:[], plan:[], R, pairs:gm.pairs};
  gm.added.forEach(n=>rep.gehNew.push(n));
  gm.pairs.forEach(([o,n])=>{
    if(!n){ rep.gehGone.push(o); return; }
    const ch = {o, n, lines:[], tNew:[], tGone:[]};
    if(norm(o.g.des)!==norm(n.g.des)) ch.lines.push("Désignation : « "+o.g.des+" » → « "+n.g.des+" »");
    if(String(o.g.eff||"").trim() && String(n.g.eff||"").trim() && norm(o.g.eff)!==norm(n.g.eff)) ch.lines.push("Effectif : "+o.g.eff+" → "+n.g.eff);
    const oT = grpTasks(o.g.taches), nT = grpTasks(n.g.taches); ch.nT = nT; const tm = matchBy(oT, nT, k=>k.t||k.prod, .5);
    tm.added.forEach(k=>ch.tNew.push(k));
    tm.pairs.forEach(([ok,nk])=>{ if(!nk){ if((ok.t||"").trim()) ch.tGone.push(ok); return; }
      const A = prodSet(ok.prod), B = prodSet(nk.prod), add = [...B.keys()].filter(k=>!A.has(k)).map(k=>B.get(k)), del = [...A.keys()].filter(k=>!B.has(k)).map(k=>A.get(k));
      if(add.length||del.length) ch.lines.push("Tâche « "+(ok.t||nk.t)+" » : "+(add.length?add.length+" produit(s)/agent(s) ajouté(s) : "+cut(add,6)+". ":"")+(del.length?del.length+" retiré(s) : "+cut(del,6)+".":""));
      if(ok.duree && nk.duree && norm(ok.duree)!==norm(nk.duree)) ch.lines.push("Tâche « "+(ok.t||nk.t)+" » : durée "+ok.duree+" → "+nk.duree);
      if(ok.freq && nk.freq && norm(ok.freq)!==norm(nk.freq)) ch.lines.push("Tâche « "+(ok.t||nk.t)+" » : fréquence "+ok.freq+" → "+nk.freq); });
    if(ch.lines.length||ch.tNew.length||ch.tGone.length) rep.gehChg.push(ch); });
  /* agents */
  const inS = c => S.agents.some(a=>(c.cas && a.cas===c.cas) || (!c.cas && norm(a.agent)===norm(c.nom)));
  const casNew = new Set(R.cand.map(c=>c.cas).filter(Boolean)), nmNew = new Set(R.cand.map(c=>norm(c.nom)));
  R.cand.forEach(c=>{ if(!inS(c) && (c.v8||c.vct||/1A|1B/.test(c.cmr||""))) rep.agNew.push(c); });
  S.agents.forEach(a=>{ if(!a.cas && !a.agent) return; const there = (a.cas && casNew.has(a.cas)) || nmNew.has(norm(a.agent)) || [...nmNew].some(n=>n.length>5 && (norm(a.agent).includes(n)||n.includes(norm(a.agent)))); if(!there) rep.agGone.push(a); });
  /* impact sur le plan */
  const goneIds = new Set(rep.gehGone.map(o=>o.g.id)), goneAg = new Set(rep.agGone.map(a=>a.uid));
  S.plan.forEach(r=>{ if(r.kind==="sec") return; const bad = []; if(r.gehId && goneIds.has(r.gehId)) bad.push("GEH disparu"); const ga = (r.ag||[]).filter(u=>goneAg.has(u)); if(ga.length) bad.push("agent(s) absent(s) du nouveau Seirich : "+ga.map(u=>agName(u)).join(", ")); if(bad.length) rep.plan.push("Ligne du plan « "+planAgents(r).join(", ")+" » ("+planGeh(r)+") : "+bad.join(" ; ")); });
  rep.plan.push(...rep.gehNew.map(n=>"Nouveau GEH « "+n.g.des+" » : aucune ligne de plan, à décider (mesure ou justification d'élimination)."));
  rep.plan.push(...rep.agNew.filter(c=>!/emis/.test(c.nom||"")).slice(0,0));
  rep.mv = planExcl(R);
  return rep;
}
function cmpHtml(rep){
  const li = (cls, t) => '<li class="'+cls+'">'+esc(t)+'</li>', sec = (title, items, cls) => items.length ? '<h3>'+esc(title)+' <span class="tag '+(cls||"no")+'">'+items.length+'</span></h3><ul class="cmp">'+items.join("")+'</ul>' : '';
  const nT = rep.gehChg.reduce((n,c)=>n+c.tNew.length,0);
  let h = '<div class="card imp" style="margin-top:12px"><h2>Écarts avec le Seirich / inventaire mis à jour</h2>';
  const total = rep.gehNew.length+rep.gehGone.length+rep.gehChg.length+rep.agNew.length+rep.agGone.length;
  if(!total) h += '<div class="ok">Aucun écart détecté : GEH, tâches, produits et agents sont identiques.</div>';
  h += sec("Nouveaux GEH", rep.gehNew.map(n=>li("add","GEH « "+n.g.des+" » ("+(n.a.nom||"?")+") : "+n.g.taches.length+" ligne(s) de tâche")));
  h += sec("GEH absents de la nouvelle version (à vérifier)", rep.gehGone.map(o=>li("del","GEH « "+o.g.des+" » ("+(o.a.nom||"?")+")")));
  h += sec("GEH modifiés", rep.gehChg.map(c=>'<li class="chg"><b>'+esc(c.o.g.des)+'</b><ul>'+c.lines.map(l=>'<li>'+esc(l)+'</li>').join("")+c.tNew.map(k=>'<li class="add">Nouvelle tâche « '+esc(k.t||"")+' »'+(k.prod?' — '+esc(String(k.prod).replace(/\n/g,", ")):'')+'</li>').join("")+c.tGone.map(k=>'<li class="del">Tâche absente : « '+esc(k.t||"")+' »</li>').join("")+'</ul></li>'));
  h += sec("Substances à VLEP / CMR du nouveau Seirich non retenues dans la stratégie", rep.agNew.map(c=>li("add",(c.nom||"")+(c.cas?" ("+c.cas+")":"")+" — "+[c.v8?"VLEP 8h "+c.v8:"",c.vct?"CT "+c.vct:"",c.cmr||""].filter(Boolean).join(", ")+(c.gehs&&c.gehs.length?" — GEH : "+c.gehs.slice(0,4).join(", "):""))));
  h += sec("Agents de la stratégie absents du nouveau Seirich (produit retiré ?)", rep.agGone.map(a=>li("del",a.agent+(a.cas?" ("+a.cas+")":""))));
  h += sec("À mettre à jour dans la stratégie (plan, justifications)", rep.plan.map(t=>li("chg",t)));
  if(rep.mv && rep.mv.length){ const by = {}; rep.mv.forEach(o=>{ by[o.ex.why] = (by[o.ex.why]||0)+1; });
    h += '<h3>Lignes terminées ou sans exposition dans le projet en cours <span class="tag no">'+rep.mv.length+'</span></h3><div class="legend">À la date du '+fmtD(rep.R.dM)+' : '+Object.keys(by).map(k=>by[k]+" "+EXWHY[k]).join(" · ")+'.</div><div class="row"><button class="btn pri" id="cmpExcl">Retirer ces lignes du projet</button></div>'; }
  h += '<div class="row" style="margin-top:12px"><button class="btn pri" id="cmpApply">Appliquer les ajouts au projet</button><button class="btn" id="cmpCopy">📋 Copier le compte rendu</button><button class="btn" id="cmpClose">Fermer</button><span id="cmpMsg" class="legend" style="margin:0"></span></div><div class="legend">« Appliquer » ajoute les nouveaux GEH, les nouvelles tâches et met à jour les produits des tâches existantes, et remplace la liste des substances détectées. Rien n\'est supprimé : les GEH, tâches ou agents disparus restent à ta main.</div></div>';
  return h;
}
function cmpText(rep){
  const L = ["Mise à jour de la stratégie : écarts avec le Seirich / inventaire récent"], blk = (t,a)=>{ if(a.length){ L.push("","# "+t); a.forEach(x=>L.push("- "+x)); } };
  blk("Nouveaux GEH", rep.gehNew.map(n=>n.g.des+" ("+(n.a.nom||"?")+")")); blk("GEH absents", rep.gehGone.map(o=>o.g.des));
  blk("GEH modifiés", rep.gehChg.flatMap(c=>[c.o.g.des+" :"].concat(c.lines.map(l=>"  "+l), c.tNew.map(k=>"  Nouvelle tâche : "+(k.t||"")), c.tGone.map(k=>"  Tâche absente : "+(k.t||"")))));
  blk("Nouvelles substances VLEP/CMR non retenues", rep.agNew.map(c=>c.nom+(c.cas?" ("+c.cas+")":""))); blk("Agents absents du nouveau Seirich", rep.agGone.map(a=>a.agent)); blk("À mettre à jour (plan, justifications)", rep.plan);
  return L.join("\n");
}
reg("fCmp", async e=>{
  const f = e.target.files[0]; if(!f) return; const w = $("#cmpWrap");
  try{
    if(!S.ateliers.length) throw new Error("Charge d'abord la stratégie existante (Word) ou un projet : il n'y a rien à comparer.");
    w.innerHTML = '<div class="legend">Lecture…</div>'; const SH = await readXlsx(await f.arrayBuffer()); const R = (SH["Tâches"] && SH["Zones"]) ? parseSeirich(SH, missionDate()) : parseInventaire(SH);
    CMP = buildCmp(R); w.innerHTML = cmpHtml(CMP);
  }catch(err){ w.innerHTML = '<div class="warn">Comparaison impossible : '+esc(err.message)+'</div>'; }
  e.target.value = "";
});
$("#cmpWrap").addEventListener("click", e=>{
  const id = e.target.id; if(!id || !CMP) return; const m = $("#cmpMsg");
  if(id==="cmpClose"){ CMP = null; $("#cmpWrap").innerHTML = ""; }
  else if(id==="cmpCopy"){ (navigator.clipboard?navigator.clipboard.writeText(cmpText(CMP)):Promise.reject()).then(()=>{ m.textContent = "✔ Compte rendu copié"; }, ()=>{ m.textContent = "Copie bloquée par le navigateur."; }); }
  else if(id==="cmpExcl"){ const u = applyExcl(CMP.R); persist(); renderGeh(); renderSel(); try{ renderCand(); }catch(_){} CMP.mv = []; m.textContent = "✔ "+u.rows+" ligne(s) retirée(s)"+(u.arch.length?", "+u.arch.length+" GEH écarté(s)":"")+(u.planRows?" — "+u.planRows+" ligne(s) du plan à revoir":"")+". Réintégration possible : onglet 4, « Éléments exclus »."; }
  else if(id==="cmpApply"){
    let nG = 0, nT = 0, nP = 0;
    CMP.gehNew.forEach(n=>{ let at = S.ateliers.find(a=>norm(a.nom)===norm(n.a.nom)); if(!at){ at = {id:uid(), nom:n.a.nom, gehs:[]}; S.ateliers.push(at); } at.gehs.push(n.g); nG++; });
    CMP.gehChg.forEach(c=>{ c.tNew.forEach(k=>{ c.o.g.taches.push(k); nT++; });
      const nt = c.nT; c.o.g.taches.forEach(ok=>{ const nk = nt.find(k=>norm(k.t)===norm(ok.t)) || nt.find(k=>jac(k.t,ok.t)>=.5); if(nk && String(nk.prod||"").trim() && norm(nk.prod)!==norm(ok.prod)){ ok.prod = nk.prod; nP++; } }); });
    S.cand = CMP.R.cand; persist(); renderGeh(); renderSel && renderSel();
    m.textContent = "✔ "+nG+" GEH ajouté(s), "+nT+" tâche(s) ajoutée(s), "+nP+" liste(s) de produits mises à jour. Relis l'onglet 3 (agents) et le plan.";
  }
});
