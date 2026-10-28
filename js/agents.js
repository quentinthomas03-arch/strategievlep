"use strict";
/* ================= Agents ================= */
const BASE = AGENTS.map((a,i)=>Object.assign({ref:i}, a, {_n:norm(a.agent), _c:((CAS_RE.exec(a.cas||"")||[""])[0])}));
$("#nBase").textContent = BASE.length+" agents";
const has = ref => S.agents.some(a=>a.ref===ref);
function snapshot(b){
  const o = {}; ["agent","cas","cmr","v8","vct","accP","accA","methode","principe","support","position","labo","lq","dminCT","dmaxCT","dmin8","dmax8","commentaire","stockage","conservation","transport","vContr","vIndic","vAdm"].forEach(k=>{ if(b[k]!=null) o[k]=b[k]; });
  o.agent = cleanName(o.agent); o.ref = b.ref; o.uid = uid(); return o;
}
function addBase(ref){ if(has(ref)) return false; S.agents.push(snapshot(BASE[ref])); persist(); return true; }
function removeAgent(k){ const u = S.agents[k].uid; S.agents.splice(k,1); _acdC.clear();
  S.plan.forEach(r=>{ if(r.ag) r.ag = r.ag.filter(x=>x!==u); }); S.plan = S.plan.filter(r=>r.kind!=="row" || (r.ag&&r.ag.length) || (r.agTxt||"").trim());
  Object.keys(S.mat||{}).forEach(key=>{ if(key.split("|")[1]===u) delete S.mat[key]; });
  if((S.just||[]).some(j=>j.auto && !j.edited)){ S.just = S.just.filter(j=>!j.auto || j.edited); try{ genJust(); }catch(e){} }
  persist(); renderSel(); renderList(); try{ renderGeh(); }catch(e){} }

function renderList(){
  const q = norm($("#q").value), fa = $("#fAcc").checked, fc = $("#fCmr").checked;
  let r = BASE.filter(b=>{
    if(fa && !(b.accP==="X"&&b.accA==="X")) return false;
    if(fc && !b.cmr) return false;
    if(!q) return true;
    return b._n.includes(q) || b._c.replace(/-/g,"").includes(q.replace(/ /g,"")) || b._c.includes($("#q").value.trim());
  });
  const tot = r.length; r = r.slice(0,80);
  $("#lst").innerHTML = r.map(b=>{
    const acc = (b.accP==="X"&&b.accA==="X") ? '<span class="tag ok">accrédité</span>' : '<span class="tag no">hors accréd.</span>';
    const cmr = b.cmr ? '<span class="tag cmr">'+esc(b.cmr)+'</span>' : '';
    return '<div class="it'+(has(b.ref)?' done':'')+'"><div class="n"><b title="'+esc(cleanName(b.agent))+'">'+esc(cleanName(b.agent))+'</b><span>'+esc(b.cas||"sans CAS")+' · '+esc(b.methode||"")+'</span></div>'+acc+cmr+
      '<button class="btn sm" data-add="'+b.ref+'"'+(has(b.ref)?' disabled':'')+'>'+(has(b.ref)?'Ajouté':'+ Ajouter')+'</button></div>';
  }).join("") || '<div class="empty">Aucun résultat</div>';
  $("#lstInfo").textContent = tot>80 ? tot+" résultats — affine la recherche (80 affichés)" : tot+" résultat(s)";
}
$("#q").addEventListener("input", renderList);
$("#fAcc").addEventListener("change", renderList);
$("#fCmr").addEventListener("change", renderList);
$("#lst").addEventListener("click", e=>{ const b=e.target.closest("[data-add]"); if(!b) return; addBase(+b.dataset.add); renderSel(); renderList(); });

