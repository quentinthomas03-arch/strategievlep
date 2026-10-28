"use strict";
/* ================= GEH & tâches ================= */
/* actif : une tâche cite un agent retenu, ou un agent retenu est rattaché au GEH par l’import (procédés émissifs : « …et leurs poussières ») */
const gehActive = g => mergedTasks(g).some(k=>k.ags.length) || ((g.taches||[]).length>0 && agentsOfGeh(g).length>0);
function gehList(){ let n=0; const out=[]; S.ateliers.forEach(a=>a.gehs.forEach(g=>{ if(!gehActive(g)) return; n++; out.push({id:g.id,n,des:g.des||"",eff:g.eff||"",atelier:a.nom||"",label:n+" - "+(g.des||"(sans nom)")}); })); return out; }
const gehLabel = id => { const g = gehList().find(x=>x.id===id); return g ? g.label : ""; };
function renderGeh(){
  let n = 0;
  const h = S.ateliers.map((a,ai)=>{
    const gs = a.gehs.map((g,gi)=>{ n++; const k = ai+'.'+gi;
      const sub = g.open ? '<div class="sub"><div class="g3"><label class="f">Environnement / EPC<input data-k2="'+k+'" data-f="epc" value="'+esc(g.epc)+'" placeholder="ex : ventilation générale, captage localisé"></label><label class="f">EPI<input data-k2="'+k+'" data-f="epi" value="'+esc(g.epi)+'" placeholder="ex : gants nitrile, demi-masque FFP2"></label><label class="f">Commentaire<input data-k2="'+k+'" data-f="com" value="'+esc(g.com)+'"></label></div>'+
        '<label class="row" style="margin:0 0 6px;gap:6px;font-size:13px"><input type="checkbox" data-erc="'+k+'"'+(g.ercFaible?' checked':'')+'> Risque faible pour ce GEH dans l’ERC (après expertise) : agents non CMR éliminés avec leur justification, CMR 1A/1B toujours mesurés</label>'+
        (g.detail ? '<table class="t"><thead><tr><th>Tâche élémentaire</th><th style="width:170px">Durée d\'exposition</th><th style="width:120px">Fréquence</th><th>Produits utilisés / agents chimiques</th><th style="width:130px">Quantité (Seirich)</th><th></th></tr></thead><tbody>'+
        g.taches.map((t,ti)=>'<tr><td class="l"><input data-k2="'+k+'" data-ti="'+ti+'" data-f="t" value="'+esc(t.t)+'"></td><td><input data-k2="'+k+'" data-ti="'+ti+'" data-f="duree" list="dl-duree" value="'+esc(t.duree)+'"></td><td><input data-k2="'+k+'" data-ti="'+ti+'" data-f="freq" list="dl-freq" value="'+esc(t.freq)+'"></td><td class="l"><textarea data-k2="'+k+'" data-ti="'+ti+'" data-f="prod">'+esc(t.prod)+'</textarea></td><td class="l" style="font-size:12px;color:var(--mut)">'+esc([t.qj,t.qa].filter(Boolean).join(" · "))+'</td><td class="act"><button class="btn sm" data-tdup="'+k+'.'+ti+'" title="Dupliquer">⧉</button> <button class="btn sm" data-tdel="'+k+'.'+ti+'" title="Supprimer">×</button></td></tr>').join("")+
        '</tbody></table>' : groupedTable(g))+'<div class="row"><button class="btn sm" data-gdet="'+k+'">'+(g.detail?'Vue regroupée':'Modifier les lignes ('+g.taches.length+')')+'</button> <button class="btn sm" data-tadd="'+k+'">+ Tâche</button></div></div>' : '';
      return '<div class="geh"><div class="hd"><div class="num"><input type="checkbox" data-gsel="'+g.id+'"'+(selG.has(g.id)?' checked':'')+'>'+n+'</div><input data-k2="'+k+'" data-f="des" value="'+esc(g.des)+'" placeholder="Désignation du GEH"><input data-k2="'+k+'" data-f="eff" value="'+esc(g.eff)+'" placeholder="Effectif"><input data-k2="'+k+'" data-f="orga" value="'+esc(g.orga)+'" placeholder="Organisation (ex : 2 x 8h)">'+(g.ercFaible ? '<span class="tag" title="Risque faible dans l’ERC : agents non CMR éliminés">ERC : risque faible</span>' : '')+'<div class="act"><button class="btn sm" data-gtog="'+k+'">'+(g.open?'▾':'▸')+' Tâches ('+g.taches.length+')'+((g.exclus||[]).length?' · '+g.exclus.length+' exclue(s)':'')+'</button> <button class="btn sm" data-gup="'+k+'" title="Monter">↑</button> <button class="btn sm" data-gdn="'+k+'" title="Descendre">↓</button> <button class="btn sm" data-gdel="'+k+'" title="Supprimer">×</button></div></div>'+agl(g)+sub+'</div>'; }).join("");
    return '<div class="at"><div class="row" style="margin:0 0 4px"><b>Atelier '+(ai+1)+' :</b><input class="s" data-ai="'+ai+'" data-f="nom" value="'+esc(a.nom)+'" placeholder="Nom de l\'atelier"><button class="btn sm" data-gadd="'+ai+'">+ GEH</button><button class="btn sm" data-adel="'+ai+'">Supprimer l\'atelier</button></div>'+gs+'</div>';
  }).join("");
  $("#gehWrap").innerHTML = h || '<div class="empty">Aucun atelier. Importe un inventaire, utilise l\'ajout rapide ou l\'onglet Terrain.</div>'; updSel(); renderExcl();
}
$("#bAtelier").onclick = ()=>{ S.ateliers.push({id:uid(), nom:"", gehs:[{id:uid(),des:"",eff:"",orga:"",epc:"",epi:"",com:"",taches:[]}]}); persist(); renderGeh(); };
const gPos = k => k.split(".").map(Number);
$("#gehWrap").addEventListener("input", e=>{
  const t = e.target;
  if(t.dataset.ai!=null && t.dataset.f==="nom"){ S.ateliers[+t.dataset.ai].nom = t.value; persist(); return; }
  if(t.dataset.k2==null) return; const [ai,gi] = gPos(t.dataset.k2), g = S.ateliers[ai].gehs[gi];
  if(t.dataset.ti!=null) g.taches[+t.dataset.ti][t.dataset.f] = t.value; else g[t.dataset.f] = t.value; persist();
});
$("#gehWrap").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return; const d = b.dataset;
  if(d.gadd!=null) S.ateliers[+d.gadd].gehs.push({id:uid(),des:"",eff:"",orga:"",epc:"",epi:"",com:"",taches:[],agents:[],srcs:[],open:true});
  else if(d.adel!=null){ if(!confirm("Supprimer cet atelier et ses GEH ?")) return; S.ateliers.splice(+d.adel,1); }
  else if(d.gdet!=null){ const [ai,gi] = gPos(d.gdet), g = S.ateliers[ai].gehs[gi]; g.detail = !g.detail; }
  else if(d.gtog!=null){ const [ai,gi] = gPos(d.gtog), g = S.ateliers[ai].gehs[gi]; g.open = !g.open; }
  else if(d.tadd!=null){ const [ai,gi] = gPos(d.tadd); S.ateliers[ai].gehs[gi].taches.push({id:uid(),t:"",duree:"",freq:"",prod:""}); }
  else if(d.tdel!=null){ const p = gPos(d.tdel); S.ateliers[p[0]].gehs[p[1]].taches.splice(p[2],1); }
  else if(d.tdup!=null){ const p = gPos(d.tdup), L = S.ateliers[p[0]].gehs[p[1]].taches, c = JSON.parse(JSON.stringify(L[p[2]])); c.id = uid(); L.splice(p[2]+1,0,c); }
  else { const k = d.gdel||d.gup||d.gdn; if(k==null) return; const [ai,gi] = gPos(k), L = S.ateliers[ai].gehs;
    if(d.gdel!=null){ if(!confirm("Supprimer ce GEH et ses tâches ?")) return; L.splice(gi,1); } else if(d.gup!=null && gi>0) [L[gi-1],L[gi]]=[L[gi],L[gi-1]]; else if(d.gdn!=null && gi<L.length-1) [L[gi+1],L[gi]]=[L[gi],L[gi+1]]; }
  persist(); renderGeh();
});

