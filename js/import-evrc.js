"use strict";
/* ================= Évaluation du risque chimique (EvRC) SOCOTEC : annexes Excel + rapport Word / PDF ================= */
/* Annexes : un onglet « risque inhalation » par poste (produit, tâche, zones parentes « Bâtiment - Zone - Poste », fréquence - durée)
   et un onglet des substances à VLEP (substance, CAS, CMR, produit concerné, poste). Les substances sont rattachées aux tâches
   par le nom du produit. Les onglets cutanés et EPI ne servent pas à la stratégie. */
const EVRC_INH = /risque\s*(r[ée]siduel\s*)?inhalation/i;
function evrcHead(R, test){ for(let i=0;i<Math.min(R.length,15);i++){ const h = Array.from(R[i]||[], c=>norm(c)); if(test(h)) return {hi:i, h}; } return null; }
function evrcVlepSheet(sheets){
  for(const name of Object.keys(sheets)){ const R = sheets[name], H = evrcHead(R, h=>h.some(x=>/(^| )cas( |$)/.test(x)) && h.some(x=>/^produits? concernes?/.test(x))); if(H) return Object.assign({name, R}, H); }
  return null;
}
function isEvrcAnnexe(sheets){
  return !!evrcVlepSheet(sheets) && Object.keys(sheets).some(n=>EVRC_INH.test(n) && evrcHead(sheets[n], h=>h.includes("zones parentes")));
}
/* « 1 / trimestre - 5 minutes », « 30 min -2 à 3 X/jour », « 1x/19h - 5min » : la partie sans « / » qui porte une durée est la durée */
function evrcFreqDur(s){
  s = String(s||"").replace(/\s+/g," ").trim(); if(!s) return {freq:"", duree:""};
  const isDur = p => /\d\s*(min|h\b|heures?|sec)|minutes|secondes|heures?\b/i.test(p) && !/\/|\dx|\bx\b|fois/i.test(p);
  const isFreq = p => /\d|jour|semaine|mois|\ban|fois|quotid|hebdo/i.test(p);
  const parts = s.split(/\s+-\s*|\s*-\s+/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>1){ const d = parts.find(isDur); if(d) return {freq:capFirst(parts.filter(p=>p!==d).join(" - ")), duree:capFirst(d)}; }
  let m = /^(\d+(?:[.,]\d+)?\s*(?:min\w*|h(?:eures?)?|sec\w*)|quelques? minutes)\s*\/\s*(.+)$/i.exec(s); if(m) return {freq:capFirst(m[2]), duree:capFirst(m[1])};
  m = /(?:^|[\s(<])(\d+(?:[.,]\d+)?\s*(?:min\w*|h(?:eures?)?\b|sec\w*))(?!\s*\/)/i.exec(s);
  if(m && !/\/\s*$/.test(s.slice(0, m.index+1))){ const rest = (s.slice(0, m.index)+" "+s.slice(m.index+m[0].length)).replace(/^[\s\/,-]+|[\s\/,-]+$/g,"").trim();
    return isFreq(rest.replace(/\([^)]*\)/g,"")) ? {freq:capFirst(rest), duree:capFirst(m[1])} : {freq:"", duree:capFirst(s)}; }
  return isDur(s) ? {freq:"", duree:capFirst(s)} : {freq:capFirst(s), duree:""};
}
function parseEvrc(sheets){
  const V = evrcVlepSheet(sheets), vh = V.h, col = re => vh.findIndex(x=>re.test(x)), g = (r,j) => j<0 || r[j]==null ? "" : String(r[j]).replace(/\s+/g," ").trim();
  const cSub = col(/^substances?$/), cCas = col(/(^| )cas( |$)/), cCmr = col(/cmr/), cProd = col(/^produits? concernes?/), cPoste = col(/^postes? concernes?/),
        c8 = col(/^vlep 8h/), cCT = col(/^vlep ct/), n8 = c8>=0 && /^nature/.test(vh[c8+1]||"") ? c8+1 : -1, nCT = cCT>=0 && /^nature/.test(vh[cCT+1]||"") ? cCT+1 : -1;
  const numV = s => { const m = /\d+(?:[.,]\d+)?/.exec(String(s||"")); return m ? m[0].replace(",",".") : ""; };
  /* substances par produit */
  const subs = {}, byProd = {};
  V.R.slice(V.hi+1).forEach(r=>{ if(!r) return; const cas = (g(r,cCas).match(/\b\d{2,7}-\d{2}-\d\b/)||[])[0], sub = g(r,cSub); if(!cas || !sub) return;
    const b = baseByCas(cas, sub)[0];
    const s = subs[cas] = subs[cas] || {cas, nom: b ? cleanName(b.agent) : capFirst(sub.toLowerCase()), v8:numV(g(r,c8)), vct:numV(g(r,cCT)), nat:g(r,n8)||g(r,nCT), cmr:g(r,cCmr).replace(/\s*\/\s*/g,", "), prods:[], gehs:[], postes:[]};
    if(b){ if(!s.v8 && b.v8!=null) s.v8 = String(b.v8); if(!s.vct && b.vct!=null) s.vct = String(b.vct); if(!s.cmr) s.cmr = b.cmr||""; }
    const p = g(r,cProd); if(p){ if(!s.prods.includes(p)) s.prods.push(p); (byProd[norm(p)] = byProd[norm(p)] || new Set()).add(cas); }
    g(r,cPoste).split(/\s+\/\s+/).map(x=>x.trim()).filter(Boolean).forEach(x=>{ if(!s.postes.includes(x)) s.postes.push(x); }); });
  const pKeys = Object.keys(byProd);
  /* nom de produit de la tâche -> substances (nom identique, sinon l'un commence par l'autre) */
  const subsOf = prod => { const n = norm(prod); if(!n) return []; let k = byProd[n] ? [n] : pKeys.filter(x=>Math.min(x.length,n.length)>=8 && (x.startsWith(n) || n.startsWith(x)));
    return [...new Set(k.flatMap(x=>[...byProd[x]]))].map(c=>subs[c]).filter(s=>s.v8 || s.vct || s.cmr); };
  /* postes et tâches */
  const ateliers = [], postes = {}; let nTasks = 0, sansAgent = 0;
  const getGeh = (at, po) => { let a = ateliers.find(x=>norm(x.nom)===norm(at)); if(!a){ a = {id:uid(), nom:capFirst(at), gehs:[]}; ateliers.push(a); }
    const k = norm(a.nom)+"||"+norm(po); if(!postes[k]){ postes[k] = Object.assign(newGeh(capFirst(po)), {srcs:[capFirst(po)]}); a.gehs.push(postes[k]); } return postes[k]; };
  const feuilles = Object.keys(sheets).filter(n=>EVRC_INH.test(n));
  feuilles.forEach(name=>{ const R = sheets[name], H = evrcHead(R, h=>h.includes("zones parentes")); if(!H) return; const h = H.h, c = re => h.findIndex(x=>re.test(x));
    const cP = c(/^nom (du produit|de la sus?tance)|^produit/), cT = c(/^nom de la tache|^tache/), cZ = h.indexOf("zones parentes"), cF = c(/^frequence/), cX = c(/^risque expertis/), cI = c(/inhalation/);
    R.slice(H.hi+1).forEach(r=>{ if(!r) return; const prod = g(r,cP), zone = g(r,cZ); if(!prod || !zone) return;
      const parts = zone.split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean), at = parts.length>1 ? parts[1] : parts[0], po = parts.length>2 ? parts.slice(2).join(" - ") : at;
      const S2 = subsOf(prod); if(!S2.length){ sansAgent++; return; }
      const G = getGeh(at, po), fd = evrcFreqDur(g(r,cF)), risque = [g(r,cI), g(r,cX)].filter(Boolean).join(" – ");
      const line = {id:uid(), t:capFirst(g(r,cT)), duree:fd.duree, freq:fd.freq, risque, prod: prod+"\n"+S2.map(s=>s.nom.toLowerCase()).join(", ")};
      if(!G.taches.some(k=>k.t===line.t && k.prod===line.prod && k.freq===line.freq && k.duree===line.duree)){ G.taches.push(line); nTasks++; }
      S2.forEach(s=>{ if(!s.gehs.includes(G.des)) s.gehs.push(G.des); if(!s.prods.includes(prod)) s.prods.push(prod); }); }); });
  /* poste indiqué dans l'onglet VLEP (substances CMR surtout) : rattaché au GEH de même nom */
  const allG = ateliers.flatMap(a=>a.gehs);
  Object.values(subs).forEach(s=>{ s.postes.forEach(p=>{ const n = norm(p), G = allG.find(x=>norm(x.des)===n) || allG.find(x=>norm(x.des).length>=5 && (n.includes(norm(x.des)) || norm(x.des).includes(n))); if(G && !s.gehs.includes(G.des)) s.gehs.push(G.des); }); });
  const cand = Object.values(subs).filter(s=>s.v8 || s.vct || s.cmr).map(s=>{ const c = {cas:s.cas, nom:s.nom, v8:s.v8, vct:s.vct, nat:s.nat, cmr:s.cmr, prods:s.prods, gehs:s.gehs}; c.refs = baseByCas(c.cas, c.nom).map(b=>b.ref); return c; });
  cand.sort((a,b)=> (b.cmr?1:0)-(a.cmr?1:0) || norm(a.nom).localeCompare(norm(b.nom),"fr"));
  const note = ' <span class="warn">Annexes EvRC SOCOTEC : '+feuilles.length+' onglet(s) « risque inhalation » lus (onglets cutanés et EPI ignorés).'+(sansAgent ? ' '+sansAgent+' ligne(s) dont le produit n’a aucune substance à VLEP ou CMR dans l’onglet « '+esc(V.name.trim())+' » non reprises.' : '')+' La cotation (couleurs) n’est pas lue : reporte-toi au § « Synthèse après expertise » du rapport.</span>';
  return {ateliers, cand, nTasks, orphan:0, sansGeh:false, feuille:V.name, note};
}
/* ---- rapport EvRC (Word ou PDF) : client, contact, référence et date de l'ERC ---- */
const isEvrcRapport = t => /RAPPORT D.[ÉE]VALUATION DES RISQUES CHIMIQUES/i.test(t);
function evrcFromText(t){
  const L = String(t||"").split(/\n/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean), e = {}, R = {ent:e}; let m;
  const ia = L.findIndex(l=>/^A l.attention de/i.test(l));
  if(ia>=0){ e.contact = L[ia].replace(/^A l.attention de\s*/i,"").trim(); if(ia>0) e.nom = L[ia-1];
    const cp = L.slice(ia+1, ia+5).findIndex(l=>/^\d{5}\s+\S/.test(l)); if(cp>=0){ e.cpville = L[ia+1+cp]; if(cp>0) e.adresse = L.slice(ia+1, ia+1+cp).join(", "); } }
  const ic = L.findIndex(l=>/^R[ée]f[ée]rence du rapport/i.test(l)), id = L.findIndex(l=>/^Date d.[ée]dition/i.test(l));
  const near = (i, re) => { if(i<0) return ""; for(const l of L.slice(i, i+8)){ const x = re.exec(l); if(x) return x[1]; } return ""; };
  const chrono = near(ic, /\b([A-Z0-9]{4,}\/\d{2}\/\d+)\b/) || ((m = /N° chrono\s*:\s*(\S+)/i.exec(t)) ? m[1] : ""), dEd = near(id, /\b(\d{2}\/\d{2}\/\d{4})\b/);
  R.ercRef = "Rapport d’évaluation des risques chimiques SOCOTEC"+(chrono ? " réf. "+chrono : "");
  if(dEd){ const [d,mo,y] = dEd.split("/"); R.ercDate = y+"-"+mo+"-"+d; }
  return R;
}
function applyEvrcRapport(R){
  const got = [], LB = {nom:"nom", adresse:"adresse", cpville:"CP / ville", contact:"contact"};
  Object.keys(R.ent).forEach(k=>{ if(R.ent[k] && !(S.ent[k]||"").trim()){ S.ent[k] = R.ent[k]; got.push(LB[k]||k); } });
  if(!S.ent.ercMode) S.ent.ercMode = "present";
  if(!(S.ent.ercRef||"").trim()){ S.ent.ercRef = R.ercRef; got.push("référence de l’ERC"); }
  if(R.ercDate && !(S.ent.ercDate||"").trim()){ S.ent.ercDate = R.ercDate; got.push("date de l’ERC"); }
  persist(); return got;
}
