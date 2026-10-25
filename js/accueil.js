"use strict";
/* ================= Accueil « missions » et parcours en 4 étapes (comme les applis VLEP et Aération) ================= */
/* Chaque mission (un dossier enregistré dans ce navigateur) s'ouvre sur 4 étapes ; chaque étape regroupe deux écrans. */
const ETAPES = [
  {n:1, titre:"Documents", sous:"import, identification, agents", p:["ent","agents"], lbl:{ent:"Documents & identification", agents:"Agents & accréditation"}},
  {n:2, titre:"GEH", sous:"visite, GEH et tâches", p:["terrain","geh"], lbl:{terrain:"Visite sur site", geh:"GEH & tâches"}},
  {n:3, titre:"Plan", sous:"plan et justifications", p:["plan","just"], lbl:{plan:"Plan d’échantillonnage", just:"Justifications"}},
  {n:4, titre:"Rapport", sous:"contrôle, Word, devis", p:["export","devis"], lbl:{export:"Contrôle & export", devis:"Faisabilité & devis"}}
];
const etapeDe = p => ETAPES.find(e=>e.p.includes(p)) || ETAPES[0];
const ECRAN_ETAPE = {};   /* dernier écran ouvert dans chaque étape */
let ACC_FILTRE = "", ACC_ETAPE = 0;

/* Résumé d'une mission enregistrée, lu sans l'ouvrir */
function resumeMission(id){
  let o = null; try{ o = JSON.parse(localStorage.getItem(dkey(id))||"null"); }catch(e){}
  if(!o) return {nom:"", affaire:"", geh:0, agents:0, lignes:0, just:0, etape:1, pct:0, vide:true};
  const e = o.ent||{}, geh = (o.ateliers||[]).reduce((n,a)=>n+(a.gehs||[]).length, 0), agents = (o.agents||[]).length,
        lignes = (o.plan||[]).filter(r=>r.kind!=="sec").length, just = (o.just||[]).filter(j=>j.on).length;
  const jalons = [!!String(e.nom||"").trim(), agents>0, geh>0, lignes>0, just>0];
  return {nom:String(e.nom||"").trim(), affaire:String(e.affaire||"").trim(), geh, agents, lignes, just,
    etape: lignes ? (just ? 4 : 3) : (geh ? 2 : 1), pct: Math.round(100*jalons.filter(Boolean).length/jalons.length), vide: !jalons.some(Boolean)};
}
function missions(){ return DOS.list.slice().sort((a,b)=>b.upd-a.upd).map(d=>Object.assign({id:d.id, upd:d.upd}, resumeMission(d.id))); }

