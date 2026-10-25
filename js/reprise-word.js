"use strict";
/* ================= Reprise d'une stratégie Word existante ================= */
function wKids(el, name){ return [...el.childNodes].filter(n=>n.nodeName===name); }
function wParaText(p){
  let t = ""; const walk = n => { for(const c of n.childNodes){
    if(c.nodeName==="w:t") t += c.textContent; else if(c.nodeName==="w:tab") t += " "; else if(c.nodeName==="w:br"||c.nodeName==="w:cr") t += "\n";
    else if(c.nodeName==="w:del"||c.nodeName==="w:instrText"||c.nodeName==="w:delText") continue; else if(c.childNodes && c.childNodes.length) walk(c); } };
  walk(p); return t;
}
function wCellLines(tc){ const out = []; wKids(tc,"w:p").forEach(p=>{ wParaText(p).split("\n").forEach(l=>{ if(l.trim()) out.push(l.trim()); }); }); return out; }
function wCellText(tc){ return wCellLines(tc).join(" ").replace(/\s+/g," ").trim(); }
function wRows(tbl){ return wKids(tbl,"w:tr").map(tr=>wKids(tr,"w:tc")); }
function wBlocks(doc){
  const body = doc.getElementsByTagName("w:body")[0], out = [];
  [...body.childNodes].forEach(n=>{
    if(n.nodeName==="w:p"){ const t = wParaText(n).replace(/\s+/g," ").trim(); const b = !!(n.getElementsByTagName("w:b").length) && [...n.getElementsByTagName("w:r")].some(r=>r.getElementsByTagName("w:b").length && wParaText(r).trim());
      const img = [...n.getElementsByTagName("v:imagedata")].map(x=>x.getAttribute("r:id")).concat([...n.getElementsByTagName("a:blip")].map(x=>x.getAttribute("r:embed"))).filter(Boolean);
      out.push({k:"p", t, bold:b, num:!!n.getElementsByTagName("w:numPr").length, img}); }
    else if(n.nodeName==="w:tbl") out.push({k:"t", el:n});
    else if(n.nodeName==="w:sdt"){ n.getElementsByTagName("w:tbl").length && [...n.getElementsByTagName("w:tbl")].forEach(t=>out.push({k:"t",el:t})); }
  });
  return out;
}
const J_MAP = [["vlepct",/mesures de vlep court/],["fcr",/fcr/],["erc",/analyse critique/],["regr",/regrouper/],["elim",/eliminer/],["duree",/duree des mesures/],["nb",/nombre de mesures/],["ag",/agents chimiques retenus/],["per",/periode d intervention/],["autres",/^autres justifications/],["infos",/^informations sur les mesures/]];
function jSecOf(t){ const n = norm(t); if(!/^(justifications|autres justifications|informations sur les mesures)/.test(n)) return null; const m = J_MAP.find(([k,re])=>re.test(n)); return m ? m[0] : null; }
function emfTexts(ab){
  const dv = new DataView(ab), out = []; let p = 0, al = 0;
  while(p+8<=dv.byteLength){ const t = dv.getUint32(p,true), sz = dv.getUint32(p+4,true); if(sz<8) break;
    if(t===22) al = dv.getUint32(p+8,true);
    if(t===84 && p+76<=dv.byteLength){ const x = dv.getInt32(p+36,true), y = dv.getInt32(p+40,true), n = dv.getUint32(p+44,true), off = dv.getUint32(p+48,true), od = dv.getUint32(p+72,true);
      let w = 0; if(od) for(let i=0;i<n;i++) w += dv.getInt32(p+od+4*i,true);
      let str = ""; for(let i=0;i<n;i++) str += String.fromCharCode(dv.getUint16(p+off+2*i,true));
      const left = (al&6)===6 ? x-w/2 : (al&6)===2 ? x-w : x; if(str.trim()) out.push({x:left, c:left+w/2, y, s:str.replace(/[\r\n]+/g," ").trim()}); }
    p += sz; }
  return out;
}
function emfAgents(T){
  const h8 = T.find(t=>/^VLEP 8h/.test(t.s)), hc = T.find(t=>/^VLEP CT/.test(t.s)), hcas = T.find(t=>/N° CAS/.test(t.s)), hcmr = T.find(t=>/^CMR/.test(t.s));
  if(!h8 || !hc) return null; const yMin = Math.max(...T.filter(t=>/^(VLEP|Accr|\(mg|pr[ée]l|analyse|CLP|\(règl)/.test(t.s)).map(t=>t.y))+10;
  const xs = T.filter(t=>t.s==="X"), xP = xs.length ? Math.min(...xs.map(t=>t.c)) : 1e9, rows = [];
  const cas = T.filter(t=>t.y>yMin && /^\d{2,7}-\d{2}-\d$/.test(t.s));
  const body = T.filter(t=>t.y>yMin); const xN = hcas ? hcas.x-10 : 400;
  /* ancres = lignes nommées (texte de la colonne agent) */
  const names = body.filter(t=>t.x<xN && t.s.length>2 && !/^[.\s]+$/.test(t.s) && !/^L[ée]gende|^Code couleur|^VLEP |^\.\s|^\(|^(et|ou|hors)\s/i.test(t.s));
  names.sort((a,b)=>a.y-b.y);
  names.forEach(n=>{ const same = body.filter(t=>Math.abs(t.y-n.y)<=8 && t!==n), c = same.find(t=>/^\d{2,7}-\d{2}-\d$/.test(t.s));
    const cmr = same.find(t=>/^C(1A|1B|2|MR)/i.test(t.s)), nums = same.filter(t=>/^[<>]?\s*\d+([.,]\d+)?$/.test(t.s) && !/^\d{2,7}-/.test(t.s)).filter(t=>t.c>xN+60 && t.c<xP-20);
    const d8 = nums.reduce((b,t)=> !b || Math.abs(t.c-h8.c)<Math.abs(b.c-h8.c) ? t : b, null);
    const v8 = nums.filter(t=>Math.abs(t.c-h8.c) < Math.abs(t.c-hc.c)).map(t=>t.s)[0]||"", vct = nums.filter(t=>Math.abs(t.c-hc.c) <= Math.abs(t.c-h8.c)).map(t=>t.s)[0]||"";
    const accs = same.filter(t=>t.s==="X").map(t=>t.c).sort((a,b)=>a-b);
    rows.push({agent:n.s, cas:c?c.s:"", cmr:cmr?cmr.s:"", v8, vct, accP: accs.length?"X":"", accA: accs.length>1?"X":"", type:"adm"}); });
  return rows;
}
function emfPlan(T){
  const hJ = T.find(t=>t.s==="Jour"), hA = T.find(t=>/^Agents chimiques/.test(t.s)), hG = T.find(t=>/^N° GEH/.test(t.s)), hN = T.find(t=>/^Nb total/.test(t.s)), hT = T.find(t=>/^Type de/.test(t.s)), hP = T.find(t=>/^Plage horaire/.test(t.s));
  if(!hJ || !hA || !hN) return null; const cols = [hJ,hA,hG,hN,hT,hP].map(h=>h?h.c:null);
  const yMin = Math.max(...[hJ,hA,hG,hN,hT,hP].filter(Boolean).map(h=>h.y), ...T.filter(t=>/^(prélèvements?|VLEP|prélèvement)$/.test(t.s)&&t.y<400).map(t=>t.y))+14;
  const body = T.filter(t=>t.y>yMin), anc = body.filter(t=>Math.abs(t.c-cols[0])<45 && /^J\d/i.test(t.s)).sort((a,b)=>a.y-b.y);
  if(!anc.length) return [];
  const rows = anc.map(a=>({jour:a.s, y:a.y, cell:[[],[],[],[],[],[]]}));
  body.forEach(t=>{ if(anc.includes(t)) return; let k = 0, best = 1e9; rows.forEach((r,i)=>{ const d = Math.abs(r.y-t.y); if(d<best){ best = d; k = i; } });
    let ci = 0, bd = 1e9; cols.forEach((c,i)=>{ if(c==null) return; const d = Math.abs(c-t.c); if(d<bd){ bd = d; ci = i; } }); rows[k].cell[ci].push(t); });
  return rows.map(r=>{ const f = i => r.cell[i].sort((a,b)=>a.y-b.y||a.x-b.x).map(t=>t.s); return {kind:"row", jour:r.jour, ags:f(1), geh:f(2).join(" "), nb:f(3).join(""), type:f(4).join(""), plage:f(5).join(" ")}; });
}
async function parseStrategie(buf){
  const z = await JSZip.loadAsync(buf), f = z.file("word/document.xml"); if(!f) throw new Error("Fichier Word invalide.");
  const doc = new DOMParser().parseFromString(await f.async("string"), "application/xml");
  if(doc.getElementsByTagName("parsererror").length) throw new Error("Document illisible.");
  const B = wBlocks(doc), tb = (b,txt) => b.k==="t" && norm(wCellText(wKids(b.el,"w:tr")[0]||doc.createElement("x"))+" "+[...b.el.getElementsByTagName("w:t")].slice(0,60).map(x=>x.textContent).join(" ")).includes(norm(txt));
  const res = {ent:{}, agents:[], ateliers:[], plan:[], just:[], warn:[]};
  /* identification */
  const ib = B.find(b=>b.k==="t" && [...b.el.getElementsByTagName("w:t")].some(x=>/Code NAF/.test(x.textContent)));
  if(ib){ const map = {"nom":"nom","adresse":"adresse","code naf":"naf","siret":"siret","effectif site":"effectif","contact sur le site":"contact","activite":"activite"};
    wRows(ib.el).forEach(r=>r.forEach((c,i)=>{ const k = map[norm(wCellText(c)).replace(/ $/,"")]; if(k && r[i+1]) res.ent[k] = wCellText(r[i+1]); })); }
  /* tableau agents */
  const ab = B.find(b=>b.k==="t" && (()=>{ const tx = [...b.el.getElementsByTagName("w:t")].slice(0,25).map(x=>x.textContent).join(" "); return /Agent chimique/.test(tx) && /N° CAS/.test(tx) && /Accr/.test(tx); })());
  if(ab){ wRows(ab.el).forEach(r=>{ if(r.length<5) return; const nm = wCellText(r[0]); if(!nm || /^agent chimique$/i.test(nm)) return; const x = r[0].getElementsByTagName ? r[0].outerHTML || "" : "";
      const bold = r[0].getElementsByTagName("w:b").length>0, blue = [...r[0].getElementsByTagName("w:color")].some(c=>/0000FF/i.test(c.getAttribute("w:val")||""));
      const cell = i => r[i] ? wCellText(r[i]) : ""; res.agents.push({agent:nm, cas:cell(1), v8:cell(2), vct:cell(3), cmr:cell(4), accP:/x/i.test(cell(5))?"X":"", accA:/x/i.test(cell(6))?"X":"", type: bold ? (blue?"indic":"contr") : "adm"}); }); }
  /* GEH */
  B.forEach((b,bi)=>{
    if(b.k!=="t" || ![...b.el.getElementsByTagName("w:t")].slice(0,40).some(x=>/Désignation du GEH/.test(x.textContent))) return;
    let at = ""; for(let j=bi-1;j>=0 && j>=bi-4;j--){ if(B[j].k==="p" && B[j].t){ at = B[j].t.replace(/^\s*(atelier\s*)?\d+\s*[–\-:.]\s*/i,"").replace(/^atelier\s*\d+\s*:?\s*/i,"").trim(); break; } if(B[j].k==="t") break; }
    at = at || "Atelier"; let A = res.ateliers.find(a=>a.nom===at); if(!A){ A = {id:uid(), nom:at, gehs:[]}; res.ateliers.push(A); }
    let G = null;
    wRows(b.el).forEach(r=>{ if(r.length<8) return; const c = i => r[i] ? wCellText(r[i]) : ""; if(/Désignation du GEH/.test(c(1))) return;
      if(c(0) || c(1)){ G = {id:uid(), des:c(1), eff:c(2), orga:wCellLines(r[3]||{childNodes:[]}).join(", "), epc:c(8), epi:c(9), com:c(10), taches:[], agents:[], srcs:[c(1)], num:c(0)}; A.gehs.push(G); }
      if(!G) return; const t = c(4), d = c(5), fq = c(6), pr = r[7] ? wCellLines(r[7]).join("\n") : "";
      if(t||d||fq||pr) G.taches.push({id:uid(), t, duree:d, freq:fq, prod:pr}); });
  });
  res.ateliers = res.ateliers.filter(a=>a.gehs.length);
  /* plan */
  const pb = B.find(b=>b.k==="t" && (()=>{ const r0 = wRows(b.el)[0]; if(!r0) return false; const h = r0.map(wCellText).map(norm); return h[0]==="jour" && h.some(x=>/agent/.test(x)); })());
  if(pb){ const rows = wRows(pb.el), h = rows[0].map(c=>norm(wCellText(c)));
    const ix = re => h.findIndex(x=>re.test(x)), iJ = 0, iA = ix(/agent/), iG = ix(/geh/), iN = ix(/nb|nombre/), iT = ix(/type/), iP = ix(/plage/);
    rows.slice(1).forEach(r=>{ const c = i => i>=0 && r[i] ? wCellText(r[i]) : "";
      if(r.length<=2 || (c(0) && !c(iA) && !c(iG) && r.length<4)){ if(c(0)) res.plan.push({kind:"sec", txt:c(0)}); return; }
      res.plan.push({kind:"row", jour:c(iJ), ags: iA>=0 && r[iA] ? wCellLines(r[iA]) : [], geh:c(iG), nb:c(iN), type:c(iT), plage:c(iP)}); }); }
  /* tableaux collés en image EMF (agents + plan par GEH) */
  if(!res.agents.length || !res.plan.length){
    try{
      const rf = z.file("word/_rels/document.xml.rels"), rels = {}; if(rf){ const rd = new DOMParser().parseFromString(await rf.async("string"),"application/xml"); [...rd.getElementsByTagName("Relationship")].forEach(r=>rels[r.getAttribute("Id")] = r.getAttribute("Target")); }
      const stop = B.findIndex(b=>b.k==="p" && /^(a\s?nnexes?\b|r[ée]sultats? de la (premi[èe]re )?campagne)/i.test(b.t||"")), end = stop>0 ? stop : B.length;
      let gl = "", seenAg = new Set();
      for(let bi=0; bi<end; bi++){ const b = B[bi]; if(b.k!=="p") continue;
        if(/^GEH\s*\d+/i.test(b.t||"") && !b.img.length) gl = b.t;
        for(const id of b.img){ const tg = rels[id]; if(!tg || !/\.emf$/i.test(tg)) continue; const ef = z.file("word/"+tg.replace(/^\/?(word\/)?/,"")); if(!ef) continue;
          const T = emfTexts(await ef.async("arraybuffer"));
          if(!res.agents.length){ const ag = emfAgents(T); if(ag && ag.length){ ag.forEach(o=>{ const k = o.cas||norm(o.agent); if(!seenAg.has(k)){ seenAg.add(k); res.agents.push(o); } }); continue; } }
          if(!res.plan.length || res.planImg){ const pl = emfPlan(T); if(pl && pl.length){ res.planImg = true; if(gl) res.plan.push({kind:"sec", txt:gl}); pl.forEach(r=>{ if(gl) r.geh = gl; res.plan.push(r); }); } } } }
      if(res.agents.length || res.plan.length) res.warn.push("Tableaux agents / plan lus dans des images : vérifie les valeurs.");
    }catch(err){ res.warn.push("Lecture des images impossible : "+err.message); }
  }
  /* justifications */
  const i0 = B.findIndex(b=>b.k==="p" && /Les hypothèses retenues/.test(b.t)), i1 = B.findIndex((b,i)=>i>i0 && b.k==="p" && /Plan d.échantillonnage proposé/.test(b.t));
  if(i0>=0 && i1>i0){ let sec = null, last = null;
    B.slice(i0+1,i1).forEach(b=>{ if(b.k!=="p" || !b.t) return; const s2 = jSecOf(b.t.replace(/\s*:\s*$/,""));
      if(s2){ sec = s2; last = null; return; } if(!sec) return;
      if(last && last.txt.trim().endsWith(":") && b.t.length<140 && !/[.!]$/.test(b.t)){ last.list.push(b.t); return; }
      last = {id:uid(), sec, key:"", txt:b.t, list:[], on:true, auto:false, edited:true}; res.just.push(last); }); }
  return res;
}
function applyPrevRes(R, fname, m){
    const N = blank(); N.ent = Object.assign(N.ent, R.ent, {affaire:"", dateMission:"", dateEdition:"", notes:""});
    /* agents : on repart des données actuelles de la base */
    const changes = [], missing = [], same = (a,b) => String(a||"").replace(",",".").trim() === String(b||"").replace(",",".").trim() || (isNaN(parseFloat(a)) && isNaN(parseFloat(b))) || parseFloat(String(a).replace(",","."))===parseFloat(String(b).replace(",","."));
    const toUid = {};
    R.agents.forEach(o=>{
      const cas = (o.cas.match(/\b\d{2,7}-\d{2}-\d\b/)||[])[0]; let b = cas ? BASE.find(x=>x._c===cas) : null; if(!b) b = BASE.find(x=>x._n===norm(cleanName(o.agent))) || null;
      let a;
      if(b){ a = snapshot(b); const nv8 = fmt(a.v8)==="-"?"":fmt(a.v8), nvc = fmt(a.vct)==="-"?"":fmt(a.vct), ov8 = o.v8==="-"?"":o.v8, ovc = o.vct==="-"?"":o.vct;
        if(!same(nv8,ov8) || !same(nvc,ovc)) changes.push(a.agent+" : VLEP "+(ov8||"-")+" / "+(ovc||"-")+" → "+(nv8||"-")+" / "+(nvc||"-")); }
      else { a = {uid:uid(), agent:o.agent, ref:null, custom:true, methode:"Hors base — à définir"}; if(cas) a.cas = cas; if(o.v8 && o.v8!=="-") a.v8 = o.v8.replace(",","."); if(o.vct && o.vct!=="-") a.vct = o.vct.replace(",","."); if(o.cmr && o.cmr!=="-") a.cmr = o.cmr; if(o.accP) a.accP = "X"; if(o.accA) a.accA = "X"; const k = ({contr:"vContr",indic:"vIndic",adm:"vAdm"})[o.type]; if(k) a[k] = "X"; missing.push(o.agent); }
      if(!N.agents.some(x=>x.ref!=null && x.ref===a.ref && a.ref!=null)) N.agents.push(a); toUid[norm(o.agent)] = a.uid; if(cas) toUid[cas] = a.uid; });
    if(!R.agents.length){ /* tableau agents illisible (image) : agents retrouvés par leur nom dans le plan */
      R.plan.forEach(r=>{ if(r.kind==="sec") return; const j = norm((r.ags||[]).join(" ")); if(!j) return;
        let ms = BASE.filter(b=>b._n && b._n.length>5 && (" "+j+" ").includes(" "+b._n+" ")); ms = ms.filter(b=>!ms.some(o=>o!==b && o._n.length>b._n.length && o._n.includes(b._n)));
        if(!ms.length) return; r.ags = ms.map(b=>{ let a = N.agents.find(x=>x.ref===b.ref && b.ref!=null) || N.agents.find(x=>norm(x.agent)===b._n);
          if(!a){ a = snapshot(b); N.agents.push(a); toUid[norm(a.agent)] = a.uid; } return a.agent; }); });
      if(N.agents.length) changes.push("Tableau des agents illisible (image dans le Word) : "+N.agents.length+" agent(s) retrouvé(s) d'après le plan, VLEP de ta base.");
    }
    const findAg = line => { const n = norm(line); if(toUid[n]) return toUid[n]; const k = Object.keys(toUid).find(x=>x.length>4 && (n===x || n.includes(x) || x.includes(n))); return k ? toUid[k] : null; };
    N.ateliers = R.ateliers; const gAll = N.ateliers.flatMap(a=>a.gehs);
    const findGeh = lab => { const t = lab.replace(/^\s*(geh\s*)?\d+\s*[–\-:.]?\s*/i,""), n = norm(t); return gAll.find(g=>norm(g.des)===n) || gAll.find(g=>n && (norm(g.des).includes(n) || n.includes(norm(g.des)))) || null; };
    N.plan = R.plan.map(r=>{ if(r.kind==="sec") return {id:uid(), kind:"sec", txt:r.txt};
      const ag = [], tx = []; r.ags.forEach(l=>{ const u = findAg(l); if(u) { if(!ag.includes(u)) ag.push(u); } else tx.push(l); });
      const g = findGeh(r.geh); if(g) ag.forEach(u=>{ if(!g.agents.includes(u)) g.agents.push(u); });
      return {id:uid(), kind:"row", jour:r.jour, ag, agTxt:tx.join("\n"), gehId: g ? g.id : (r.geh ? "__txt" : ""), gehTxt: g ? "" : r.geh, nb: r.nb!=="" && !isNaN(+r.nb) ? +r.nb : r.nb, type:r.type, plage:r.plage}; });
    N.just = R.just;
    S = normalize(N); tGeh = null; selG.clear(); persist(); bindEnt(); renderSel(); renderList(); renderGeh();
    const nT = gAll.reduce((n,g)=>n+g.taches.length,0);
    m.innerHTML = '<b>Stratégie reprise :</b> '+S.agents.length+' agent(s), '+S.ateliers.length+' atelier(s), '+gAll.length+' GEH, '+nT+' ligne(s) de tâche, '+S.plan.filter(r=>r.kind!=="sec").length+' ligne(s) de plan, '+S.just.length+' justification(s). '+
      (changes.length ? '<div class="warn"><b>VLEP modifiées depuis la stratégie d\'origine ('+changes.length+')</b> — valeurs de ta base actuelle reprises :<br>'+changes.map(esc).join("<br>")+'</div>' : '<div class="ok">Aucune VLEP modifiée par rapport à ta base actuelle.</div>')+
      (missing.length ? '<div class="warn"><b>'+missing.length+' agent(s) absent(s) de la base</b> (gardés tels quels) : '+esc(missing.join(" ; "))+'</div>' : '')+
      '<div class="legend">À mettre à jour : n° d\'affaire, dates, visite préalable (onglet Terrain), nouveaux produits (import Seirich possible ensuite, il remplacera GEH et tâches), plan et justifications.</div>';
}
reg("fPrev", async e=>{
  const f = e.target.files[0]; if(!f) return; const m = $("#prevMsg");
  try{
    m.textContent = "Lecture…"; const R = await parseStrategie(await f.arrayBuffer());
    if(!R.agents.length && !R.ateliers.length) throw new Error("Aucun tableau d'agents ni de GEH reconnu : ce n'est pas une stratégie SOCOTEC.");
    if(S.agents.length||S.ateliers.length||(S.ent.nom||"").trim()) newDossier();
    applyPrevRes(R, f.name, m);
  }catch(err){ m.textContent = "Échec de la reprise : "+err.message; }
  e.target.value = "";
});