function sortedIdx(){
  return S.agents.map((a,i)=>i).sort((x,y)=>norm(S.agents[x].agent).localeCompare(norm(S.agents[y].agent),"fr"));
}
/* agent sans laboratoire dans la base : écarté de l'étude, sauf demande du client (l'onglet Faisabilité reste disponible pour chercher une offre) */
const hasSol = a => { const sl = (S.dvSel||{})[a.cas || norm(a.agent)]; return !!(sl && (sl.t==="o" || sl.t==="c")); };
/* agent absent de la base (import, saisie) : la méthode reste à trouver, il n'est jamais écarté pour « aucun laboratoire » */
const horsBase = a => !!a && a.ref==null && /hors base/i.test(String(a.methode||""));
function noLab(a){ return !!a && !a.keepNoLab && !horsBase(a) && !String(a.labo||"").trim() && !hasSol(a); }
/* après tout changement de labo / solution / conservation : retire des plan les agents écartés et recalcule les phrases automatiques */
function syncStrategy(){
  _acdC.clear();
  const out = new Set(S.agents.filter(noLab).map(a=>a.uid));
  if(out.size && S.plan){ S.plan.forEach(r=>{ if(r.ag) r.ag = r.ag.filter(x=>!out.has(x)); }); S.plan = S.plan.filter(r=>r.kind!=="row" || (r.ag&&r.ag.length) || (r.agTxt||"").trim()); }
  if((S.just||[]).some(j=>j.auto && !j.edited)){ S.just = S.just.filter(j=>!j.auto || j.edited); try{ genJust(); }catch(e){} }
  persist(); try{ renderSel(); }catch(e){} try{ renderGeh(); }catch(e){} try{ renderPlan(); }catch(e){} try{ renderJust(); }catch(e){}
}
function isAcc(a){ return a.accP==="X" && a.accA==="X"; }
function renderSel(){
  const n = S.agents.length, hors = S.agents.filter(a=>!isAcc(a)).length, cmr = S.agents.filter(a=>a.cmr).length;
  $("#sum").innerHTML = '<span class="tag">'+n+' agent(s)</span><span class="tag ok">'+(n-hors)+' accrédité(s)</span>'+(hors?'<span class="tag no">'+hors+' hors accréditation</span>':'')+(cmr?'<span class="tag cmr">'+cmr+' CMR</span>':'');
  if(!n){ $("#selWrap").innerHTML = '<div class="empty">Aucun agent retenu. Ajoute-les depuis la base, par collage de liste, ou hors base.</div>'; return; }
  const rows = sortedIdx().map(i=>{
    const a = S.agents[i], t = vtype(a);
    const note = a.methode ? '<span class="m">'+esc(a.methode)+(a.labo?' · '+esc(a.labo):'')+'</span>' : '';
    const nl = noLab(a), keepB = horsBase(a) ? '<span class="m" style="color:#b45309">Hors base : méthode et laboratoire à trouver avant l’envoi (ou retirer l’agent avec sa justification).</span>' : (nl || a.keepNoLab) ? '<span class="m" style="color:#b45309">'+(nl ? 'Aucun laboratoire ne réalise cette analyse : agent écarté de l\u2019étude. ' : 'Conservé à la demande du client. ')+'<a href="#" data-keep="'+i+'">'+(nl ? 'Conserver (demande client)' : 'Écarter')+'</a></span>' : '';
    return '<tr class="'+t+(isAcc(a)?'':' hors')+'"><td class="l">'+esc(a.agent)+note+keepB+'</td><td>'+esc(a.cas||"-")+'</td><td>'+fmt(a.v8)+'</td><td>'+fmt(a.vct)+'</td><td>'+esc(a.cmr||"-")+'</td><td>'+(a.accP==="X"?"X":"")+'</td><td>'+(a.accA==="X"?"X":"")+'</td><td><button class="btn sm" data-rm="'+i+'" title="Retirer">×</button></td></tr>';
  }).join("");
  $("#selWrap").innerHTML = '<table class="t"><thead><tr><th rowspan="2">Agent chimique</th><th rowspan="2">N° CAS</th><th colspan="2">VLEP (mg/m³)</th><th rowspan="2">CMR</th><th colspan="2">Accréditations</th><th rowspan="2"></th></tr><tr><th>8 h</th><th>CT</th><th>prélèvements</th><th>analyses</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    (hors?'<div class="warn"><b>'+hors+' agent(s) hors accréditation</b> (liseré orange) : décision à prendre — méthode générique, sous-traitance ou développement. Indique-le dans la remarque de l\'agent hors base ou dans ton plan.</div>':'');
}
$("#selWrap").addEventListener("click", e=>{ const b=e.target.closest("[data-rm]"); if(b) removeAgent(+b.dataset.rm);
  const k = e.target.closest("[data-keep]"); if(k){ e.preventDefault(); const a = S.agents[+k.dataset.keep]; if(a.keepNoLab) delete a.keepNoLab; else a.keepNoLab = true; syncStrategy(); } });

