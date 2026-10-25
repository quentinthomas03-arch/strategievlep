"use strict";
/* ================= Import Seirich ================= */
function sTable(sheets, name, key){
  const R = sheets[name]; if(!R) return null;
  const hi = R.findIndex((r,i)=> i<15 && r.some(c=>norm(c)===norm(key))); if(hi<0) return null;
  const h = Array.from(R[hi], c=>norm(c));
  const idxAll = label => { const l = norm(label), o = []; h.forEach((x,j)=>{ if(x===l) o.push(j); }); return o; };
  return {h, idxAll, rows: R.slice(hi+1).filter(r=>r.some(c=>c!=null && String(c).trim()!=="")),
    get:(r,label,nth)=>{ const j = idxAll(label)[nth||0]; return j==null ? "" : String(r[j]==null?"":r[j]).trim(); }};
}
function capFirst(t){ t = String(t||"").trim(); return t ? t.charAt(0).toUpperCase()+t.slice(1) : ""; }
function normFreq(f){
  f = String(f||"").trim(); if(!f) return "";
  if(/^tous les jours$/i.test(f)) return "Quotidienne";
  const m = /^(\S+)\s*[xX]\s*\/?\s*(.+)$/.exec(f); if(!m) return capFirst(f);
  let u = m[2].trim().toLowerCase(); u = u.replace(/^sem\.?$/,"semaine").replace(/^an(n[ée]e)?$/,"an").replace(/^jour.*$/,"jour").replace(/^mois$/,"mois");
  return m[1]+"x / "+u;
}
/* ---- dates de référence, fin d'activité / d'utilisation ---- */
const missionDate = () => { const s = String((S.ent&&S.ent.dateMission)||"").trim(); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(m) return new Date(+m[1],+m[2]-1,+m[3]); m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); if(m) return new Date(+m[3],+m[2]-1,+m[1]); const d = new Date(); d.setHours(0,0,0,0); return d; };
function pDate(v){ v = String(v==null?"":v).trim(); if(!v || v==="-") return null; let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v); if(m) return new Date(+m[3],+m[2]-1,+m[1]); m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v); if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  if(/^\d{5}(\.\d+)?$/.test(v)){ const d = new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); } return null; }
const fmtD = d => d ? String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear() : "";
const EXWHY = {"fin-zone":"zone en fin d'activité", "fin-tache":"tâche en fin d'activité", "fin-prod":"produit en fin d'utilisation", "fin-agent":"agent en fin de présence", "sans-expo":"sans exposition (aucun agent à VLEP/CMR, ou tâche sans produit)", "sans-compo":"composition inconnue (aucun agent à étudier identifié)"};
const DUST_RE = /poussi|farine|c[ée]r[ée]ales|sucre|cacao|lait en poudre/i;
/* équivalences : substance / composé du Seirich -> agent(s) de la base qui n'ont pas le même CAS (mélange d'isomères, famille de composés, base sans CAS) */
const CR6 = ["7778-50-9","7789-00-6","1333-82-0","7775-11-3","10588-01-9","7789-12-0","13530-68-2"], HG2 = ["7783-35-9","592-85-8","7487-94-7","21908-53-2","10045-94-0"];
const CAS_ALIAS = [
  {cas:["1330-20-7","108-38-3","106-42-3"], re:/xylene/, all:true},                      /* xylène (mélange) -> o-xylène + m+p-xylène */
  {cas:["7761-88-8"], re:/^argent composes solubles en ag/},                              /* nitrate d'argent */
  {cas:CR6, re:/^chrome vi et ses composes/},                                             /* composés du chrome VI */
  {cas:HG2, re:/^mercure et composes inorganiques bivalents/}                             /* composés inorganiques bivalents du mercure */
];
/* agents de la base pour un CAS : CAS identique, sinon équivalence, sinon (par le nom) */
function baseByCas(cas, nom){
  let r = cas ? BASE.filter(b=>b._c===cas) : [], al = false, all = false;
  if(!r.length && cas){ const a = CAS_ALIAS.find(x=>x.cas.includes(cas)); if(a){ const m = BASE.filter(b=>a.re.test(b._n)); r = a.all ? m : m.slice(0,1); al = r.length>0; all = !!a.all && r.length>1; } }
  if(!r.length && nom){ const n = norm(nom); r = BASE.filter(b=>b._n===n); al = r.length>0; }
  r = r.slice(); r.alias = al; r.all = all; return r;
}
function refsInfo(c){
  let r = baseByCas(c.cas, c.nom), al = r.alias, all = r.all;
  if(!r.length && !c.cas && DUST_RE.test(c.nom)) r = BASE.filter(b=>b._n.includes("poussieres inhalables sur filtre pvc"));
  return {refs:r.map(b=>b.ref), alias:al, all};
}
const refsOf = c => refsInfo(c).refs;
const qFmt = (v, u, suf) => { v = String(v==null?"":v).trim(); if(!v || v==="None") return ""; const n = parseFloat(v.replace(",",".")); return (isNaN(n) ? v : n.toLocaleString("fr-FR",{maximumFractionDigits:3}))+(u?" "+String(u).trim()+suf:""); };
const lineOf = p => norm(String(p||"").split("\n")[0]);

