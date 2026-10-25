"use strict";
/* ================= Plan d'échantillonnage ================= */
const agName = u => { const a = S.agents.find(x=>x.uid===u); return a && !noLab(a) ? a.agent : null; };
function planAgents(r){ const l = (r.ag||[]).map(agName).filter(Boolean); if(r.agTxt && r.agTxt.trim()) l.push(...r.agTxt.split(/\n|\s\/\s/).map(x=>x.trim()).filter(Boolean)); return l; }
function planGeh(r){ if(r.gehId==="__txt") return r.gehTxt||""; return r.gehId ? gehLabel(r.gehId) : ""; }
let openDD = null;
function ddSummary(r){ const l = planAgents(r); return l.length ? esc(l.join(" / ")) : '<span style="color:var(--mut)">Choisir les agents…</span>'; }
function renderPlan(){
  $("#thr").value = S.thr||8; fillCap(); renderMat();
  const gl = gehList();
  const body = S.plan.map((r,pi)=>{
    const act = '<td class="act"><button class="btn sm" data-pup="'+pi+'" title="Monter">↑</button> <button class="btn sm" data-pdn="'+pi+'" title="Descendre">↓</button> <button class="btn sm" data-pdup="'+pi+'" title="Dupliquer">⧉</button> <button class="btn sm" data-pdel="'+pi+'" title="Supprimer">×</button></td>';
    if(r.kind==="sec") return '<tr class="sec"><td colspan="6"><input data-pi="'+pi+'" data-f="txt" value="'+esc(r.txt||"")+'" placeholder="Titre de section (ex : Option 1, Postes fixes)"></td>'+act+'</tr>';
    const checks = S.agents.filter(a=>!noLab(a) || (r.ag||[]).includes(a.uid)).map(a=>'<label><input type="checkbox" data-pi="'+pi+'" data-ag="'+a.uid+'"'+((r.ag||[]).includes(a.uid)?' checked':'')+'> '+esc(a.agent)+'</label>').join("") || '<div class="legend">Aucun agent retenu (onglet 2).</div>';
    const gopts = '<option value="">—</option>'+gl.map(g=>'<option value="'+g.id+'"'+(r.gehId===g.id?' selected':'')+'>'+esc(g.label)+'</option>').join("")+'<option value="__txt"'+(r.gehId==="__txt"?' selected':'')+'>Autre (texte libre)…</option>';
    return '<tr><td style="width:140px"><input data-pi="'+pi+'" data-f="jour" list="dl-jours" value="'+esc(r.jour||"")+'"></td>'+
      '<td class="l" style="min-width:260px"><details class="dd" data-pi="'+pi+'"'+(openDD===pi?' open':'')+'><summary>'+ddSummary(r)+'</summary><div class="pop">'+checks+'<div style="margin-top:6px"><input data-pi="'+pi+'" data-f="agTxt" value="'+esc(r.agTxt||"")+'" placeholder="Autre agent / texte libre (séparer par « / »)"></div></div></details></td>'+
      '<td style="min-width:170px"><select data-pi="'+pi+'" data-f="gehId">'+gopts+'</select>'+(r.gehId==="__txt"?'<input data-pi="'+pi+'" data-f="gehTxt" value="'+esc(r.gehTxt||"")+'" placeholder="ex : PF - Chargement" style="margin-top:3px">':'')+'</td>'+
      '<td style="width:70px"><input type="number" min="0" data-pi="'+pi+'" data-f="nb" value="'+esc(r.nb==null?"":r.nb)+'"></td>'+
      '<td style="width:80px"><select data-pi="'+pi+'" data-f="type"><option value=""></option><option'+(r.type==="8h"?' selected':'')+'>8h</option><option'+(r.type==="CT"?' selected':'')+'>CT</option></select></td>'+
      '<td class="l" style="min-width:200px"><input data-pi="'+pi+'" data-f="plage" list="dl-plages" value="'+esc(r.plage||"")+'"></td>'+act+'</tr>'+
      '<tr class="whyrow"><td colspan="7" data-why="'+pi+'">'+raisonsHtml(r)+'</td></tr>';
  }).join("");
  $("#planWrap").innerHTML = S.plan.length ? '<table class="t"><thead><tr><th>Jour</th><th>Agents chimiques</th><th>N° GEH</th><th>Nb total de prélèvements</th><th>Type de VLEP</th><th>Plage horaire de prélèvement</th><th></th></tr></thead><tbody>'+body+'</tbody></table>' : '<div class="empty">Plan vide. Ajoute une première ligne.</div>';
  renderChecks();
}
function renderChecks(){
  const gl = gehList(), out = [];
  const lines = S.plan.filter(r=>r.kind!=="sec");
  /* raisons du moteur sous chaque ligne, et ses alertes en tête des contrôles */
  $$("[data-why]").forEach(td=>{ const r = S.plan[+td.dataset.why]; if(r) td.innerHTML = raisonsHtml(r); });
  const al = []; let k0 = 0; S.plan.forEach(r=>{ if(r.kind==="sec") return; k0++; analyseLigne(r).alertes.forEach(a=>al.push("ligne "+k0+" : "+a.t+" ("+a.s+")")); });
  controleJustifs().forEach(a=>al.push(a.t.charAt(0).toUpperCase()+a.t.slice(1)+" ("+a.s+")"));
  if(al.length) out.push('<div class="warn"><b>'+al.length+' point(s) à reprendre selon les règles</b><ul style="margin:4px 0 0 18px;padding:0">'+al.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>');
  const bl = blancsTerrain(); if(bl.length) out.push('<div class="legend" style="margin:6px 0">Blancs de terrain à prévoir : au moins un par type de support et par campagne ('+bl.length+') : '+esc(bl.join(" ; "))+' <i>('+esc(SRC.blancs)+')</i></div>');
  /* agents non planifiés */
  const used = new Set(); lines.forEach(r=>(r.ag||[]).forEach(u=>used.add(u)));
  const unp = S.agents.filter(a=>!noLab(a) && !used.has(a.uid)).map(a=>a.agent);
  out.push(unp.length ? '<div class="warn"><b>'+unp.length+' agent(s) retenu(s) absent(s) du plan</b> — à planifier ou à justifier (élimination) : '+esc(unp.join(" ; "))+'</div>' : (S.agents.length?'<div class="ok">Tous les agents retenus figurent dans le plan.</div>':''));
  /* GEH non couverts */
  const ug = new Set(lines.map(r=>r.gehId)); const ng = gl.filter(g=>!ug.has(g.id)).map(g=>g.label);
  if(gl.length) out.push(ng.length ? '<div class="warn"><b>'+ng.length+' GEH sans ligne dans le plan</b> — à justifier (regroupement, élimination) : '+esc(ng.join(" ; "))+'</div>' : '<div class="ok">Tous les GEH sont couverts par le plan.</div>');
  /* lignes incomplètes */
  const inc = []; let k = 0;
  S.plan.forEach(r=>{ if(r.kind==="sec") return; k++; const miss = []; if(!(r.jour||"").trim()) miss.push("jour"); if(!planAgents(r).length) miss.push("agents"); if(!r.gehId || (r.gehId==="__txt" && !(r.gehTxt||"").trim())) miss.push("GEH"); if(r.nb===""||r.nb==null) miss.push("nombre"); if(miss.length) inc.push("ligne "+k+" ("+miss.join(", ")+")"); });
  if(inc.length) out.push('<div class="warn"><b>Lignes incomplètes</b> : '+esc(inc.join(" ; "))+'</div>');
  /* charge par jour (hors options) */
  const load = {}; let opt = false;
  S.plan.forEach(r=>{ if(r.kind==="sec"){ opt = /option/i.test(r.txt||""); return; } if(opt) return;
    const days = [...new Set([...(r.jour||"").matchAll(/J\s*(\d+)/gi)].map(m=>+m[1]))]; const nb = parseFloat(r.nb); if(!days.length || isNaN(nb) || !r.type) return;
    /* répartition exacte laissée par la génération tant que jour, nombre et type n'ont pas été retouchés ; sinon parts égales */
    const rep = r.rep && r.rep.jour===r.jour && r.rep.nb===nb && r.rep.type===r.type ? r.rep.par : null;
    days.forEach(d=>{ load[d] = load[d]||{"8h":0,"CT":0}; load[d][r.type] += rep && rep[d]!=null ? rep[d] : nb/days.length; }); });
  const ds = Object.keys(load).map(Number).sort((a,b)=>a-b), C = CAP(), cap8 = C.h8*C.techs, capC = C.ct*C.techs;
  if(ds.length){
    const f = v => Math.round(v*10)/10, bad = ' style="background:#FFF3E6;font-weight:700"';
    out.push('<table class="t" style="max-width:620px"><thead><tr><th>Jour</th><th>Prélèvements 8 h</th><th>Prélèvements CT</th><th>Pompes</th></tr></thead><tbody>'+ds.map(d=>{ const p = load[d]["8h"]+Math.min(load[d]["CT"], C.techs); return '<tr><td>J'+d+'</td><td'+(load[d]["8h"]>cap8?bad:'')+'>'+f(load[d]["8h"])+' / '+cap8+'</td><td'+(load[d]["CT"]>capC?bad:'')+'>'+f(load[d]["CT"])+' / '+capC+'</td><td'+(p>C.pumps?bad:'')+'>'+f(p)+' / '+C.pumps+'</td></tr>'; }).join("")+'</tbody></table><div class="legend">Charge par jour / capacité ('+C.techs+' technicien(s), '+C.pumps+' pompes ; une pompe par prélèvement 8 h ; une pompe CT sert à tous les CT du technicien dans la journée ; les agents d\'une même ligne partagent la même pompe). Orange : capacité dépassée (options exclues).</div>');
  }
  $("#planChk").innerHTML = out.join("") || '<div class="empty">Rien à contrôler pour l\'instant.</div>';
}
function fillCap(){ $$("[data-cap]").forEach(el=>{ const v = parseInt((S.cap||{})[el.dataset.cap]); el.value = v>0 ? v : ""; }); }
$$("[data-cap]").forEach(el=>el.addEventListener("input", ()=>{ S.cap = S.cap||{}; S.cap[el.dataset.cap] = parseInt(el.value)||""; $$("[data-cap]").forEach(o=>{ if(o!==el && o.dataset.cap===el.dataset.cap) o.value = el.value; }); persist(); renderChecks(); }));
$("#thr").addEventListener("input", e=>{ S.thr = parseInt(e.target.value)||8; persist(); renderChecks(); });
function planTable(){
  const H = ["Jour","Agents chimiques","N° GEH","Nb total de prélèvements","Type de VLEP","Plage horaire de prélèvement"], W = [60,230,170,80,70,170];
  const rows = S.plan.map(r=> r.kind==="sec" ? {sec:r.txt||""} : {c:[(r.jour||"").trim(), planAgents(r).join("\n"), planGeh(r), r.nb===""||r.nb==null?"":String(r.nb), r.type||"", (r.plage||"").trim()]});
  const td = "border:1px solid #7FB8D6;padding:3px 6px;font:10pt Arial;vertical-align:middle;", th = td+"background:#3381C7;color:#fff;font-weight:bold;text-align:center;";
  const INTRO = "Socotec Environnement vous propose, en première approche, le plan d’échantillonnage ci-dessous, à partir duquel le tarif est basé. Une évolution de ce déroulement qui ne serait pas de notre fait, entraînera des coûts supplémentaires tels qu’énoncés dans l’offre.", withT = !$("#cpTitle") || $("#cpTitle").checked;
  let h = '<table style="border-collapse:collapse"><colgroup>'+W.map(w=>'<col width="'+w+'">').join("")+'</colgroup>'+(withT ? '<tr><td colspan="6" style="font:bold 12pt Arial;background:#3381C7;color:#fff;text-align:center;padding:6px">Plan d’échantillonnage</td></tr><tr><td colspan="6" style="font:11pt Arial;padding:6px 4px">'+esc(INTRO)+'</td></tr>' : '')+'<tr>'+H.map(x=>'<th style="'+th+'">'+esc(x)+'</th>').join("")+'</tr>';
  rows.forEach(r=>{ if(r.sec!=null) h += '<tr><td colspan="6" style="'+td+'border:2px solid #000;text-align:center">'+esc(r.sec)+'</td></tr>';
    else h += '<tr>'+r.c.map((x,i)=>'<td style="'+td+(i===0||i>=3?'text-align:center;':'')+'">'+esc(x).replace(/\n/g,"<br>")+'</td>').join("")+'</tr>'; });
  h += '</table>';
  const tsv = (withT ? ["Plan d’échantillonnage",INTRO,""].map(x=>x+"\t\t\t\t\t") : []).concat([H.join("\t")]).concat(rows.map(r=> r.sec!=null ? r.sec+"\t\t\t\t\t" : r.c.map(x=>/[\n\t"]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x).join("\t"))).join("\n");
  return {html:h, tsv};
}
$("#bCopyPlan").onclick = async ()=>{
  const m = $("#cpMsg"), n = S.plan.filter(r=>r.kind!=="sec").length; if(!n){ m.textContent = "Plan vide."; return; }
  const {html, tsv} = planTable();
  try{ await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([html],{type:"text/html"}),"text/plain":new Blob([tsv],{type:"text/plain"})})]); m.textContent = "✔ Plan copié ("+n+" lignes) : colle-le dans Excel, Word ou le devis."; }
  catch(e){ try{ const d = document.createElement("div"); d.style.cssText = "position:fixed;left:-9999px;top:0"; d.innerHTML = html; document.body.appendChild(d); const r = document.createRange(); r.selectNodeContents(d); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); const ok = document.execCommand("copy"); sel.removeAllRanges(); d.remove(); m.textContent = ok ? "✔ Plan copié ("+n+" lignes)." : "Copie bloquée par le navigateur."; }catch(e2){ m.textContent = "Copie impossible : utilise l'export Excel."; } }
};
$("#bRow").onclick = ()=>{ const last = [...S.plan].reverse().find(r=>r.kind!=="sec"); S.plan.push({id:uid(), kind:"row", jour:last?last.jour:"J1", ag:[], agTxt:"", gehId:"", gehTxt:"", nb:"", type:"", plage:""}); persist(); renderPlan(); };
$("#bSec").onclick = ()=>{ S.plan.push({id:uid(), kind:"sec", txt:""}); persist(); renderPlan(); };
$("#planWrap").addEventListener("input", e=>{
  const t = e.target; if(t.dataset.pi==null || !t.dataset.f) return; const r = S.plan[+t.dataset.pi];
  r[t.dataset.f] = t.type==="number" ? (t.value===""?"":+t.value) : t.value; persist();
  if(t.dataset.f==="agTxt"){ const d = t.closest("details"); if(d) d.querySelector("summary").innerHTML = ddSummary(r); }
  renderChecks();
});
$("#planWrap").addEventListener("change", e=>{
  const t = e.target; if(t.dataset.pi==null) return; const r = S.plan[+t.dataset.pi];
  if(t.dataset.ag){ r.ag = r.ag||[]; const i = r.ag.indexOf(t.dataset.ag); if(t.checked && i<0) r.ag.push(t.dataset.ag); if(!t.checked && i>=0) r.ag.splice(i,1);
    persist(); t.closest("details").querySelector("summary").innerHTML = ddSummary(r); renderChecks(); return; }
  if(t.dataset.f==="gehId"){ r.gehId = t.value; persist(); renderPlan(); return; }
  if(t.dataset.f==="type"){ r.type = t.value; persist(); renderChecks(); }
});
$("#planWrap").addEventListener("toggle", e=>{ const d = e.target; if(d.matches && d.matches("details.dd")){ const pi = +d.dataset.pi; if(d.open){ openDD = pi; $$("#planWrap details.dd[open]").forEach(o=>{ if(o!==d) o.open=false; }); } else if(openDD===pi) openDD = null; } }, true);
document.addEventListener("focusin", e=>{ if(!e.target.closest("details.dd")) $$("#planWrap details.dd[open]").forEach(o=>o.open=false); });
document.addEventListener("mousedown", e=>{ if(!e.target.closest("details.dd")){ $$("#planWrap details.dd[open]").forEach(o=>o.open=false); } });
$("#planWrap").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return; const d = b.dataset;
  if(d.pdel!=null) S.plan.splice(+d.pdel,1);
  else if(d.pdup!=null){ const c = JSON.parse(JSON.stringify(S.plan[+d.pdup])); c.id = uid(); S.plan.splice(+d.pdup+1,0,c); }
  else if(d.pup!=null){ const i = +d.pup; if(i>0) [S.plan[i-1],S.plan[i]]=[S.plan[i],S.plan[i-1]]; }
  else if(d.pdn!=null){ const i = +d.pdn; if(i<S.plan.length-1) [S.plan[i+1],S.plan[i]]=[S.plan[i],S.plan[i+1]]; }
  else return;
  openDD = null; persist(); renderPlan();
});
