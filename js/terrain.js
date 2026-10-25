"use strict";
/* ================= Terrain (saisie pendant la visite) ================= */
const T_ORGA = ["Journée","2x8","3x8","5x8","Nuit","Week-end"];
const T_EPI = ["Gants nitrile","Gants butyle","Gants néoprène","Lunettes","Écran facial","Demi-masque FFP2","Demi-masque FFP3","Demi-masque A2P3","Masque complet","Combinaison jetable","Tablier","Bottes","Aucun EPI"];
const T_EPC = ["Ventilation générale","Captage localisé","Hotte / sorbonne","Cabine fermée","Local ventilé","Extérieur","Aucun"];
const T_DUREE = ["Moins de 15 min","Entre 15 min et 1 heure","Entre 1 et 4 heures","Plus de 4 heures"];
const T_FREQ = ["Quotidienne","2x / semaine","1x / semaine","1x / mois","1x / an"];
const T_TACHES = ["Nettoyage","Maintenance","Pesée","Transvasement","Mélange","Application peinture","Dégraissage","Soudage","Découpe / usinage","Ensachage","Chargement / déchargement","Contrôle qualité"];
let tGeh = null, tf = {t:"",duree:"",freq:"",prod:"",ag:[],edit:null,q:""};
const toks = s => String(s||"").split(/\s*[,;]\s*/).filter(Boolean);
function toggleTok(s,t){ const l = toks(s), i = l.findIndex(x=>norm(x)===norm(t)); if(i>=0) l.splice(i,1); else l.push(t); return l.join(", "); }
const chip = (label, on, attrs, cls) => '<button type="button" class="chip'+(on?' on':'')+(cls?' '+cls:'')+'" '+attrs+'>'+esc(label)+'</button>';
function allGeh(){ const o = []; S.ateliers.forEach((a,ai)=>a.gehs.forEach((g,gi)=>o.push({a,g,ai,gi}))); return o; }
function curGeh(){ const l = allGeh(); let x = l.find(o=>o.g.id===tGeh); if(!x && l.length){ x = l[0]; tGeh = x.g.id; } return x||null; }
function ensureAgent(x){
  if(x.uid) return x.uid;
  if(x.ref!=null){ const ex = S.agents.find(a=>a.ref===x.ref); if(ex) return ex.uid; addBase(x.ref); return S.agents.find(a=>a.ref===x.ref).uid; }
  const nm = cleanName(x.name), ex = S.agents.find(a=>norm(a.agent)===norm(nm)); if(ex) return ex.uid;
  const a = {uid:uid(), agent:nm, ref:null, custom:true, methode:"Hors base — à définir"}; if(CAS_RE.test(nm)) a.cas = CAS_RE.exec(nm)[0]; S.agents.push(a); persist(); return a.uid;
}
function tFres(){
  const q = norm(tf.qf||""); if(q.length<2) return "";
  const out = []; S.fds.forEach((P,i)=>{ if(out.length<10 && (norm(P.nom).includes(q) || norm(P.fourn||"").includes(q))) out.push('<button data-act="fprod" data-i="'+i+'">'+esc(P.nom)+' <small>'+esc(P.fourn||"")+' · '+P.subs.length+' substance(s) à VLEP/CMR</small></button>'); });
  return out.join("");
}
function ensureAgentRec(r){
  const ex = S.agents.find(a=>(r.cas && a.cas===r.cas)); if(ex) return ex.uid;
  const b = r.cas ? baseByCas(r.cas, r.nom)[0] : null; if(b) return ensureAgent({ref:b.ref});
  const a = {uid:uid(), agent:r.nom, ref:null, custom:true, methode:"Hors base — à définir"}; if(r.cas) a.cas = r.cas; if(r.v8) a.v8 = r.v8; if(r.vct) a.vct = r.vct; if(r.cmr) a.cmr = r.cmr;
  const k = vNature(r.nat); if(k) a[k] = "X"; S.agents.push(a); persist(); return a.uid;
}
function tResults(){
  const q = norm(tf.q); if(q.length<2) return "";
  const raw = tf.q.trim(), out = []; const seen = new Set();
  S.agents.forEach(a=>{ if(out.length<10 && (norm(a.agent).includes(q) || (a.cas||"").includes(raw))){ out.push('<button data-act="tag" data-uid="'+a.uid+'">✓ '+esc(a.agent)+' <small>'+esc(a.cas||"")+' · retenu</small></button>'); seen.add(a.ref); } });
  BASE.forEach(b=>{ if(out.length<10 && !seen.has(b.ref) && !has(b.ref) && (b._n.includes(q) || (b._c && b._c.includes(raw)))) out.push('<button data-act="tag" data-ref="'+b.ref+'">'+esc(cleanName(b.agent))+' <small>'+esc(b.cas||"")+((b.accP==="X"&&b.accA==="X")?' · accrédité':' · hors accréd.')+'</small></button>'); });
  if(raw.length>=3) out.push('<button data-act="tfree" data-name="'+esc(raw)+'">➕ Ajouter « '+esc(raw)+' » (hors base)</button>');
  return out.join("");
}
function renderTerrain(){
  syncEnt(); updTerrainSel(); renderCarnet();
  const x = curGeh();
  if(!x){ $("#tHead").innerHTML = '<div class="empty">Aucun GEH. Touche « + GEH » pour commencer la visite.</div>'; $("#tBody").innerHTML = ""; tCount(); return; }
  const g = x.g, ats = S.ateliers.map(a=>a.nom).filter(Boolean);
  $("#tHead").innerHTML = '<div class="tf">'+
    '<label>Atelier / zone</label><input data-tf="atelier" list="dl-at" value="'+esc(x.a.nom)+'" placeholder="ex : Production, Maintenance">'+
    '<datalist id="dl-at">'+ats.map(a=>'<option value="'+esc(a)+'">').join("")+'</datalist>'+
    '<label>Désignation du GEH (poste / fonction)</label><input data-tf="des" value="'+esc(g.des)+'" placeholder="ex : Opérateur peinture">'+
    '<label>Effectif</label><input data-tf="eff" inputmode="text" value="'+esc(g.eff)+'" placeholder="ex : 3 (9)">'+
    '<label>Organisation du travail</label>'+T_ORGA.map(v=>chip(v, toks(g.orga).some(y=>norm(y)===norm(v)), 'data-chip="orga" data-v="'+esc(v)+'"')).join("")+'<input data-tf="orga" value="'+esc(g.orga)+'" placeholder="ex : 2x8, 6h-14h / 14h-22h">'+
    '<label>EPC / environnement de travail</label>'+T_EPC.map(v=>chip(v, toks(g.epc).some(y=>norm(y)===norm(v)), 'data-chip="epc" data-v="'+esc(v)+'"')).join("")+'<input data-tf="epc" value="'+esc(g.epc)+'" placeholder="précisions">'+
    '<label>EPI portés</label>'+T_EPI.map(v=>chip(v, toks(g.epi).some(y=>norm(y)===norm(v)), 'data-chip="epi" data-v="'+esc(v)+'"')).join("")+'<input data-tf="epi" value="'+esc(g.epi)+'" placeholder="précisions (norme, type de cartouche…)">'+
    '<label>Commentaire / observation</label><textarea data-tf="com" rows="3" placeholder="variations de production, remarques…">'+esc(g.com)+'</textarea>'+
    '<div class="aglist" style="margin:10px 0 0">'+(agentsOfGeh(g).length ? '<b>Polluants rattachés :</b> '+esc(agentsOfGeh(g).map(agName).filter(Boolean).join(" ; ")) : 'Aucun polluant rattaché pour l\'instant.')+'</div></div>';
  const MT = mergedTasks(g, true), tasks = MT.map(k=>'<div class="tcard"><div class="row" style="margin:0"><b style="flex:1">'+esc(k.t||"(tâche sans nom)")+(k.idx.length>1?' <small>('+k.idx.length+' lignes fusionnées)</small>':'')+'</b><button class="btn sm" data-act="tedit" data-i="'+k.idx[0]+'">Modifier</button><button class="btn sm" data-act="tdelg" data-ii="'+k.idx.join(",")+'">×</button></div>'+
    '<div class="m">'+esc([k.dur.join(" / "),k.frq.join(" / ")].filter(Boolean).join(" · "))+'</div>'+cellHtml(k)+qHtml(k)+'</div>').join("");
  const sel = n => tf.ag.map(u=>{ const a = S.agents.find(z=>z.uid===u); return a ? chip("✕ "+a.agent, true, 'data-act="tunag" data-u="'+u+'"', "ag") : ""; }).join("");
  $("#tBody").innerHTML = '<div class="card tf"><h2>Activités / tâches de ce GEH ('+MT.length+')</h2>'+(tasks||'<div class="legend">Aucune tâche saisie.</div>')+((g.exclus||[]).length?'<div class="legend">'+g.exclus.length+' ligne(s) masquée(s) (fin d\'activité ou sans exposition) : onglet 4, encart « Éléments exclus ».</div>':'')+
    '<h2 style="margin-top:18px">'+(tf.edit!=null?'Modifier la tâche':'Ajouter une tâche')+'</h2>'+
    '<label>Tâche / activité</label><input data-tt="t" list="dl-taches" value="'+esc(tf.t)+'" placeholder="ex : Remplissage des cuves"><datalist id="dl-taches">'+[...new Set(T_TACHES.concat(allGeh().flatMap(o=>o.g.taches.map(k=>k.t))).filter(Boolean))].map(v=>'<option value="'+esc(v)+'">').join("")+'</datalist>'+
    '<label>Durée d\'exposition</label>'+T_DUREE.map(v=>chip(v, tf.duree===v, 'data-act="tdur" data-v="'+esc(v)+'"')).join("")+
    '<label>Fréquence</label>'+T_FREQ.map(v=>chip(v, tf.freq===v, 'data-act="tfreq" data-v="'+esc(v)+'"')).join("")+'<input data-tt="freq" value="'+esc(tf.freq)+'" placeholder="autre fréquence">'+
    '<label>Produits utilisés</label><textarea data-tt="prod" rows="2" placeholder="ex : Dégraissant X, diluant Y">'+esc(tf.prod)+'</textarea>'+
    (S.fds.length ? '<input data-tt="qf" value="'+esc(tf.qf||"")+'" placeholder="Chercher dans les FDS importées ('+S.fds.length+' produits)…" autocomplete="off" style="margin-top:6px"><div class="tres'+(tFres()?'':' hide')+'" id="tResF">'+tFres()+'</div>' : '')+
    '<label>Polluants / agents chimiques</label><div id="tSel">'+sel()+'</div><input data-tt="q" value="'+esc(tf.q)+'" placeholder="Rechercher un agent (nom ou CAS)…" autocomplete="off"><div class="tres'+(tResults()?'':' hide')+'" id="tRes">'+tResults()+'</div>'+
    '<div class="row" style="margin-top:14px"><button class="btn pri big" data-act="tsave">'+(tf.edit!=null?'Enregistrer la modification':'+ Ajouter la tâche')+'</button>'+(tf.edit!=null?'<button class="btn big" data-act="tcancel">Annuler</button>':'')+'</div></div>';
  tCount();
}
function tCount(){ const nG = allGeh().length, nT = allGeh().reduce((n,o)=>n+mergedTasks(o.g,true).length,0); $("#tCount").textContent = nG+" GEH · "+nT+" tâche(s) · "+S.agents.length+" agent(s) retenu(s) · "+bkText(); }
const gMiss = g => ["eff","orga","epc","epi"].filter(k=>!String(g[k]||"").trim());
function updTerrainSel(){ const l = allGeh(); const cur = curGeh(); const nOk = l.filter(o=>!gMiss(o.g).length).length;
  $("#tSel").innerHTML = l.map((o,i)=>'<option value="'+o.g.id+'"'+(cur&&cur.g.id===o.g.id?' selected':'')+'>'+(gMiss(o.g).length?'○ ':'✓ ')+(i+1)+' – '+esc(o.g.des||"(sans nom)")+' ['+esc(o.a.nom||"?")+']</option>').join("") || '<option>—</option>';
  const pr = $("#tProg"); if(pr) pr.textContent = l.length ? nOk+" / "+l.length+" GEH complets" : ""; }