function parseSeirich(sh, dM){
  dM = dM || missionDate();
  const Z = sTable(sh,"Zones","Nom de la zone"), T = sTable(sh,"Tâches","Nom de la tâche"), PT = sTable(sh,"Produit dans une tâche","Nom du produit"),
        AT = sTable(sh,"Agent chimique dans une tâche","Nom de l'agent chimique émis"), C = sTable(sh,"Composition","Produit"),
        PZ = sTable(sh,"Produit dans une zone","Nom du produit"), AZ = sTable(sh,"Agent chimique dans une zone","Nom de l'agent chimique émis");
  if(!T) throw new Error("Feuille « Tâches » introuvable : ce n'est pas un export Seirich complet.");
  /* zones : unités de travail */
  const ent = {}, epcOf = {};
  const epcTok = v => { v = norm(v); const o = []; if(/ventilation generale/.test(v)) o.push("Ventilation générale"); if(/captage/.test(v) && !/absence de captage/.test(v)) o.push("Captage localisé"); if(/exterieur/.test(v)) o.push("Extérieur"); if(/hotte|sorbonne/.test(v)) o.push("Hotte / sorbonne"); if(/cabine/.test(v)) o.push("Cabine fermée"); return o; };
  const zEnd = [];
  if(Z) Z.rows.forEach(r=>{ const ty = norm(Z.get(r,"Type de la zone")), nm = Z.get(r,"Nom de la zone");
    if(/etablissement/.test(ty)){ ent.nom = nm.replace(/^[A-Z]{2,5}\s-\s/,""); const ad = Z.get(r,"Adresse"), cp = Z.get(r,"Code postal"), vi = Z.get(r,"Ville"); if(ad) ent.adresse = ad; if(cp||vi) ent.cpville = [cp,vi].filter(Boolean).join(" "); }
    if(ty==="poste de travail") epcOf[nm.trim()] = epcTok(Z.get(r,"Ventilation et éloignement"));
    const fin = pDate(Z.get(r,"Fin d'activité")); if(fin && fin<dM){ const par = Z.get(r,"Zones parentes"); zEnd.push({path:(par?par+" - ":"")+nm, d:fin}); } });
  const unites = {}; if(Z) Z.rows.forEach(r=>{ if(norm(Z.get(r,"Type de la zone"))==="unite de travail"){ const par = Z.get(r,"Zones parentes"), nom = Z.get(r,"Nom de la zone"); unites[(par?par+" - ":"")+nom] = nom; } });
  /* produits / agents présents par zone : fin d'utilisation, fin de présence */
  const pz = new Map(), pzN = new Map(), az = new Map();
  const addTo = (m, k, v) => { let l = m.get(k); if(!l){ l = []; m.set(k,l); } l.push(v); };
  if(PZ) PZ.rows.forEach(r=>{ const nom = PZ.get(r,"Nom du produit"), us = PZ.get(r,"Nom d'usage"), zn = PZ.get(r,"Nom de la zone"), zp = PZ.get(r,"Zones parentes"), fu = pDate(PZ.get(r,"Fin d'utilisation"));
    const v = {path:(zp?zp+" - ":"")+zn, zn:norm(zn), fu, q:qFmt(PZ.get(r,"Valeur"), PZ.get(r,"Unité"), "/an")}; addTo(pz, norm(nom)+"|"+norm(us), v); addTo(pzN, norm(nom), v); });
  if(AZ) AZ.rows.forEach(r=>{ const nom = AZ.get(r,"Nom de l'agent chimique émis"), zn = AZ.get(r,"Nom de la zone"), zp = AZ.get(r,"Zones parentes"), fp = pDate(AZ.get(r,"Fin de présence"));
    addTo(az, norm(nom), {path:(zp?zp+" - ":"")+zn, zn:norm(zn), fu:fp}); });
  /* date de fin retenue si TOUS les enregistrements applicables à la zone de la tâche sont terminés */
  const recsOf = (L, t) => { if(!L) return []; let m = L.filter(x=>x.path===t.full); if(!m.length) m = L.filter(x=>t.full.startsWith(x.path+" - ")); if(!m.length) m = L.filter(x=>x.zn===norm(t.poste)); return m; };
  const endOf = (L, t) => { const m = recsOf(L, t); if(!m.length) return null;
    return m.every(x=>x.fu && x.fu<dM) ? new Date(Math.max(...m.map(x=>+x.fu))) : null; };
  const pzOf = (nom, us) => pz.get(norm(nom)+"|"+norm(us)) || pzN.get(norm(nom));
  const prodEnd = (nom, us, t) => endOf(pzOf(nom, us), t);
  const qaOf = (nom, us, t) => { const m = recsOf(pzOf(nom, us), t).filter(x=>x.q); return m.length ? m[0].q : ""; };
  /* tâches */
  const tasks = T.rows.map(r=>{ const nom = T.get(r,"Nom de la tâche"), poste = T.get(r,"Nom du poste de travail"), par = T.get(r,"Zones parentes");
    const t = {nom, poste, par, key: nom+"||"+(par?par+" - ":"")+poste, full:(par?par+" - ":"")+poste, atelier: unites[par] || (par.split(" - ").pop()) || "Site", items:[], excl:[]};
    const zf = zEnd.find(z=>t.full===z.path || t.full.startsWith(z.path+" - ")), fin = pDate(T.get(r,"Fin d'activité"));
    t.ended = zf ? {why:"fin-zone", d:zf.d} : (fin && fin<dM ? {why:"fin-tache", d:fin} : null);
    return t; });
  /* Seirich sans tâches (produits rattachés aux seules zones) : une tâche « Utilisation des produits » par zone de travail ;
     les produits rangés au niveau de l'établissement (stock) ne sont rattachés à aucun poste et sont laissés de côté */
  const parZone = !tasks.length && !!PZ && PZ.rows.length>0, zTask = {}; let horsPoste = 0;
  const zoneTask = r => { const zn = PZ.get(r,"Nom de la zone"), zp = PZ.get(r,"Zones parentes"); if(!zn || !zp || zp==="-"){ horsPoste++; return null; }
    const full = zp+" - "+zn; if(zTask[full]) return zTask[full];
    const zf = zEnd.find(z=>full===z.path || full.startsWith(z.path+" - "));
    const t = zTask[full] = {nom:"Utilisation des produits", poste:zn, par:zp, key:"Utilisation des produits||"+full, full, atelier: unites[full] ? zn : (unites[zp] || zp.split(" - ").pop() || "Site"), items:[], excl:[], ended: zf ? {why:"fin-zone", d:zf.d} : null};
    tasks.push(t); return t; };
  if(parZone) PZ.rows.forEach(zoneTask);
  const byKey = {}, byName = {}; tasks.forEach(t=>{ byKey[t.key] = t; (byName[t.nom] = byName[t.nom]||[]).push(t); });
  const find = (nom, zp) => byKey[nom+"||"+zp] || ((byName[nom]||[]).length===1 ? byName[nom][0] : null);
  /* composition → substances par produit */
  const comp = {}; const cand = {}, csd = {};
  const csKey = x => x.cas || ("n:"+norm(x.nom));
  const numClean = v => { const n = parseFloat(String(v).replace(",",".")); return isNaN(n) ? String(v||"") : String(+n.toPrecision(6)); };
  /* VLEP / CMR : feuille Substances (fiable) — la feuille Composition n'est utilisée que pour produit -> substances */
  const SB = sTable(sh,"Substances","Nom de la substance"), subs = {}, subsN = {};
  if(SB){
    const v8 = SB.idxAll("VLEP 8H (valeur)"), vct = SB.idxAll("VLEP CT (valeur)"), n8 = SB.idxAll("VLEP 8H (nature)"), nct = SB.idxAll("VLEP CT (nature)");
    const cm = ["C (valeur 1)","C (valeur 2)","M (valeur 1)","M (valeur 2)","R (valeur 1)","R (valeur 2)"].map(l=>SB.idxAll(l)[0]).filter(j=>j!=null);
    SB.rows.forEach(r=>{
      const g = j => String(r[j]==null?"":r[j]).trim();
      const b8 = v8.findIndex(j=>g(j)!==""), bc = vct.findIndex(j=>g(j)!=="");
      const rec = {cas:SB.get(r,"Numéro CAS"), nom:SB.get(r,"Nom de la substance"),
        v8: b8>=0 ? numClean(g(v8[b8])) : "", vct: bc>=0 ? numClean(g(vct[bc])) : "",
        nat: b8>=0 ? g(n8[b8]) : (bc>=0 ? g(nct[bc]) : ""), nat8: b8>=0 ? g(n8[b8]) : "", natct: bc>=0 ? g(nct[bc]) : "", cmr:[...new Set(cm.map(g).filter(x=>/1[AB]/.test(x)))].join(", ")};
      if(rec.cas) subs[rec.cas] = rec; subsN[norm(rec.nom)] = rec;
    });
  }
  if(C){
    C.rows.forEach(r=>{
      const cas = C.get(r,"Numéro CAS"), nom = C.get(r,"Nom de la substance"), prod = C.get(r,"Produit"), usage = C.get(r,"Nom d'usage");
      const rec = (cas && subs[cas]) || subsN[norm(nom)] || {cas, nom, v8:"", vct:"", nat:"", cmr:""};
      [prod, usage].filter(Boolean).forEach(k=>{ (comp[norm(k)] = comp[norm(k)]||[]).push(rec); });
    });
  }
  const addCand = (rec, prod, geh) => {
    if(!rec.v8 && !rec.vct && !rec.cmr) return;
    const k = rec.cas || norm(rec.nom); const c = cand[k] = cand[k] || {cas:rec.cas, nom:rec.nom, v8:rec.v8, vct:rec.vct, nat:rec.nat, nat8:rec.nat8||"", natct:rec.natct||"", cmr:rec.cmr, prods:[], gehs:[]};
    if(prod && !c.prods.includes(prod)) c.prods.push(prod); if(geh && !c.gehs.includes(geh)) c.gehs.push(geh);
  };
  /* produits dans tâches : une ligne est écartée si la zone/tâche/le produit est terminé, ou si le produit n'a aucun agent à VLEP/CMR */
  let orphan = 0;
  const prodLine = (t, nom, usage, duree, freq, qj) => {
    const all = comp[norm(nom)] || comp[norm(usage)], sb = (all||[]).filter(x=>x.v8||x.vct||x.cmr);
    const lab = usage || nom, agList = [...new Set(sb.map(x=>x.nom.toLowerCase()))];
    const it = {prod: lab + (agList.length ? "\n"+agList.join(", ") : ""), duree: capFirst(duree), freq: normFreq(freq), qj, qa: qaOf(nom, usage, t), ck: sb.map(csKey)};
    let ex = t.ended; if(!ex){ const pe = prodEnd(nom, usage, t); if(pe) ex = {why:"fin-prod", d:pe}; }
    if(!ex && !sb.length) ex = {why: all ? "sans-expo" : "sans-compo"};   /* aucun agent à VLEP/CMR : composition connue (sans-expo) ou inconnue de Seirich (sans-compo) */
    if(ex){ it.ex = ex; it.cs = sb.map(x=>{ const k = csKey(x); csd[k] = x; return k; }); t.excl.push(it); }
    else { sb.forEach(x=>addCand(x, lab, t.poste)); t.items.push(it); }
  };
  if(PT) PT.rows.forEach(r=>{ const t = find(PT.get(r,"Nom de la tâche"), PT.get(r,"Zones parentes")); if(!t){ orphan++; return; }
    prodLine(t, PT.get(r,"Nom du produit"), PT.get(r,"Nom d'usage"), PT.get(r,"Temps d'exposition par inhalation"), PT.get(r,"Fréquence d'exposition"), qFmt(PT.get(r,"Valeur",0), PT.get(r,"Unité",0), "/j")); });
  if(parZone) PZ.rows.forEach(r=>{ const zn = PZ.get(r,"Nom de la zone"), zp = PZ.get(r,"Zones parentes"); const t = zn && zp && zp!=="-" ? zTask[zp+" - "+zn] : null; if(t) prodLine(t, PZ.get(r,"Nom du produit"), PZ.get(r,"Nom d'usage"), "", "", ""); });
  /* agents émis */
  if(AT) AT.rows.forEach(r=>{
    const nom = AT.get(r,"Nom de l'agent chimique émis"), tn = AT.get(r,"Nom de la tâche"), zp = AT.get(r,"Zones parentes");
    const t = find(tn, zp); if(!t){ orphan++; return; }
    const it = {prod: nom, em:1, duree: capFirst(AT.get(r,"Temps d'exposition par inhalation")), freq: normFreq(AT.get(r,"Fréquence d'exposition"))};
    let ex = t.ended; if(!ex){ const ae = endOf(az.get(norm(nom)), t); if(ae) ex = {why:"fin-agent", d:ae}; }
    if(ex){ const k = "e:"+norm(nom); csd[k] = {emis:true, nom}; it.ex = ex; it.cs = [k]; t.excl.push(it); }
    else { const k = "emis:"+norm(nom); const c = cand[k] = cand[k] || {cas:"", nom, v8:"", vct:"", nat:"", cmr:"", emis:true, prods:[], gehs:[]}; if(!c.gehs.includes(t.poste)) c.gehs.push(t.poste); t.items.push(it); }
  });
  /* ateliers / GEH */
  const ateliers = []; const postes = {};
  tasks.forEach(t=>{
    let a = ateliers.find(x=>x.nom===t.atelier); if(!a){ a = {id:uid(), nom:t.atelier, gehs:[]}; ateliers.push(a); }
    const pk = t.atelier+"||"+t.poste; let g = postes[pk];
    if(!g){ g = postes[pk] = {id:uid(), des:t.poste, eff:"", orga:"", epc:(epcOf[t.poste.trim()]||[]).join(", "), epi:"", com:"", taches:[], exclus:[], agents:[], srcs:[t.poste]}; a.gehs.push(g); }
    if(!t.items.length && !t.excl.length) t.excl.push({prod:"", duree:"", freq:"", ex: t.ended || {why:"sans-expo"}, cs:[]});   /* tâche sans aucun produit */
    t.items.forEach(it=>g.taches.push({id:uid(), t:t.nom, duree:it.duree, freq:it.freq, prod:it.prod, em:it.em||0, qj:it.qj||"", qa:it.qa||"", ck:it.ck||[]}));
    t.excl.forEach(it=>g.exclus.push({id:uid(), t:t.nom, duree:it.duree, freq:it.freq, prod:it.prod, em:it.em||0, why:it.ex.why, date:fmtD(it.ex.d), cs:it.cs||[], qj:it.qj||"", qa:it.qa||""}));
  });
  /* index pour retrouver les mêmes lignes dans un projet déjà commencé */
  const keptIdx = new Set(), exIdx = new Map(), qIdx = new Map(), st = {total:0, "fin-zone":0, "fin-tache":0, "fin-prod":0, "fin-agent":0, "sans-expo":0, "sans-compo":0};
  ateliers.forEach(a=>a.gehs.forEach(g=>{ const pk = norm(g.srcs[0]);
    g.taches.forEach(k=>{ const id = pk+"|"+norm(k.t)+"|"+lineOf(k.prod); keptIdx.add(id); if(k.qj||k.qa||(k.ck&&k.ck.length)) qIdx.set(id, {qj:k.qj, qa:k.qa, ck:k.ck}); });
    g.exclus.forEach(x=>{ st.total++; st[x.why]++; const id = pk+"|"+norm(x.t)+"|"+lineOf(x.prod); if(!exIdx.has(id)) exIdx.set(id, {why:x.why, date:x.date, cs:x.cs}); }); }));
  /* GEH sans aucune ligne retenue : écartés (restent récupérables) */
  const archGeh = [], kept = [];
  ateliers.forEach(a=>{ const ok = a.gehs.filter(g=>g.taches.length); a.gehs.filter(g=>!g.taches.length).forEach(g=>archGeh.push({atelier:a.nom, geh:g})); a.gehs = ok; if(ok.length) kept.push(a); });
  /* correspondance base (CAS) */
  const list = Object.values(cand).map(c=>{ const ri = refsInfo(c); c.refs = ri.refs; if(ri.alias) c.alias = true; if(ri.all) c.all = true; return c; });
  list.sort((a,b)=> (b.cmr?1:0)-(a.cmr?1:0) || (a.emis?1:0)-(b.emis?1:0) || norm(a.nom).localeCompare(norm(b.nom),"fr"));
  return {ateliers:kept, archGeh, csd, keptIdx, exIdx, qIdx, stats:st, dM, cand:list, nTasks:tasks.length, orphan, ent, parZone, horsPoste};
}
const HND = {}; function reg(id, fn){ HND[id] = fn; $("#"+id).addEventListener("change", fn); }
reg("fSeirich", async e=>{
  const f = e.target.files[0]; if(!f) return; const m = $("#impMsg");
  try{
    m.textContent = "Lecture…"; const SH = await readXlsx(await f.arrayBuffer()); const R = (SH["Tâches"] && SH["Zones"]) ? parseSeirich(SH, missionDate()) : parseInventaire(SH);
    if(S.ateliers.length && R.exIdx && confirm("Un projet est déjà en cours.\n\nOK = METTRE À JOUR : garde tes GEH, effectifs, EPI et notes, et retire les lignes terminées ou sans exposition (date de référence : "+fmtD(R.dM)+").\nAnnuler = autres options")){
      const u = applyExcl(R); persist(); renderGeh(); renderSel(); try{ renderCand(); }catch(_){}
      m.innerHTML = '<b>Projet mis à jour :</b> '+u.rows+' ligne(s) retirée(s) (date de référence '+fmtD(R.dM)+')'+(u.arch.length?', '+u.arch.length+' GEH écarté(s) : '+esc(u.arch.join(" ; ")):'')+'.'+(u.planRows?' <span class="warn">'+u.planRows+' ligne(s) du plan étaient rattachées à un GEH écarté : à revoir dans l\'onglet 5.</span>':'')+' La liste des agents détectés a été recalculée (onglet 3). Détail et réintégration : encart « Éléments exclus ».';
      e.target.value = ""; return; }
    if(S.ateliers.length && !confirm("Remplacer les ateliers, GEH et tâches existants par ceux du fichier importé ?")){ m.textContent = "Import annulé."; e.target.value=""; return; }
    if(R.ent){ Object.keys(R.ent).forEach(k=>{ if(!(S.ent[k]||"").trim()) S.ent[k] = R.ent[k]; }); syncEnt(); }
    S.ateliers = R.ateliers; S.cand = R.cand; S.archGeh = R.archGeh||[]; S.csd = R.csd||{}; S.plan.forEach(r=>{ if(r.gehId && r.gehId!=="__txt") r.gehId = ""; }); persist(); renderGeh();
    const nG = R.ateliers.reduce((n,a)=>n+a.gehs.length,0), nT = R.ateliers.reduce((n,a)=>a.gehs.reduce((m2,g)=>m2+g.taches.length,n),0);
    m.innerHTML = '<b>'+R.ateliers.length+' atelier(s), '+nG+' GEH, '+nT+' ligne(s) de tâche, '+R.cand.length+' agent(s) détecté(s).</b>'+(R.orphan?' '+R.orphan+' ligne(s) produit/agent non rattachée(s) à une tâche (ignorées).':'')+' Va dans l\'onglet 3 pour valider les agents.'+(R.parZone ? ' <span class="warn">Ce Seirich ne décrit aucune tâche : un GEH a été proposé par zone de travail ; tâches, durées et fréquences sont à compléter'+(R.horsPoste ? ' ('+R.horsPoste+' produit(s) rangé(s) au niveau de l\'établissement, sans poste, non repris)' : '')+'.</span>' : '')+exclMsg(R)+(R.sansGeh ? ' <span class="warn">Aucune colonne de poste ou de lieu dans « '+esc(R.feuille||"")+' » : substances reprises sans GEH, à définir à la visite.</span>' : "")+(()=>{ const n = manques().length; return n ? ' <button class="btn sm" data-goto="export">Voir ce qu’il reste à compléter ('+n+')</button>' : ""; })();
    if(typeof ouvrirPreparation==="function" && S.ateliers.length && !S.plan.length) setTimeout(()=>ouvrirPreparation("Import terminé : "+$("#impMsg").textContent.split(".")[0]+". Vérifie les propositions puis génère le plan."), 0);
  }catch(err){ m.textContent = "Échec de l'import : "+err.message; }
  e.target.value = "";
});