/* ================= Rattachement agents <-> GEH ================= */
function candOfAgent(a){ return S.cand.filter(c=>(c.cas && a.cas===c.cas) || (!c.cas && norm(a.agent)===norm(c.nom)) || (c.refs||[]).includes(a.ref)); }
const gehKeys = g => [g.des].concat(g.srcs||[]).filter(Boolean);
function agentsOfGeh(g){
  const keys = new Set(gehKeys(g)), out = new Set((g.agents||[]).filter(u=>S.agents.some(a=>a.uid===u)));
  S.agents.forEach(a=>{ if(candOfAgent(a).some(c=>c.gehs.some(x=>keys.has(x)))) out.add(a.uid); });
  return [...out];
}
const agl = g => { const n = agentsOfGeh(g).map(agName).filter(Boolean); return '<div class="aglist">'+(n.length ? '<b>'+n.length+' agent(s) retenu(s) :</b> '+esc(n.join(" ; ")) : '<span style="opacity:.75">Aucun agent retenu rattaché à ce GEH</span>')+'</div>'; };

/* ================= Outils GEH (cocher / supprimer / fusionner / déplacer) ================= */
const selG = new Set();
function updSel(){ const n = $("#gSelN"); if(n) n.textContent = selG.size ? selG.size+" coché(s)" : ""; const m = $("#gMoveTo"); if(m){ const v = m.value; m.innerHTML = S.ateliers.map((a,i)=>'<option value="'+i+'">'+esc((i+1)+" – "+(a.nom||"(sans nom)"))+'</option>').join(""); if(v && m.querySelector('option[value="'+v+'"]')) m.value = v; } }
function dropGehRefs(ids, to){ S.plan.forEach(r=>{ if(ids.has(r.gehId)) r.gehId = to||""; }); }
function cleanEmptyAteliers(){ S.ateliers = S.ateliers.filter(a=>a.gehs.length); }
/* risque faible de l'ERC : change les propositions de la matrice (x5) pour les agents non CMR du GEH */
function setErcFaible(ids, on){ S.ateliers.forEach(a=>a.gehs.forEach(g=>{ if(!ids.has(g.id)) return; if(on) g.ercFaible = true; else delete g.ercFaible; })); persist(); renderGeh(); try{ renderMat(); }catch(_){} }
$("#gehWrap").addEventListener("change", e=>{ const t = e.target; if(t.dataset.erc==null) return; const [ai,gi] = gPos(t.dataset.erc); setErcFaible(new Set([S.ateliers[ai].gehs[gi].id]), t.checked); });
$("#gErc").onclick = ()=>{ if(!selG.size) return alert("Coche d'abord les GEH jugés à risque faible dans l'ERC."); const on = !S.ateliers.some(a=>a.gehs.some(g=>selG.has(g.id) && g.ercFaible)); setErcFaible(selG, on); };
$("#gehWrap").addEventListener("change", e=>{ const t = e.target; if(t.dataset.gsel==null) return; if(t.checked) selG.add(t.dataset.gsel); else selG.delete(t.dataset.gsel); updSel(); });
$("#gNoAg").onclick = ()=>{ selG.clear(); S.ateliers.forEach(a=>a.gehs.forEach(g=>{ if(!agentsOfGeh(g).length) selG.add(g.id); })); renderGeh(); };
$("#gUncheck").onclick = ()=>{ selG.clear(); renderGeh(); };
$("#gDelSel").onclick = ()=>{
  if(!selG.size) return alert("Coche d'abord les GEH à supprimer.");
  if(!confirm("Supprimer "+selG.size+" GEH (et leurs tâches) ?")) return;
  dropGehRefs(selG); S.ateliers.forEach(a=>{ a.gehs = a.gehs.filter(g=>!selG.has(g.id)); }); cleanEmptyAteliers(); selG.clear(); persist(); renderGeh();
};
/* fusionne les GEH de la liste dans le premier (tâches, exclusions, agents, sources, EPC/EPI) */
function fusionGeh(l){
  const m = l[0], rest = l.slice(1), ids = new Set(rest.map(g=>g.id));
  const uniq = arr => [...new Set(arr.filter(Boolean))];
  m.srcs = uniq([].concat(...l.map(g=>gehKeys(g)))); m.agents = uniq([].concat(...l.map(g=>g.agents||[])));
  m.des = uniq(l.map(g=>g.des)).join(" / ");
  ["epc","epi"].forEach(k=>{ m[k] = uniq([].concat(...l.map(g=>toks(g[k])))).join(", "); });
  m.com = uniq(l.map(g=>g.com)).join(" — "); if(!m.eff) m.eff = (rest.find(g=>g.eff)||{}).eff||""; if(!m.orga) m.orga = (rest.find(g=>g.orga)||{}).orga||"";
  rest.forEach(g=>{ m.taches = m.taches.concat(g.taches); m.exclus = (m.exclus||[]).concat(g.exclus||[]); });
  dropGehRefs(ids, m.id); S.ateliers.forEach(a=>{ a.gehs = a.gehs.filter(g=>!ids.has(g.id)); }); cleanEmptyAteliers(); return m;
}
/* GEH portant exactement le même nom sur le site (inventaire à une ligne par produit) : groupes à fusionner, avec leurs ateliers */
function gehHomonymes(){ const by = {}; S.ateliers.forEach(a=>a.gehs.forEach(g=>{ const k = norm(g.des); if(k) (by[k] = by[k]||[]).push(g); }));
  return Object.values(by).filter(l=>l.length>1).map(l=>Object.assign(l, {ateliers:[...new Set(l.map(g=>(S.ateliers.find(a=>a.gehs.includes(g))||{}).nom).filter(Boolean))]})); }