$("#tNext").onclick = ()=>{ const l = allGeh(); if(!l.length) return; const cur = l.findIndex(o=>o.g.id===tGeh); for(let k=1;k<=l.length;k++){ const o = l[(cur+k)%l.length]; if(gMiss(o.g).length){ tGeh = o.g.id; resetTf(); renderTerrain(); window.scrollTo({top:0}); return; } } alert("Tous les GEH ont effectif, organisation, EPC et EPI renseignés."); };
function resetTf(){ tf = {t:"",duree:"",freq:"",prod:"",ag:[],edit:null,q:""}; }
$("#tSel").addEventListener("change", e=>{ tGeh = e.target.value; resetTf(); renderTerrain(); });
$("#tNew").onclick = ()=>{
  let a = S.ateliers[S.ateliers.length-1]; if(!a){ a = {id:uid(), nom:"", gehs:[]}; S.ateliers.push(a); }
  const g = newGeh(); a.gehs.push(g); tGeh = g.id; resetTf(); persist(); renderTerrain(); const i = document.querySelector('#tHead [data-tf="des"]'); if(i) i.focus();
};
$("#tDel").onclick = ()=>{ const x = curGeh(); if(!x) return; if(!confirm("Supprimer ce GEH et ses tâches ?")) return; dropGehRefs(new Set([x.g.id])); x.a.gehs.splice(x.gi,1); cleanEmptyAteliers(); tGeh = null; resetTf(); persist(); renderTerrain(); };
/* ================= Carnet de visite (notes par GEH / tâche, dictée) ================= */
const C_TYPES = [["remarque","Remarque"],["tache","Tâche"],["polluant","Polluant / produit"],["epi","EPI"],["epc","EPC / ventilation"],["duree","Durée / fréquence"]];
const C_KEY = {tache:/^\s*t[âa]ches?\b/i, polluant:/^\s*(polluants?|produits?|agents?)\b/i, epi:/^\s*(epi|é\s?p\s?i|équipements?)\b/i, epc:/^\s*(epc|é\s?p\s?c|ventilation|captage)\b/i, duree:/^\s*(durée|duree|fréquence|frequence)\b/i, remarque:/^\s*(remarques?|notes?)\b/i};
let cType = "remarque", cAtt = "", cText = "", cVoice = null;
const C_LAB = Object.fromEntries(C_TYPES);
function renderCarnet(){
  const host = $("#tCarnet"); if(!host) return; const x = curGeh(), all = allGeh();
  let h = '<h2>Carnet de visite</h2><div class="legend" style="margin:0 0 8px">Choisis le GEH, écris ou dicte, puis « Ajouter ». Chaque note est reportée dans la fiche du GEH (tâches, EPI, EPC, commentaires). Commence ta phrase par « tâche », « EPI », « EPC », « polluant », « durée » ou « remarque » pour choisir le type à la voix.</div>';
  h += '<div class="cgeh">'+all.map((o,i)=>chip((i+1)+" · "+(o.g.des||"sans nom"), x&&x.g.id===o.g.id, 'data-cg="'+o.g.id+'"')).join("")+'</div>';
  h += '<div class="row" style="margin:8px 0 0"><input id="cNewGeh" style="flex:1" placeholder="Nouveau GEH (ex : Opérateur peinture)" autocomplete="off"><button class="btn pri" data-cact="newgeh" type="button">+ GEH</button></div>';
  if(!x){ host.innerHTML = h+'<div class="empty" style="margin-top:10px">Aucun GEH : crée le premier ci-dessus.</div>'; return; }
  const g = x.g, tasks = mergedTasks(g, true).map(m=>({id:m.ids[0], ids:m.ids, t:m.t, duree:m.dur.join(" / "), freq:m.frq.join(" / ")}));
  h += '<div class="cbar"><b>GEH '+(all.findIndex(o=>o.g.id===g.id)+1)+' · '+esc(g.des||"sans nom")+'</b> <span class="tag">'+esc(x.a.nom||"atelier ?")+'</span></div>';
  h += '<div>'+C_TYPES.map(([k,l])=>chip(l, cType===k, 'data-ctype="'+k+'"')).join("")+'</div>';
  h += '<div class="row" style="margin:6px 0 0"><label style="font-size:12px;color:var(--mut)">Rattacher à&nbsp;<select id="cAtt"><option value="">le GEH entier</option>'+tasks.map(k=>'<option value="'+k.id+'"'+(cAtt===k.id?' selected':'')+'>Tâche : '+esc(k.t||"(sans nom)")+'</option>').join("")+'</select></label></div>';
  h += '<textarea id="cText" rows="3" placeholder="'+(cType==="tache"?"ex : Remplissage des cuves":cType==="polluant"?"ex : acétone, white spirit":cType==="epi"?"ex : gants nitrile, demi-masque A2P3":cType==="epc"?"ex : captage localisé sur le poste":cType==="duree"?"ex : 20 min, 2 fois par jour":"Note libre…")+'" style="width:100%;margin-top:6px;padding:10px;border:1px solid var(--bord);border-radius:8px;font-size:16px">'+esc(cText)+'</textarea>';
  h += '<div class="row" style="margin:6px 0 0"><button class="btn big'+(cVoice?' rec':'')+'" data-cact="mic" type="button">'+(cVoice?'⏹ Stop':'🎤 Dicter')+'</button><button class="btn pri big" data-cact="add" type="button" style="flex:1">Ajouter au GEH</button></div><div id="cMsg" class="legend" style="margin:6px 0 0"></div>';
  /* journal */
  const notes = g.notes||[], by = tid => notes.filter(n=>(n.tid||"")===tid);
  const li = n => '<div class="cn"><span class="tag">'+esc(C_LAB[n.type]||n.type)+'</span><textarea data-cn="'+n.id+'" rows="1">'+esc(n.txt)+'</textarea><button class="btn sm" data-cdel="'+n.id+'" type="button" title="Supprimer">✕</button></div>';
  h += '<div class="clog"><h3>Notes du GEH ('+notes.length+')</h3>'+(by("").map(li).join("")||'<div class="legend">Aucune note sur le GEH.</div>');
  tasks.forEach(k=>{ const l = k.ids.flatMap(by); if(l.length || true) h += '<div class="ctask"><b>'+esc(k.t||"(tâche sans nom)")+'</b>'+(k.duree||k.freq?' <small>'+esc([k.duree,k.freq].filter(Boolean).join(" · "))+'</small>':'')+(l.map(li).join("")||'')+'</div>'; });
  h += '</div><div class="row"><button class="btn sm" data-cact="copy" type="button">📋 Copier tout le carnet</button><span id="cCopy" class="legend" style="margin:0"></span></div>';
  host.innerHTML = h;
}
function cApply(g, type, txt, tid){
  const k = tid ? g.taches.find(t=>t.id===tid) : null, addTok = (f,v)=>{ v.split(/\s*[,;]\s*/).filter(Boolean).forEach(w=>{ if(!toks(g[f]).some(y=>norm(y)===norm(w))) g[f] = (g[f]?g[f]+", ":"")+w; }); };
  const com = v => { g.com = (g.com?g.com+"\n":"")+v; }; let info = "";
  if(type==="remarque") com(txt);
  else if(type==="epi") addTok("epi", txt);
  else if(type==="epc") addTok("epc", txt);
  else if(type==="tache"){ const n = {id:uid(), t:txt, duree:"", freq:"", prod:""}; g.taches.push(n); cAtt = n.id; info = "Tâche ajoutée : les notes suivantes s'y rattachent."; }
  else if(type==="polluant"){
    if(k) k.prod = (k.prod?k.prod+", ":"")+txt; else com("Produits / polluants : "+txt);
    const found = []; txt.split(/\s*[,;]\s*|\s+et\s+/).forEach(w=>{ const n = norm(cleanName(w)); if(n.length<4) return; const b = BASE.find(b=>b._n===n) || BASE.find(b=>b._n.length>5 && n.includes(b._n)); if(b){ const u = ensureAgent({ref:b.ref}); if(!(g.agents||[]).includes(u)) g.agents.push(u); found.push(cleanName(b.agent)); } });
    if(found.length) info = "Polluant(s) rattaché(s) : "+found.join(" ; ");
  }
  else if(type==="duree"){ if(k){ if(/\d\s*(x|fois)|par\s+(jour|sem|mois|an)|quotidien|hebdo|mensuel|annuel/i.test(txt)) k.freq = (k.freq?k.freq+" ; ":"")+txt; else k.duree = (k.duree?k.duree+" ; ":"")+txt; } else com("Durée / fréquence : "+txt); }
  return info;
}
function cAddNote(){
  const x = curGeh(); if(!x) return; let txt = cText.trim(), type = cType; if(!txt) return;
  for(const [k,re] of Object.entries(C_KEY)){ if(re.test(txt)){ type = k; txt = txt.replace(re,"").replace(/^\s*[:,\-–]?\s*/,""); break; } }
  txt = txt.replace(/^./, c=>c.toUpperCase()); if(!txt) return;
  const g = x.g; g.notes = g.notes||[]; const tid = (type==="polluant"||type==="duree") ? cAtt : "";
  const info = cApply(g, type, txt, tid); g.notes.push({id:uid(), type, txt, tid: type==="tache" ? cAtt : tid, applied:true});
  cText = ""; persist(); renderCarnet(); renderTerrain_after(); if(info){ const m = $("#cMsg"); if(m) m.textContent = info; }
}
function renderTerrain_after(){ updTerrainSel(); tCount(); }
function cVoiceStart(onText, btnUpdate){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return "Dictée indisponible dans ce navigateur : utilise le micro du clavier (icône 🎤 du clavier iPhone), il fonctionne dans tous les champs.";
  const r = new SR(); r.lang = "fr-FR"; r.interimResults = false; r.continuous = true; let stopped = false;
  r.onresult = ev => { let t = ""; for(let i=ev.resultIndex;i<ev.results.length;i++) if(ev.results[i].isFinal) t += ev.results[i][0].transcript; if(t.trim()) onText(t.trim()); };
  r.onerror = ev => { if(ev.error==="not-allowed"||ev.error==="service-not-allowed"){ stopped = true; btnUpdate("Micro refusé : autorise-le dans les réglages du navigateur, ou utilise le micro du clavier."); } };
  r.onend = () => { if(!stopped && cVoice===r){ try{ r.start(); }catch(e){} } else { if(cVoice===r) cVoice = null; btnUpdate(); } };
  r.stop2 = () => { stopped = true; try{ r.stop(); }catch(e){} cVoice = null; };
  try{ r.start(); }catch(e){ return "Impossible de démarrer le micro."; }
  cVoice = r; return "";
}
$("#tCarnet").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if(b.dataset.cg){ tGeh = b.dataset.cg; cAtt = ""; resetTf(); renderTerrain(); return; }
  if(b.dataset.ctype){ cType = b.dataset.ctype; renderCarnet(); return; }
  if(b.dataset.cdel){ const x = curGeh(); if(x){ x.g.notes = x.g.notes.filter(n=>n.id!==b.dataset.cdel); persist(); renderCarnet(); } return; }
  const a = b.dataset.cact; if(!a) return;
  if(a==="newgeh"){ const i = $("#cNewGeh"), nm = i.value.trim(); let at = S.ateliers[S.ateliers.length-1]; if(!at){ at = {id:uid(), nom:"", gehs:[]}; S.ateliers.push(at); } const g = newGeh(nm); g.notes = []; at.gehs.push(g); tGeh = g.id; cAtt = ""; persist(); renderTerrain(); renderSel && 0; }
  else if(a==="add") cAddNote();
  else if(a==="mic"){ if(cVoice){ cVoice.stop2(); renderCarnet(); return; }
    const err = cVoiceStart(t=>{ cText = (cText.trim()?cText.trim()+" ":"")+t; const ta = $("#cText"); if(ta) ta.value = cText; }, msg=>{ renderCarnet(); const m = $("#cMsg"); if(m && msg) m.textContent = msg; });
    renderCarnet(); const m = $("#cMsg"); if(m) m.textContent = err || "Écoute… parle, puis touche Stop et Ajouter."; }
  else if(a==="copy"){ const txt = allGeh().map((o,i)=>{ const g = o.g, n = g.notes||[]; if(!n.length) return ""; const L = ["GEH "+(i+1)+" – "+(g.des||"")+" ["+(o.a.nom||"")+"]"]; n.filter(z=>!z.tid).forEach(z=>L.push("  - "+(C_LAB[z.type]||z.type)+" : "+z.txt)); g.taches.forEach(k=>{ const l = n.filter(z=>z.tid===k.id); if(l.length||true) { L.push("  Tâche : "+(k.t||"")); l.forEach(z=>L.push("    - "+(C_LAB[z.type]||z.type)+" : "+z.txt)); } }); return L.join("\n"); }).filter(Boolean).join("\n\n");
    const m = $("#cCopy"); (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>{ m.textContent = "✔ Copié"; }, ()=>{ m.textContent = "Copie bloquée par le navigateur."; }); }
});
$("#tCarnet").addEventListener("input", e=>{ const t = e.target; if(t.id==="cText") cText = t.value; else if(t.dataset.cn){ const x = curGeh(); const n = x && x.g.notes.find(z=>z.id===t.dataset.cn); if(n){ n.txt = t.value; persist(); } } });
$("#tCarnet").addEventListener("change", e=>{ if(e.target.id==="cAtt") cAtt = e.target.value; });
$("#tCarnet").addEventListener("keydown", e=>{ if(e.target.id==="cNewGeh" && e.key==="Enter"){ e.preventDefault(); $("#tCarnet").querySelector('[data-cact="newgeh"]').click(); } });
let nVoice = null;
$("#tNoteMic").onclick = ()=>{ const b = $("#tNoteMic"); if(nVoice){ nVoice.stop2(); nVoice = null; b.textContent = "🎤"; return; }
  const prev = cVoice; const err = cVoiceStart(t=>{ const i = $("#tNote"); i.value = (i.value.trim()?i.value.trim()+" ":"")+t; }, msg=>{ b.textContent = "🎤"; nVoice = null; if(msg) alert(msg); });
  if(err){ alert(err); return; } nVoice = cVoice; b.textContent = "⏹"; };