/* ---- éléments exclus (fin d'activité / d'utilisation, sans exposition) ---- */
function exclMsg(R){
  const st = R.stats; if(!st || !st.total) return "";
  const p = []; if(st["fin-zone"]) p.push(st["fin-zone"]+" : zone en fin d'activité"); if(st["fin-tache"]) p.push(st["fin-tache"]+" : tâche en fin d'activité"); if(st["fin-prod"]) p.push(st["fin-prod"]+" : produit en fin d'utilisation"); if(st["fin-agent"]) p.push(st["fin-agent"]+" : agent en fin de présence"); if(st["sans-expo"]) p.push(st["sans-expo"]+" : sans exposition (aucun agent à VLEP/CMR, ou tâche sans produit)"); if(st["sans-compo"]) p.push(st["sans-compo"]+" : composition inconnue (aucun agent à étudier identifié)");
  return '<div class="warn" style="margin-top:6px"><b>'+st.total+' ligne(s) exclue(s)</b> à la date de référence du '+fmtD(R.dM)+' (date de mission) : '+p.join(" · ")+'.'+((R.archGeh||[]).length ? '<br><b>'+R.archGeh.length+' GEH écarté(s)</b> (plus aucune ligne active) : '+esc(R.archGeh.map(o=>o.geh.des).join(" ; "))+'.' : '')+'<br>Rien n\'est perdu : encart « Éléments exclus » ci-dessous, bouton Réintégrer.</div>';
}
function candAddRec(rec, prod, geh){
  let c;
  if(rec.emis){ c = S.cand.find(x=>x.emis && norm(x.nom)===norm(rec.nom)); if(!c){ c = {cas:"",nom:rec.nom,v8:"",vct:"",nat:"",cmr:"",emis:true,prods:[],gehs:[]}; S.cand.push(c); } }
  else { if(!rec.v8 && !rec.vct && !rec.cmr) return; c = S.cand.find(x=>!x.emis && ((rec.cas && x.cas===rec.cas) || (!rec.cas && norm(x.nom)===norm(rec.nom)))); if(!c){ c = {cas:rec.cas, nom:rec.nom, v8:rec.v8, vct:rec.vct, nat:rec.nat, cmr:rec.cmr, prods:[], gehs:[]}; c.refs = refsOf(c); S.cand.push(c); } if(prod && !c.prods.includes(prod)) c.prods.push(prod); }
  if(geh && !c.gehs.includes(geh)) c.gehs.push(geh);
}
/* lignes d'un projet en cours qui sont terminées / sans exposition d'après un Seirich analysé */
function planExcl(R){
  const out = []; if(!R.exIdx) return out;
  S.ateliers.forEach(a=>a.gehs.forEach(g=>{ const keys = gehKeys(g).map(norm);
    g.taches.forEach(k=>{ const tt = norm(k.t), kk = lineOf(k.prod); let ex = null, kept = false;
      for(const pk of keys){ const id = pk+"|"+tt+"|"+kk; if(R.keptIdx.has(id)) kept = true; else if(!ex && R.exIdx.has(id)) ex = R.exIdx.get(id); }
      if(ex && !kept) out.push({g, k, ex}); }); }));
  return out;
}
function applyExcl(R){
  /* quantités (consommation quotidienne / annuelle) lues dans le Seirich, sur toutes les lignes du projet */
  if(R.qIdx) S.ateliers.forEach(a=>a.gehs.forEach(g=>{ const keys = gehKeys(g).map(norm); g.taches.forEach(k=>{ for(const pk of keys){ const q = R.qIdx.get(pk+"|"+norm(k.t)+"|"+lineOf(k.prod)); if(q){ k.qj = q.qj||""; k.qa = q.qa||""; k.ck = (q.ck||[]).slice(); break; } } }); }));
  const pl = planExcl(R), ids = new Map();
  pl.forEach(({g,k,ex})=>{ g.exclus = g.exclus||[]; g.exclus.push({id:k.id, t:k.t, duree:k.duree||"", freq:k.freq||"", prod:k.prod||"", em:k.em||0, why:ex.why, date:ex.date||"", cs:ex.cs||[], qj:k.qj||"", qa:k.qa||""}); if(!ids.has(g)) ids.set(g,new Set()); ids.get(g).add(k.id); });
  ids.forEach((s,g)=>{ g.taches = g.taches.filter(k=>!s.has(k.id)); });
  S.csd = Object.assign(S.csd||{}, R.csd||{});
  const moved = new Set(), names = []; S.archGeh = S.archGeh||[];
  S.ateliers.forEach(a=>{ a.gehs = a.gehs.filter(g=>{ if(g.taches.length || !(g.exclus||[]).length) return true; S.archGeh.push({atelier:a.nom, geh:g}); moved.add(g.id); names.push(g.des); return false; }); });
  let planRows = 0; if(moved.size){ planRows = S.plan.filter(r=>moved.has(r.gehId)).length; dropGehRefs(moved); selG.clear(); }
  cleanEmptyAteliers(); S.cand = R.cand;
  return {rows:pl.length, arch:names, planRows};
}
let EXG = [], exF = "all", exQ = "";
function exAll(){ const out = []; S.ateliers.forEach(a=>a.gehs.forEach(g=>(g.exclus||[]).forEach(x=>out.push({g, x, arch:null})))); (S.archGeh||[]).forEach((o,oi)=>(o.geh.exclus||[]).forEach(x=>out.push({g:o.geh, x, arch:oi}))); return out; }
function renderExcl(){
  const card = $("#exclCard"); if(!card) return; const all = exAll(), nA = (S.archGeh||[]).length;
  if(!all.length && !nA){ card.classList.add("hide"); return; } card.classList.remove("hide");
  $("#exclSum").textContent = "Éléments exclus (fin d'activité / d'utilisation, sans exposition) : "+all.length+" ligne(s)"+(nA?" · "+nA+" GEH écarté(s)":"");
  if(!card.open){ $("#exclWrap").innerHTML = ""; return; }
  const cnt = {}; all.forEach(o=>{ cnt[o.x.why] = (cnt[o.x.why]||0)+1; });
  const rows = all.filter(o=>(exF==="all"||o.x.why===exF) && (!exQ.trim() || norm(o.g.des+" "+o.x.t+" "+o.x.prod).includes(norm(exQ))));
  const m = new Map(); rows.forEach(o=>{ const key = o.g.id+"|"+o.x.t+"|"+o.x.why; let gr = m.get(key); if(!gr){ gr = {g:o.g, arch:o.arch, t:o.x.t, why:o.x.why, dates:new Set(), items:[]}; m.set(key, gr); } gr.items.push(o.x); if(o.x.date) gr.dates.add(o.x.date); });
  EXG = [...m.values()];
  let h = '<div class="legend" style="margin:6px 0">Ces lignes ne comptent pas dans la stratégie (GEH, plan, justifications, Word, Excel). Réintègre-les si besoin.</div>'+
    '<div class="row" style="margin:0 0 8px"><select id="exF" style="padding:5px 8px;border:1px solid var(--bord);border-radius:6px"><option value="all">Tous les motifs ('+all.length+')</option>'+Object.keys(EXWHY).filter(k=>cnt[k]).map(k=>'<option value="'+k+'"'+(exF===k?' selected':'')+'>'+esc(EXWHY[k])+' ('+cnt[k]+')</option>').join("")+'</select>'+
    '<input id="exQ" class="s" placeholder="Filtrer (GEH, tâche, produit)…" value="'+esc(exQ)+'"><button class="btn sm" data-rall="1" type="button">Tout réintégrer (liste affichée)</button></div>';
  h += '<table class="t"><thead><tr><th>GEH</th><th>Tâche</th><th>Motif</th><th>Lignes</th><th></th></tr></thead><tbody>'+
    EXG.slice(0,300).map((gr,i)=>{ const pn = gr.items.map(x=>String(x.prod||"").split("\n")[0]).filter(Boolean), d = [...gr.dates].slice(0,2).join(", ");
      return '<tr><td class="l">'+esc(gr.g.des||"")+(gr.arch!=null?' <span class="tag no">GEH écarté</span>':'')+'</td><td class="l">'+esc(gr.t||"(sans nom)")+'</td><td class="l">'+esc(EXWHY[gr.why]||gr.why)+(d?' ('+esc(d)+')':'')+'</td><td class="l">'+gr.items.length+(pn.length?' : '+esc(pn.slice(0,3).join(", "))+(pn.length>3?' …':''):'')+'</td><td><button class="btn sm" data-rg="'+i+'" type="button">Réintégrer</button></td></tr>'; }).join("")+'</tbody></table>'+
    (EXG.length>300 ? '<div class="legend">Affichage limité à 300 groupes : affine le filtre.</div>' : '')+(!EXG.length ? '<div class="legend">Aucune ligne pour ce filtre.</div>' : '');
  $("#exclWrap").innerHTML = h;
}
function restoreGroup(gr){
  const g = gr.g;
  const i = (S.archGeh||[]).findIndex(o=>o.geh===g);
  if(i>=0){ const o = S.archGeh[i]; let a = S.ateliers.find(x=>norm(x.nom)===norm(o.atelier)); if(!a){ a = {id:uid(), nom:o.atelier, gehs:[]}; S.ateliers.push(a); } a.gehs.push(g); S.archGeh.splice(i,1); }
  const ids = new Set(gr.items.map(x=>x.id)); g.exclus = (g.exclus||[]).filter(x=>!ids.has(x.id));
  gr.items.forEach(x=>{ g.taches.push({id:x.id, t:x.t, duree:x.duree||"", freq:x.freq||"", prod:x.prod||"", em:x.em||0, qj:x.qj||"", qa:x.qa||"", ck:(x.cs||[]).filter(c=>!/^e:/.test(c))}); (x.cs||[]).forEach(k=>{ const rec = (S.csd||{})[k]; if(rec) candAddRec(rec, String(x.prod||"").split("\n")[0], (g.srcs&&g.srcs[0])||g.des); }); });
}
(function(){
  const card = $("#exclCard"); if(!card) return;
  card.addEventListener("toggle", renderExcl);
  $("#exclWrap").addEventListener("change", e=>{ if(e.target.id==="exF") exF = e.target.value; else if(e.target.id==="exQ") exQ = e.target.value; else return; renderExcl(); });
  $("#exclWrap").addEventListener("click", e=>{ const b = e.target.closest("button"); if(!b) return; const d = b.dataset;
    if(d.rg!=null){ const gr = EXG[+d.rg]; if(!gr) return; restoreGroup(gr); }
    else if(d.rall){ const L = EXG.slice(); if(!L.length) return; if(L.length>20 && !confirm("Réintégrer "+L.length+" groupe(s) de lignes ?")) return; L.forEach(restoreGroup); }
    else return;
    persist(); renderGeh(); try{ renderCand(); }catch(_){} });
})();

