"use strict";
/* ================= Import d'un inventaire tableur (ALPRO, Saverne, modèle SOCOTEC, export Seirich partiel, résultats FDS…) ================= */
/* Colonnes reconnues par synonymes. Seule une colonne CAS est exigée : sans colonne de poste ni de lieu, les substances
   sont reprises sans GEH (à définir à la visite). Le tableau retenu est celui qui porte le plus d'informations. */
const INV_COLS = {
  geh: ["geh","poste","poste de travail",/^poste /,"groupe d exposition homogene"],
  loc: [/^localisation/,/^lieu/,/^zone/,"nom de la zone","unite de travail","atelier",/^service/],
  prod: ["produit","nom du produit",/^nom du produit/,/^produit/,"nom produit fds","nom produit","nom commercial","designation"],
  sub: ["substance","nom de la substance","nom chimique","agent chimique","nom de l agent chimique"],
  cas: [/(^| )cas( |$)/], tache: [/^tache/], risque: [/^risque/,/^niveau de risque/,/^cotation/,/^priorite/,/^hierarchisation/], freq: [/^frequence/], duree: [/^duree/], eff: [/^effectif/],
  v8: ["vlep8h","vlep 8h","vlep fr 8h valeur"], n8: ["nature vlep8h"], vct: ["vlepct","vlep ct","vlep fr ct valeur"], nct: ["nature vlepct"]
};
const invCol = (h, k) => h.findIndex(x=>INV_COLS[k].some(a=> typeof a==="string" ? x===a : a.test(x)));
function parseInventaire(sheets){
  if(isEvrcAnnexe(sheets)) return parseEvrc(sheets);
  let best = null;
  for(const name of Object.keys(sheets)){
    const R = sheets[name];
    for(let i=0;i<Math.min(R.length,20);i++){
      const h = Array.from(R[i]||[], c=>norm(c)); if(invCol(h,"cas")<0) continue;
      const sc = 10 + (invCol(h,"geh")>=0?5:0) + (invCol(h,"loc")>=0?3:0) + (invCol(h,"prod")>=0?2:0) + (invCol(h,"sub")>=0?2:0) + (invCol(h,"duree")>=0||invCol(h,"freq")>=0?1:0);
      if(!best || sc>best.sc) best = {name, hi:i, h, R, sc};
      break; }
  }
  if(!best) throw new Error("Format non reconnu : aucune colonne « CAS » (numéro CAS des substances) n'a été trouvée.");
  const h = best.h, ic = k => invCol(h, k);
  /* poste : colonne GEH / Poste ; à défaut, la colonne de lieu (localisation, zone, atelier…) sert de GEH */
  const cGeh0 = ic("geh"), cLoc = ic("loc"), cGeh = cGeh0>=0 ? cGeh0 : cLoc, sansGeh = cGeh<0;
  const cAt = cGeh0>=0 ? h.findIndex(x=>/atelier|lieu d utilisation|unite de travail|^zone|^service/.test(x)) : -1, cTask = ic("tache"), cProd = ic("prod"),
        cSub = ic("sub"), cCas = ic("cas"), cRisk = ic("risque"), cFreq = ic("freq"), cDur = ic("duree"), cEff = ic("eff"),
        c8 = ic("v8"), n8 = ic("n8"), cCT = ic("vct"), nCT = ic("nct");
  const g = (r,j) => j<0 || r[j]==null ? "" : String(r[j]).trim();
  const numV = s => { const m = /[\d]+(?:[.,]\d+)?/.exec(String(s||"")); return m ? m[0].replace(",",".").replace(/\.0+$/,"") : ""; };
  const natOf = b => b.vContr ? "Réglementaire contraignante" : (b.vIndic ? "Réglementaire indicative" : (b.vAdm ? "Indicative par circulaire" : ""));
  const ateliers = [], postes = {}, cand = {}, tous = []; let nTasks = 0;
  const getGeh = (at, po) => { at = at.replace(/\s+/g," ").trim(); po = po.replace(/\s+/g," ").trim(); let a = ateliers.find(x=>norm(x.nom)===norm(at)); if(!a){ a = {id:uid(), nom:capFirst(at), gehs:[]}; ateliers.push(a); }
    const k = norm(a.nom)+"||"+norm(po); if(!postes[k]){ postes[k] = Object.assign(newGeh(capFirst(po)), {srcs:[capFirst(po)]}); a.gehs.push(postes[k]); } return postes[k]; };
  const dataRows = best.R.slice(best.hi+1), subInfo = {};
  dataRows.forEach(r=>{ const sub = g(r,cSub), cs = (g(r,cCas).match(/\b\d{2,7}-\d{2}-\d\b/)||[])[0]; if(sub && cs) subInfo[norm(sub)] = {cas:cs, v8:numV(g(r,c8)), vct:numV(g(r,cCT)), nat:g(r,n8)||g(r,nCT)}; });
  dataRows.forEach(r=>{
    const prod = g(r,cProd), sub = g(r,cSub), casCell = g(r,cCas), geh = g(r,cGeh), info = subInfo[norm(sub)];
    if(!prod && !sub && !casCell) return;
    const header = !prod && !geh;
    const at = g(r,cAt) || "Site", line = {id:uid(), t:g(r,cTask).replace(/^\/$/,""), duree:capFirst(g(r,cDur).replace(/^\/$/,"")), freq:normFreq(g(r,cFreq).replace(/^\/$/,"")), risque:g(r,cRisk), prod: [prod && prod!=="/" ? prod : "", sub && norm(sub)!==norm(prod) ? sub.toLowerCase() : ""].filter(Boolean).join("\n")};
    const gehs = header || sansGeh ? [] : (geh||"(non affecté)").split(/[;\n]/).map(x=>x.trim()).filter(Boolean);
    gehs.forEach(po=>{
      if(norm(po)==="tous"){ tous.push({line, cas:casCell, prod, sub}); return; }
      const G = getGeh(at, po); if(!G.eff && cEff>=0) G.eff = g(r,cEff).replace(/\s*pers\w*/i,""); const first = line.prod.split("\n")[0], ex = G.taches.find(k=>k.t===line.t && k.prod.split("\n")[0]===first && k.duree===line.duree && k.freq===line.freq);
      if(ex){ if(sub){ const arr = (ex.prod.split("\n")[1]||"").split(", ").filter(Boolean); if(!arr.includes(sub.toLowerCase())) arr.push(sub.toLowerCase()); ex.prod = first+"\n"+arr.join(", "); } }
      else { G.taches.push(Object.assign({}, line, {id:uid()})); nTasks++; }
    });
    /* substances candidates : CAS de la cellule, VLEP du fichier sinon de la base */
    let cas = casCell.match(/\b\d{2,7}-\d{2}-\d\b/g) || (info ? [info.cas] : []);
    if(!cas.length && sub){ const nb = BASE.find(b=>b._n===norm(sub)); if(nb && nb._c) cas = [nb._c]; }
    if(!cas.length && g(r,n8) && sub) cas = ["nom:"+norm(sub)];
    cas.forEach(cs=>{
      const nomKey = cs.startsWith("nom:"), refs = nomKey ? [] : baseByCas(cs); const b = refs[0];
      let v8 = numV(g(r,c8)) || (info ? info.v8 : ""), vct = numV(g(r,cCT)) || (info ? info.vct : ""), nat = g(r,n8) || g(r,nCT) || (info ? info.nat : ""), cmr = "";
      if(b){ if(!v8) v8 = b.v8!=null ? String(b.v8) : ""; if(!vct) vct = b.vct!=null ? String(b.vct) : ""; if(!nat) nat = natOf(b); cmr = b.cmr||""; }
      if(!v8 && !vct && !cmr && !nat) return;
      /* nom du fichier s'il est propre ; sinon (texte de FDS recopié, renvoi « [1] »…) nom de la base, sinon le CAS */
      const subOk = sub && sub.length<=60 && /[a-zà-ÿ]{3}/i.test(sub) && !/substance|valeur limite/i.test(sub);
      const subCourt = sub && !/^\[\d+\]$/.test(sub) ? sub.split(/\s+substance\s/i)[0].trim() : "";
      const nm = (subOk ? sub : "") || (b ? cleanName(b.agent) : "") || subCourt || (nomKey ? sub : "CAS "+cs) || prod, c = cand[cs] = cand[cs] || {cas:nomKey?"":cs, nom:nm, v8, vct, nat, cmr, prods:[], gehs:[]};
      if(prod && !c.prods.includes(prod)) c.prods.push(prod);
      gehs.forEach(po=>{ if(norm(po)!=="tous" && !c.gehs.includes(po)) c.gehs.push(po); });
      c._tous = c._tous || (gehs.some(po=>norm(po)==="tous"));
    });
  });
  /* « Tous » : produit présent sur tous les postes */
  const allG = ateliers.flatMap(a=>a.gehs);
  if(tous.length && allG.length){ tous.forEach(t=>{ allG.forEach(G=>{ G.taches.push(Object.assign({}, t.line, {id:uid()})); }); nTasks += allG.length; }); Object.values(cand).forEach(c=>{ if(c._tous) allG.forEach(G=>{ if(!c.gehs.includes(G.des)) c.gehs.push(G.des); }); }); }
  const list = Object.values(cand).map(c=>{ delete c._tous; c.refs = baseByCas(c.cas, c.nom).map(b=>b.ref); return c; });
  list.sort((a,b)=> (b.cmr?1:0)-(a.cmr?1:0) || norm(a.nom).localeCompare(norm(b.nom),"fr"));
  return {ateliers, cand:list, nTasks, orphan:0, sansGeh, feuille:best.name};
}
