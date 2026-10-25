"use strict";
/* ================= État & sauvegarde ================= */
const KEY = "vlep-strategie-v1";
const uid = () => Math.random().toString(36).slice(2,9);
const newMid = () => "m"+Date.now().toString(36)+uid();
const DEF_KEYS = ["redacteur","valideur","agence","accred"], DKEY = "vlep-defaults-v1";
const DEF0 = {redacteur:"Quentin THOMAS", valideur:"", agence:"Agence Environnement Grand est Mesures\nParc des Varimonts\n10, route de Thionville\n57140 Woippy", accred:"1-7125"};
function getDefaults(){ try{ return Object.assign({}, DEF0, JSON.parse(localStorage.getItem(DKEY)||"{}")); }catch(e){ return Object.assign({}, DEF0); } }
const blank = () => ({v:1, ent:Object.assign({nom:"",adresse:"",cpville:"",naf:"",siret:"",effectif:"",contact:"",activite:"",notes:"",affaire:"",dateMission:"",dateEdition:"",intervenant:""}, getDefaults()), agents:[], ateliers:[], plan:[], thr:8, cand:[], fds:[], just:[], mat:{}, matNb:{}, archGeh:[], csd:{}, mid:newMid()});
function normalize(o){
  const b = blank(), r = Object.assign(b, o, {ent:Object.assign(blank().ent,(o&&o.ent)||{})});
  r.agents = (r.agents||[]).map(a=>a.uid?a:Object.assign({uid:uid()},a));
  r.ateliers = r.ateliers||[]; r.plan = r.plan||[]; r.cand = r.cand||[]; r.fds = r.fds||[]; r.just = r.just||[]; r.mat = r.mat||{}; r.matNb = r.matNb||{}; r.archGeh = r.archGeh||[]; r.csd = r.csd||{}; r.mid = r.mid||newMid(); r.archGeh.forEach(o=>{ o.geh.taches = o.geh.taches||[]; o.geh.exclus = o.geh.exclus||[]; o.geh.notes = o.geh.notes||[]; o.geh.agents = o.geh.agents||[]; o.geh.srcs = o.geh.srcs||[]; });
  r.ateliers.forEach(a=>(a.gehs||(a.gehs=[])).forEach(g=>{ g.taches = g.taches||[]; g.exclus = g.exclus||[]; g.notes = g.notes||[]; g.agents = g.agents||[]; g.srcs = g.srcs||[]; ["orga","epc","epi","com"].forEach(k=>{ if(g[k]==null) g[k]=""; }); }));
  return r;
}
let S = blank();
let storageOK = true;
const DIDX = "vlep-dossiers-v1", dkey = id => "vlep-d-"+id; let DOS = {cur:"", list:[]};
function dosSave(){ try{ localStorage.setItem(DIDX, JSON.stringify(DOS)); }catch(e){} }
function renderDSel(){ const el = $("#dSel"); if(!el) return; el.innerHTML = DOS.list.slice().sort((a,b)=>b.upd-a.upd).map(d=>'<option value="'+d.id+'"'+(d.id===DOS.cur?' selected':'')+'>'+esc(d.name||"Nouveau dossier")+'</option>').join(""); }
const bkKey = () => "vlep-bk-"+S.mid;
const prevKey = id => dkey(id)+"-prev";
const fmtDT = t => new Date(t).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
function bkText(){ let bk = 0; try{ bk = +localStorage.getItem(bkKey())||0; }catch(e){} return bk ? "dernier export fichier : "+fmtDT(bk) : "⚠ jamais exporté en fichier"; }
function showSaveState(){
  const el = $("#saveState"); if(!el) return;
  el.textContent = "Sauvegardé automatiquement · "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+" · "+bkText();
  let hp = false; try{ hp = !!localStorage.getItem(prevKey(DOS.cur)); }catch(e){} const b = $("#bPrev"); if(b) b.classList.toggle("hide", !hp);
  if(typeof tCount==="function" && $("#tCount")) tCount();
}
function bkStamp(){ try{ localStorage.setItem(bkKey(), String(Date.now())); }catch(e){} showSaveState(); }
function persist(){
  try{ const js = JSON.stringify(S), k = dkey(DOS.cur), d = DOS.list.find(x=>x.id===DOS.cur);
    if(localStorage.getItem(k)!==js){ localStorage.setItem(k, js); if(d) d.upd = Date.now(); }
    if(d){ const nm = (S.ent.nom||"").trim(); d.mid = S.mid; if(d.name!==nm){ d.name = nm; renderDSel(); } } dosSave(); showSaveState(); }
  catch(e){ storageOK=false; $("#saveState").textContent = "⚠ Sauvegarde auto indisponible — utilise « Enregistrer le projet »"; }
}
function restore(){
  try{ DOS = JSON.parse(localStorage.getItem(DIDX)||"null") || {cur:"",list:[]}; }catch(e){ DOS = {cur:"",list:[]}; }
  if(!DOS.list.length){ /* migration depuis l'ancien enregistrement unique */
    const id = uid(); let old = null; try{ old = localStorage.getItem(KEY); }catch(e){}
    DOS = {cur:id, list:[{id, name:"", upd:Date.now()}]}; if(old){ try{ localStorage.setItem(dkey(id), old); }catch(e){} } dosSave(); }
  if(!DOS.list.some(d=>d.id===DOS.cur)) DOS.cur = DOS.list[0].id;
  try{ const r = localStorage.getItem(dkey(DOS.cur)); if(r){ const o = JSON.parse(r); if(o&&o.v===1) S = normalize(o); } }catch(e){ storageOK=false; }
}
function resetUI(){ tGeh = null; resetTf(); selG.clear(); bindEnt(); renderSel(); renderList(); renderDSel(); }
function newDossier(state){ persist(); const id = uid(); DOS.list.push({id, name:"", upd:Date.now()}); DOS.cur = id; S = state ? normalize(state) : blank(); resetUI(); persist(); }
function switchDossier(id){ if(id===DOS.cur) return; persist(); let o = null; try{ o = JSON.parse(localStorage.getItem(dkey(id))); }catch(e){} DOS.cur = id; S = o && o.v===1 ? normalize(o) : blank(); resetUI(); persist(); show(document.body.classList.contains("fieldmode") ? "terrain" : "ent"); }
function download(blob, name){
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
const safe = s => String(s||"projet").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_|_$/g,"") || "projet";
const today = () => new Date().toISOString().slice(0,10);