/* ---- import résultats FDS ---- */
function parseFds(sh){
  const RP = sTable(sh,"Résumé produits","nom_produit"), C = sTable(sh,"Composants","cas");
  if(!C) throw new Error("Feuille « Composants » introuvable.");
  const prod = {}; if(RP) RP.rows.forEach(r=>{ prod[RP.get(r,"fichier")] = {nom:RP.get(r,"nom_produit"), fourn:RP.get(r,"fournisseur")}; });
  const numClean = v => { const n = parseFloat(String(v).replace(",",".")); return isNaN(n) ? "" : String(+n.toPrecision(6)); };
  const hCmr = h => { const o = []; const t = String(h||""); if(/H350/.test(t)) o.push("C1A/1B"); else if(/H351/.test(t)) o.push("C2"); if(/H340/.test(t)) o.push("M1A/1B"); else if(/H341/.test(t)) o.push("M2"); if(/H360/.test(t)) o.push("R1A/1B"); else if(/H361/.test(t)) o.push("R2"); return o.join(", "); };
  const natOf = t => ({contraignante:"Réglementaire contraignante", indicative:"Réglementaire indicative", admise:"Indicative par circulaire"})[norm(t)] || "";
  const groups = {};
  C.rows.forEach(r=>{
    const f = C.get(r,"fichier"), cas = (C.get(r,"cas").match(/\b\d{2,7}-\d{2}-\d\b/)||[])[0]; if(!cas) return;
    const b = baseByCas(cas)[0], nomRaw = C.get(r,"nom_chimique"), plausible = /[A-Za-zÀ-ÿ]{4}/.test(nomRaw) && !/[<>=%]/.test(nomRaw);
    const mg = u => norm(C.get(r,u))==="mg m3";
    let v8 = mg("vlep_fr_8h_unite") ? numClean(C.get(r,"vlep_fr_8h_valeur")) : "", vct = mg("vlep_fr_ct_unite") ? numClean(C.get(r,"vlep_fr_ct_valeur")) : "", nat = natOf(C.get(r,"vlep_fr_type")), cmr = norm(C.get(r,"est_cmr"))==="oui" ? (hCmr(C.get(r,"mentions_h")) || "CMR (FDS)") : "";
    if(b){ if(!v8 && b.v8!=null) v8 = String(b.v8); if(!vct && b.vct!=null) vct = String(b.vct); if(!nat) nat = b.vContr?"Réglementaire contraignante":(b.vIndic?"Réglementaire indicative":(b.vAdm?"Indicative par circulaire":"")); if(b.cmr) cmr = b.cmr; }
    if(!v8 && !vct && !cmr) return;
    const nom = b ? cleanName(b.agent) : (plausible ? nomRaw : "CAS "+cas);
    const rec = {cas, nom, v8, vct, nat, cmr}; const key = f || C.get(r,"nom_produit_fds");
    const g = groups[key] = groups[key] || {nom: (prod[f]&&prod[f].nom) || C.get(r,"nom_produit_fds") || f, fourn:(prod[f]&&prod[f].fourn)||"", subs:[]};
    if(!g.subs.some(x=>x.cas===cas)) g.subs.push(rec);
  });
  const fds = Object.values(groups).filter(g=>g.subs.length);
  /* produits sans substance pertinente : conservés pour la recherche */
  Object.keys(prod).forEach(f=>{ if(!groups[f] && prod[f].nom) fds.push({nom:prod[f].nom, fourn:prod[f].fourn, subs:[]}); });
  return fds;
}
reg("fFds", async e=>{
  const f = e.target.files[0]; if(!f) return; const m = $("#fdsMsg");
  try{
    m.textContent = "Lecture…"; const fds = parseFds(await readXlsx(await f.arrayBuffer()));
    const have = new Set(S.fds.map(x=>norm(x.nom))); let nNew = 0; fds.forEach(P=>{ if(!have.has(norm(P.nom))){ S.fds.push(P); nNew++; } });
    let nc = 0;
    fds.forEach(P=>P.subs.forEach(r=>{ let c = S.cand.find(x=>x.cas===r.cas); if(!c){ c = {cas:r.cas, nom:r.nom, v8:r.v8, vct:r.vct, nat:r.nat, cmr:r.cmr, prods:[], gehs:[], refs:baseByCas(r.cas, r.nom).map(b=>b.ref)}; S.cand.push(c); nc++; } if(!c.prods.includes(P.nom)) c.prods.push(P.nom); }));
    persist(); renderCand();
    m.innerHTML = '<b>'+nNew+' produit(s) importé(s)</b> ('+fds.filter(P=>P.subs.length).length+' avec substance à VLEP/CMR), '+nc+' nouvelle(s) substance(s) dans la liste ci-dessous. Cherche les produits dans l\'onglet Terrain. Noms de substances absents de la base : « CAS … » (à vérifier).';
  }catch(err){ m.textContent = "Échec de l'import : "+err.message; }
  e.target.value = "";
});