function carteMission(m){
  const E = ETAPES[m.etape-1];
  return '<button class="acc-mission" data-mission="'+m.id+'"><div class="acc-m-tete"><b>'+esc(m.nom||"Mission sans nom")+'</b>'+(m.affaire ? '<span class="acc-m-aff">'+esc(m.affaire)+'</span>' : '')+'</div>'+
    '<div class="acc-m-info">Étape '+String(E.n).padStart(2,"0")+' · '+esc(E.titre)+' — '+m.geh+' GEH · '+m.agents+' agent'+(m.agents>1?"s":"")+' · '+m.lignes+' ligne'+(m.lignes>1?"s":"")+' de plan · modifiée le '+esc(fmtDT(m.upd))+'</div>'+
    '<div class="acc-barre"><i style="width:'+m.pct+'%"></i></div></button>';
}
function renderAccueil(){
  const W = $("#accueil"); if(!W) return;
  const L = missions().filter(m=>!m.vide || m.id===DOS.cur), cur = L.find(m=>m.id===DOS.cur && !m.vide) || L.find(m=>!m.vide);
  const q = norm(ACC_FILTRE), vue = L.filter(m=>!m.vide && (!q || norm(m.nom+" "+m.affaire).includes(q)) && (!ACC_ETAPE || m.etape===ACC_ETAPE));
  const nb = n => L.filter(m=>!m.vide && m.etape===n).length;
  W.innerHTML =
    '<div class="acc-hero"><div><div class="acc-kicker">Contrôle des VLEP</div><h1>Stratégie de prélèvement</h1><div class="acc-sous">'+(L.filter(m=>!m.vide).length ? L.filter(m=>!m.vide).length+' mission(s) sur ce poste' : 'Aucune mission en cours')+'</div></div></div>'+
    (cur ? '<div class="acc-reprendre"><div class="acc-kicker">Reprendre</div><div class="acc-r-titre">'+esc(cur.nom||"Mission sans nom")+(cur.affaire ? ' · '+esc(cur.affaire) : '')+'</div>'+
      '<div class="acc-m-info">Étape '+String(cur.etape).padStart(2,"0")+' · '+esc(ETAPES[cur.etape-1].titre)+' — avancement '+cur.pct+' %</div><div class="acc-barre"><i style="width:'+cur.pct+'%"></i></div>'+
      '<div class="acc-r-btns"><button class="btn pri" data-mission="'+cur.id+'">Reprendre</button></div></div>' : '')+
    '<div class="acc-etapes">'+ETAPES.map(e=>'<button class="acc-etape'+(ACC_ETAPE===e.n?' on':'')+'" data-acc-etape="'+e.n+'"><em>'+String(e.n).padStart(2,"0")+'</em><span>'+esc(e.titre)+'</span><small>'+nb(e.n)+' mission'+(nb(e.n)>1?"s":"")+'</small></button>').join("")+'</div>'+
    '<div class="acc-actions"><button class="btn pri" id="accNew">+ Nouvelle mission</button><button class="btn" id="accOpen">Importer une mission (.json)</button></div>'+
    '<input id="accQ" class="acc-q" placeholder="Rechercher une mission (client, n° d’affaire)" value="'+esc(ACC_FILTRE)+'">'+
    (ACC_ETAPE ? '<div class="legend" style="margin:0 0 6px">Missions à l’étape '+String(ACC_ETAPE).padStart(2,"0")+' · '+esc(ETAPES[ACC_ETAPE-1].titre)+' — <a href="#" id="accTout">toutes les missions</a></div>' : '')+
    '<div class="acc-liste">'+(vue.length ? vue.map(carteMission).join("") : '<div class="empty">'+(L.some(m=>!m.vide) ? 'Aucune mission ne correspond.' : 'Crée ta première mission, ou dépose directement les documents du client (Seirich, inventaire, devis…) après « Nouvelle mission ».')+'</div>')+'</div>';
  $("#accNew").onclick = ()=>{ newDossier(); ouvrirMission(null, "ent"); };
  $("#accOpen").onclick = ()=>$("#bOpen").click();
  const qi = $("#accQ"); qi.oninput = ()=>{ ACC_FILTRE = qi.value; const p = qi.selectionStart; renderAccueil(); const n = $("#accQ"); n.focus(); n.setSelectionRange(p, p); };
  if($("#accTout")) $("#accTout").onclick = e=>{ e.preventDefault(); ACC_ETAPE = 0; renderAccueil(); };
}
function ouvrirAccueil(){ persist(); document.body.classList.add("vue-accueil"); renderAccueil(); window.scrollTo(0,0); }
function ouvrirMission(id, p){
  if(id && id!==DOS.cur) switchDossier(id);
  const r = resumeMission(DOS.cur), E = ETAPES[r.etape-1];
  show(p || ECRAN_ETAPE[E.n] || E.p[0]); window.scrollTo(0,0);
}
document.addEventListener("click", e=>{
  const m = e.target.closest("[data-mission]"); if(m){ ouvrirMission(m.dataset.mission); return; }
  const a = e.target.closest("[data-acc-etape]"); if(a){ const n = +a.dataset.accEtape; ACC_ETAPE = ACC_ETAPE===n ? 0 : n; renderAccueil(); return; }
  const s = e.target.closest("[data-etape]"); if(s){ const E = ETAPES[+s.dataset.etape-1]; show(ECRAN_ETAPE[E.n] || E.p[0]); window.scrollTo(0,0); }
});

/* En-tête et barre d'étapes de la mission ouverte (appelé par show) */
function majEtapes(p){
  const E = etapeDe(p); ECRAN_ETAPE[E.n] = p;
  const reste = {}; try{ manques().forEach(x=>{ const n = etapeDe(x.p).n; reste[n] = (reste[n]||0)+1; }); }catch(e){}
  $$("#etapes [data-etape]").forEach(b=>{ const n = +b.dataset.etape; b.classList.toggle("on", n===E.n); const s = b.querySelector("small"); if(s) s.textContent = reste[n] ? reste[n]+" à compléter" : ETAPES[n-1].sous; });
  $$("#tabs .tab[data-p]").forEach(t=>{ const dans = E.p.includes(t.dataset.p); t.classList.toggle("hors", !dans); if(dans) t.textContent = E.lbl[t.dataset.p]; });
  const T = $("#mTitre"); if(T) T.textContent = String(S.ent.nom||"").trim() || "Nouvelle mission";
  const st = $("#mSous"); if(st) st.textContent = [String(S.ent.affaire||"").trim(), "Étape "+String(E.n).padStart(2,"0")+" · "+E.titre].filter(Boolean).join(" · ");
}