/* ================= Onglets ================= */
function show(p){
  document.body.classList.remove("vue-accueil");
  $$("#tabs .tab[data-p]").forEach(t=>t.classList.toggle("on", t.dataset.p===p));
  ["ent","terrain","agents","geh","plan","just","devis","export"].forEach(x=>$("#p-"+x).classList.toggle("hide", x!==p));
  syncEnt();
  if(p==="terrain") renderTerrain();
  if(p==="agents"){ renderList(); renderCand(); }
  if(p==="geh") renderGeh();
  if(p==="plan") renderPlan();
  if(p==="just") renderJust();
  if(p==="devis") renderDevis();
  if(p==="export"){ /* tant qu'il n'y a pas de plan, la liste de ce qui manque ; ensuite le contrôle « Prêt à envoyer », qui la reprend */
    const avecPlan = typeof renderEnvoi==="function" && S.plan.some(r=>r.kind!=="sec");
    $("#manques").innerHTML = avecPlan ? "" : manquesHtml(); $("#envoi").classList.toggle("hide", !avecPlan); if(avecPlan) renderEnvoi(); $("#referentiel").innerHTML = referentielHtml(); renderRelecture(); }
  if(typeof majEtapes==="function") majEtapes(p);
}
$("#tabs").addEventListener("click", e=>{ const t=e.target.closest(".tab[data-p]"); if(t) show(t.dataset.p); });