$("#tNoteAdd").onclick = ()=>{ const i = $("#tNote"), v = i.value.trim(); if(!v) return; const t = new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}); S.ent.notes = (S.ent.notes?S.ent.notes+"\n":"")+"["+t+"] "+v; i.value = ""; persist(); syncEnt(); };
$("#p-terrain").addEventListener("input", e=>{
  const t = e.target, x = curGeh();
  if(t.dataset.tf && x){ const f = t.dataset.tf; if(f==="atelier") return; x.g[f] = t.value; persist(); if(f==="des") updTerrainSel(); return; }
  if(t.dataset.tt){ const f = t.dataset.tt; tf[f] = t.value; if(f==="q"){ const r = $("#tRes"); r.innerHTML = tResults(); r.classList.toggle("hide", !r.innerHTML); }
    if(f==="qf"){ const r = $("#tResF"); r.innerHTML = tFres(); r.classList.toggle("hide", !r.innerHTML); } }
});
$("#p-terrain").addEventListener("change", e=>{
  const t = e.target, x = curGeh(); if(!x || t.dataset.tf!=="atelier") return; const nm = t.value.trim(); if(norm(nm)===norm(x.a.nom)) return;
  let tgt = S.ateliers.find(a=>norm(a.nom)===norm(nm)); const lone = x.a.gehs.length===1 && x.a.gehs[0]===x.g;
  if(!tgt && lone){ x.a.nom = nm; persist(); renderTerrain(); return; }
  if(!tgt){ tgt = {id:uid(), nom:nm, gehs:[]}; S.ateliers.push(tgt); }
  x.a.gehs.splice(x.gi,1); tgt.gehs.push(x.g); cleanEmptyAteliers(); persist(); renderTerrain();
});
$("#p-terrain").addEventListener("click", e=>{
  const x = curGeh(); const c = e.target.closest("[data-chip]");
  if(c && x){ const f = c.dataset.chip; x.g[f] = toggleTok(x.g[f], c.dataset.v); persist(); renderTerrain(); return; }
  const b = e.target.closest("[data-act]"); if(!b || !x) return; const d = b.dataset, g = x.g;
  if(d.act==="tdur"){ tf.duree = tf.duree===d.v ? "" : d.v; renderTerrain(); }
  else if(d.act==="tfreq"){ tf.freq = tf.freq===d.v ? "" : d.v; renderTerrain(); }
  else if(d.act==="tag"){ const u = ensureAgent({uid:d.uid, ref:d.ref!=null?+d.ref:null}); if(!tf.ag.includes(u)) tf.ag.push(u); tf.q = ""; persist(); renderTerrain(); renderSel(); renderList(); }
  else if(d.act==="tfree"){ const u = ensureAgent({name:d.name}); if(!tf.ag.includes(u)) tf.ag.push(u); tf.q = ""; persist(); renderTerrain(); renderSel(); renderList(); }
  else if(d.act==="fprod"){ const P = S.fds[+d.i]; if(P){ tf.prod = (tf.prod.trim() ? tf.prod.trim()+", " : "")+P.nom; P.subs.forEach(r=>{ const u = ensureAgentRec(r); if(!tf.ag.includes(u)) tf.ag.push(u); }); tf.qf = ""; persist(); renderTerrain(); renderSel(); renderList(); } }
  else if(d.act==="tunag"){ tf.ag = tf.ag.filter(u=>u!==d.u); renderTerrain(); }
  else if(d.act==="tsave"){
    const names = tf.ag.map(agName).filter(Boolean), p = tf.prod.trim();
    if(!tf.t.trim() && !p && !names.length) return alert("Renseigne au moins la tâche, un produit ou un polluant.");
    const k = {id: tf.edit!=null ? g.taches[tf.edit].id : uid(), t:tf.t.trim(), duree:tf.duree, freq:tf.freq.trim(), prod: p + (names.length ? (p?"\n":"")+names.join(", ") : ""), ag: tf.ag.slice()};
    if(tf.edit!=null) g.taches[tf.edit] = k; else g.taches.push(k);
    g.agents = [...new Set((g.agents||[]).concat(tf.ag))]; resetTf(); persist(); renderTerrain(); renderSel();
  }
  else if(d.act==="tcancel"){ resetTf(); renderTerrain(); }
  else if(d.act==="tedit"){ const k = g.taches[+d.i]; tf = {t:k.t||"", duree:k.duree||"", freq:k.freq||"", prod: k.ag&&k.ag.length ? String(k.prod||"").split("\n")[0] : (k.prod||""), ag:(k.ag||[]).slice(), edit:+d.i, q:""}; renderTerrain(); window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"}); }
  else if(d.act==="tdelg"){ const set = new Set(d.ii.split(",").map(Number)); if(set.size>1 && !confirm("Supprimer cette tâche et ses "+set.size+" lignes fusionnées ?")) return; g.taches = g.taches.filter((_,i)=>!set.has(i)); persist(); renderTerrain(); }
  else if(d.act==="tdup"){ const k = JSON.parse(JSON.stringify(g.taches[+d.i])); k.id = uid(); g.taches.splice(+d.i+1,0,k); persist(); renderTerrain(); }
  else if(d.act==="tdel"){ g.taches.splice(+d.i,1); if(tf.edit!=null) resetTf(); persist(); renderTerrain(); }
});