/* synonymes courants (nom collé -> nom en base) */
const ALIAS = {"chlorure d hydrogene":"acide chlorhydrique","azoture de sodium":"azide de sodium","soude":"hydroxyde de sodium","soude caustique":"hydroxyde de sodium","potasse":"hydroxyde de potassium","ethanol 70":"ethanol","alcool ethylique":"ethanol"};
/* collage de liste */
$("#bPasteClear").onclick = ()=>{ $("#paste").value=""; $("#pasteRes").innerHTML=""; };
$("#bPaste").onclick = ()=>{
  const lines = $("#paste").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const added=[], dup=[], multi=[], amb=[], none=[];
  for(const ln of lines){
    let hits=[]; const m = ln.match(CAS_RE);
    if(m) hits = baseByCas(m[0]);
    if(!hits.length){
      let q = norm(ln.replace(CAS_RE,"")); if(ALIAS[q]) q = ALIAS[q];
      if(q.length>=3){
        hits = BASE.filter(b=>b._n===q);
        if(!hits.length) hits = BASE.filter(b=>b._n.startsWith(q));
        if(!hits.length && q.length>=5) hits = BASE.filter(b=>b._n.includes(q));
      }
    }
    if(!hits.length){ none.push(ln); continue; }
    const names = new Set(hits.map(h=>norm(h.agent)));
    if(!m && names.size>1){ amb.push(ln+" → "+[...names].slice(0,4).join(" / ")); continue; }
    const h = hits.find(x=>!has(x.ref)) || hits[0];
    if(has(h.ref)){ dup.push(ln); continue; }
    addBase(h.ref); added.push(cleanName(h.agent)); if(hits.length>1) multi.push(cleanName(h.agent)+" ("+hits.length+" variantes)");
  }
  let h = "";
  if(added.length) h += '<div class="ok"><b>'+added.length+' ajouté(s)</b> : '+esc(added.join(", "))+'</div>';
  if(multi.length) h += '<div class="warn">Plusieurs variantes en base, la première a été retenue : '+esc(multi.join(" ; "))+'. Pour une autre variante, retire-la et choisis-la dans la base.</div>';
  if(dup.length) h += '<div class="warn">Déjà présents : '+esc(dup.join(", "))+'</div>';
  if(amb.length) h += '<div class="warn"><b>Ambigus, rien ajouté</b> (précise ou saisis le CAS) :<br>'+esc(amb.join("\n")).replace(/\n/g,"<br>")+'</div>';
  if(none.length) h += '<div class="warn"><b>Introuvables dans la base</b> ('+none.length+') — à ajouter « hors base » si utile :<br>'+esc(none.join("\n")).replace(/\n/g,"<br>")+'</div>';
  $("#pasteRes").innerHTML = h || '<div class="warn">Rien à traiter.</div>';
  renderSel(); renderList();
};

/* hors base */
$("#bCustom").onclick = ()=>{
  const nom = $("#cNom").value.trim(); if(!nom){ $("#cNom").focus(); return; }
  const t = $("#cType").value, a = {agent:nom, cas:$("#cCas").value.trim(), v8:$("#cV8").value.trim().replace(",","."), vct:$("#cVct").value.trim().replace(",","."), cmr:$("#cCmr").value.trim(), methode:$("#cNote").value.trim(), ref:null, custom:true, uid:uid()};
  if(!a.cas) delete a.cas; if(a.v8==="") delete a.v8; if(a.vct==="") delete a.vct; if(!a.cmr) delete a.cmr; if(!a.methode) delete a.methode;
  if($("#cAccP").checked) a.accP="X"; if($("#cAccA").checked) a.accA="X";
  if(t==="contr") a.vContr="X"; if(t==="indic") a.vIndic="X"; if(t==="adm") a.vAdm="X";
  S.agents.push(a); persist();
  ["cNom","cCas","cV8","cVct","cCmr","cNote"].forEach(id=>$("#"+id).value=""); $("#cType").value=""; $("#cAccP").checked=$("#cAccA").checked=false;
  renderSel();
};