/* ---- agents détectés ---- */
function vNature(n){ n = norm(n); return n.includes("contraignante") ? "vContr" : (n.includes("reglementaire indicative") ? "vIndic" : (n ? "vAdm" : "")); }
function candState(c){ return S.agents.some(a=>(c.cas && a.cas===c.cas) || (!c.cas && norm(a.agent)===norm(c.nom)) || c.refs.some(r=>a.ref===r)); }
/* « reg » : CMR ou VLEP réglementaire (contraignante ou indicative) ; « regadm » : idem + VLEP admises (indicatives par circulaire) */
const candOK = c => { const f = $("#candF") ? $("#candF").value : "all"; if(f==="cmr") return !!c.cmr; if(f==="reg") return candReglementaire(c); if(f==="regadm") return candReglementaire(c) || /admise|circulaire|indicative/.test(norm(c.nat)) || c.emis; return true; };
function renderCand(){
  $("#candCard").classList.toggle("hide", !S.cand.length);
  if(!S.cand.length) return;
  const nv = S.cand.filter(candOK).length;
  $("#candN").textContent = nv+" affiché(s) / "+S.cand.length;
  $("#candWrap").innerHTML = '<table class="t"><thead><tr><th>Agent</th><th>N° CAS</th><th>VLEP Seirich 8 h / CT</th><th>CMR</th><th>Produits</th><th>GEH</th><th></th></tr></thead><tbody>'+S.cand.map((c,i)=>{ if(!candOK(c)) return "";
    const done = candState(c), inb = c.refs.length;
    const btn = done ? '<span class="tag ok">retenu</span>' : '<button class="btn sm" data-cadd="'+i+'">'+(inb?'+ Ajouter':'+ Hors base')+'</button>';
    return '<tr class="'+(inb||c.emis?'':'hors')+'"><td class="l">'+esc(c.nom)+(c.emis?'<small>Agent émis, sans CAS'+(inb?' — proposé : poussières inhalables (PVC)':'')+'</small>':'')+(c.alias?'<small>Rattaché par équivalence à : '+c.refs.slice(0,3).map(r=>esc(cleanName(BASE[r].agent))).join(" ; ")+'</small>':(c.refs.length>1?'<small>'+c.refs.length+' variantes en base</small>':''))+'</td><td>'+esc(c.cas||"-")+'</td><td>'+fmt(c.v8)+' / '+fmt(c.vct)+(c.nat?'<small style="display:block;color:var(--mut)">'+esc(c.nat)+'</small>':'')+'</td><td>'+esc(c.cmr||"-")+'</td><td title="'+esc(c.prods.join(" ; "))+'">'+c.prods.length+'</td><td class="l" style="font-size:12px">'+esc(c.gehs.join(" ; "))+'</td><td>'+btn+'</td></tr>';
  }).join("")+'</tbody></table><div class="legend">Liseré orange : absent de la base (pas de méthode référencée) — ajout « hors base ».</div>';
}
function addCand(i){
  const c = S.cand[i]; if(candState(c)) return;
  if(c.refs.length){ (c.all ? c.refs : c.refs.slice(0,1)).forEach(r=>addBase(r)); return; }
  const a = {uid:uid(), agent:c.nom, ref:null, custom:true}; if(c.cas) a.cas = c.cas; if(c.v8) a.v8 = c.v8; if(c.vct) a.vct = c.vct; if(c.cmr) a.cmr = c.cmr;
  const k = vNature(c.nat); if(k) a[k] = "X"; a.methode = "Hors base — à définir"; S.agents.push(a); persist();
}
$("#candWrap").addEventListener("click", e=>{ const b = e.target.closest("[data-cadd]"); if(!b) return; addCand(+b.dataset.cadd); renderCand(); renderSel(); renderList(); });
$("#candF").addEventListener("change", renderCand);
$("#bCandAll").onclick = ()=>{ S.cand.forEach((c,i)=>{ if(candOK(c) && c.refs.length) addCand(i); }); renderCand(); renderSel(); renderList(); };
$("#bCandHors").onclick = ()=>{ S.cand.forEach((c,i)=>{ if(candOK(c) && (!c.emis || c.refs.length)) addCand(i); }); renderCand(); renderSel(); renderList(); };