$("#gMerge").onclick = ()=>{
  if(selG.size<2) return alert("Coche au moins 2 GEH à fusionner.");
  const l = []; S.ateliers.forEach(a=>a.gehs.forEach(g=>{ if(selG.has(g.id)) l.push(g); }));
  const m = fusionGeh(l); selG.clear(); m.open = true; persist(); renderGeh();
};
$("#gMove").onclick = ()=>{
  if(!selG.size) return alert("Coche d'abord les GEH à déplacer."); const ti = +$("#gMoveTo").value, tgt = S.ateliers[ti]; if(!tgt) return;
  const moved = []; S.ateliers.forEach(a=>{ a.gehs = a.gehs.filter(g=>{ if(selG.has(g.id)){ moved.push(g); return false; } return true; }); });
  tgt.gehs.push(...moved); cleanEmptyAteliers(); selG.clear(); persist(); renderGeh();
};
$("#gCollapse").onclick = ()=>{ S.ateliers.forEach(a=>a.gehs.forEach(g=>g.open=false)); persist(); renderGeh(); };
$("#gExpand").onclick = ()=>{ S.ateliers.forEach(a=>a.gehs.forEach(g=>g.open=true)); persist(); renderGeh(); };
const newGeh = (des,eff,orga) => ({id:uid(), des:des||"", eff:eff||"", orga:orga||"", epc:"", epi:"", com:"", taches:[], agents:[], srcs:[]});
$("#gQuickAdd").onclick = ()=>{
  const lines = $("#gQuick").value.split("\n").map(x=>x.trim()).filter(Boolean); if(!lines.length) return; let n = 0;
  lines.forEach(L=>{ const p = L.split(";").map(x=>x.trim()), head = p[0]; let at = "Site", po = head; const k = head.search(/\s[\/>]\s|^[^\/>]+[\/>]/); const m = /^(.+?)\s*[\/>]\s*(.+)$/.exec(head); if(m){ at = m[1]; po = m[2]; }
    let a = S.ateliers.find(x=>norm(x.nom)===norm(at)); if(!a){ a = {id:uid(), nom:at, gehs:[]}; S.ateliers.push(a); }
    a.gehs.push(Object.assign(newGeh(po,p[1],p[2]),{open:true})); n++; });
  $("#gQuick").value = ""; persist(); renderGeh(); $("#impMsg").textContent = n+" GEH créé(s).";
};
