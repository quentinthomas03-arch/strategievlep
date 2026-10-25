"use strict";
/* ================= Lecture des devis PDF SOCOTEC (pdf.js embarqué, local) ================= */
let PDFJS = null;
const blobUrl = id => URL.createObjectURL(new Blob([PDFJS_SOURCES[id]], {type:"text/javascript"}));
async function loadPdfJs(){
  if(PDFJS) return PDFJS;
  const lib = await import(blobUrl("pdfLib")); lib.GlobalWorkerOptions.workerSrc = blobUrl("pdfWorker"); PDFJS = lib; return lib;
}
async function pdfPages(buf){
  const lib = await loadPdfJs(), doc = await lib.getDocument({data:new Uint8Array(buf), isEvalSupported:false, disableFontFace:true, useSystemFonts:true}).promise, pages = [];
  for(let p=1;p<=doc.numPages;p++){
    const pg = await doc.getPage(p), vp = pg.getViewport({scale:1}), tc = await pg.getTextContent(), rows = [];
    tc.items.filter(i=>i.str && i.str.trim()).map(i=>({s:i.str.trim(), x:i.transform[4], y:i.transform[5]})).sort((a,b)=>b.y-a.y||a.x-b.x).forEach(i=>{
      let r = rows.find(r=>Math.abs(r.y-i.y)<2.5); if(!r){ r = {y:i.y, it:[]}; rows.push(r); } r.it.push(i); });
    rows.sort((a,b)=>b.y-a.y).forEach(r=>r.it.sort((a,b)=>a.x-b.x));
    pages.push({w:vp.width, rows, text:rows.map(r=>r.it.map(i=>i.s).join(" ")).join("\n")});
  }
  return pages;
}
const pdfCol = (rows, mid, side) => rows.map(r=>({y:r.y, s:r.it.filter(i=>side==="L" ? i.x<mid : i.x>=mid).map(i=>i.s).join(" ").trim()})).filter(r=>r.s);
function pdfBlock(lines){ /* lignes d'un bloc "nom / adresse / CP ville / contact…" */
  const o = {}, clean = s => s.replace(/\s+/g," ").trim(); let i = 0;
  const cp = lines.findIndex(l=>/^\d{5}\s+\S/.test(l)); const ci = lines.findIndex(l=>/^contact/i.test(l));
  const head = lines.slice(0, ci>=0 ? ci : lines.length);
  const cpi = head.findIndex(l=>/^\d{5}\s+\S/.test(l));
  if(cpi>=0){ o.nom = head[0]; o.adresse = head.slice(1,cpi).join(", "); o.cpville = head[cpi]; } else if(head.length) o.nom = head[0];
  const body = ci>=0 ? lines.slice(ci+1) : [];
  if(body.length){ const nm = body.find(l=>!/^(fonction|email|e-mail|tel)/i.test(l)); if(nm){ const w = nm.split(/\s+/), up = w.filter(x=>x===x.toUpperCase() && /[A-ZÀ-Ý]/.test(x)), low = w.filter(x=>!up.includes(x)); o.contact = clean((low.length ? low.join(" ")+" " : "")+up.join(" ")); }
    body.forEach(l=>{ let m; if((m = /^fonction\s*:\s*(.+)$/i.exec(l))) o.fonction = m[1].trim(); else if((m = /^e-?mail\s*:\s*(\S+)/i.exec(l))) o.mail = m[1]; else if((m = /^tel\s*\((?:fixe|mobile)\)\s*:\s*([\d .]+)/i.exec(l))){ const t = m[1].replace(/\s/g,""); o.tel = o.tel ? (o.tel.includes(t)?o.tel:o.tel+" / "+t) : t; } }); }
  return o;
}
async function readDevisPdf(buf){
  const P = await pdfPages(buf), all = P.map(p=>p.text).join("\n");
  if(!/N° Devis\/Affaire/i.test(all) || !/SOCOTEC/i.test(all)) return null;
  const R = {ent:{}, geh:[], cas:[], info:{}}, e = R.ent; let m;
  if((m = /N° Devis\/Affaire\s*:\s*(\d{4}[A-Z0-9]{4}\d{7})\s*\(Rev(\d+)\)/i.exec(all))){ e.affaire = m[1]; R.info.rev = m[2]; }
  if((m = /Date d.emission du devis\s*:\s*(\d{2}\/\d{2}\/\d{4})/i.exec(all))) R.info.date = m[1];
  const p1 = P[0], mid1 = p1.w*0.5, ys = p1.rows.find(r=>/SYNTHESE DU DEVIS/i.test(r.it.map(i=>i.s).join(" "))), yd = p1.rows.find(r=>/^D[ée]signation missions/i.test(r.it.map(i=>i.s).join(" ")));
  const rc = pdfCol(p1.rows, mid1, "R").filter(r=>(!ys||r.y<ys.y) && (!yd||r.y>yd.y) && r.y>60 && !/^\d+\s*\/\s*\d+$/.test(r.s)).map(r=>r.s), lc = pdfCol(p1.rows, mid1, "L").map(r=>r.s);
  const ia = rc.findIndex(l=>/^A l.attention de/i.test(l)), before = ia>=0 ? rc.slice(0,ia) : rc, after = ia>=0 ? rc.slice(ia+1) : [];
  const cpi = before.findIndex(l=>/^\d{5}\s+\S/.test(l)); if(before.length) e.nom = before[0]; if(cpi>0){ e.adresse = before.slice(1,cpi).join(", "); e.cpville = before[cpi]; }
  after.forEach((l,i)=>{ if(/@/.test(l)) e.contactMail = l; else if(/^[\d\s|.]{9,}$/.test(l)) e.contactTel = l.replace(/[\s.]/g,"").replace(/\|/g," / "); else if(i===0) e.contact = l; else if(!e.contactFonction) e.contactFonction = l; });
  const ir = lc.findIndex(l=>/^R[ée]dacteur/i.test(l)); if(ir>=0 && lc[ir+1]) R.info.redacteur = lc[ir+1];
  /* bloc facturation / intervention (adresse du site = adresse d'intervention) */
  P.forEach(p=>{ const hi = p.rows.find(r=>/Adresse de facturation/i.test(r.it.map(i=>i.s).join(" "))); if(!hi || R.site) return;
    const he = p.rows.find(r=>r.y<hi.y && /^Documents contractuels/i.test(r.it.map(i=>i.s).join(" "))), mid = (hi.it.find(i=>/Adresse d.intervention/i.test(i.s))||{x:p.w/2}).x-10;
    const lim = r=>r.y<hi.y && (!he || r.y>he.y);
    R.fact = pdfBlock(pdfCol(p.rows, mid, "L").filter(lim).map(r=>r.s)); R.site = pdfBlock(pdfCol(p.rows, mid, "R").filter(lim).map(r=>r.s)); });
  const S0 = R.site || {}, F0 = R.fact || {};
  if(S0.nom) e.nom = F0.nom || S0.nom; if(S0.adresse) e.adresse = S0.adresse; if(S0.cpville) e.cpville = S0.cpville;
  if(S0.contact){ e.contact = S0.contact; if(S0.fonction) e.contactFonction = S0.fonction; if(S0.mail) e.contactMail = S0.mail; if(S0.tel) e.contactTel = S0.tel; }
  /* mission */
  const mission = []; if((m = /VLEP\s*#\s*0?(\d)\s*[–-]\s*([^\n]+)/i.exec(all))) mission.push("VLEP #0"+m[1]+" – "+({"1":"contrôle des VLEP","2":"stratégie de prélèvements"}[m[1]] || m[2].replace(/\s+/g," ").trim().slice(0,60)));
  if((m = /Campagne de mesure de\s*(\d+)\s*jours?.{0,30}?\s(\d+)\s*intervenant/i.exec(all.replace(/\n/g," ")))){ R.info.jours = +m[1]; R.info.interv = +m[2]; mission.push("campagne de "+m[1]+" jour(s), "+m[2]+" intervenant(s)"); }
  if((m = /Montant Total HT[^\d]*([\d ]+,\d{2})/i.exec(all))){ R.info.ht = m[1].trim(); mission.push(R.info.ht+" € HT"); }
  e.devis = ("Devis "+(e.affaire||"")+(R.info.rev!=null?" (Rev"+R.info.rev+")":"")+(R.info.date?" du "+R.info.date:"")+(mission.length?" · "+mission.join(" · "):"")).trim();
  if(R.info.redacteur) e.redacteur = R.info.redacteur;
  /* annexe : GEH */
  let inG = false, at = "";
  P.forEach(p=>p.rows.forEach(r=>{ const t = r.it.map(i=>i.s).join(" ");
    if(/D[ée]signation du GEH/i.test(t)){ inG = true; return; } if(/^Plan d.[ée]chantillonnage/i.test(t) || /^ACCREDITATIONS/i.test(t)) inG = false;
    if(/^Atelier\s*\d*\s*:/i.test(t)){ at = t.replace(/\s*:.*$/,"").trim()+(/:\s*\S/.test(t)?" : "+t.split(":").slice(1).join(":").trim():""); return; }
    if(inG){
      if(r.it.length>=2 && /^\d{1,3}$/.test(r.it[0].s)){ const d = r.it.slice(1).filter(i=>!/^[-–]$|^\d{1,4}$/.test(i.s) || i===r.it[1]).map(i=>i.s), eff = r.it[r.it.length-1].s; R.geh.push({n:+r.it[0].s, des:r.it[1].s, eff: /^\d+$/.test(eff) && r.it.length>2 ? eff : "", atelier:at||"Atelier"}); } } }));
  /* annexe : agents (lignes portant un n° CAS) */
  const seen = new Set(); let inA = false;
  P.forEach(p=>{ if(/ACCREDITATIONS|M[ée]thodes de r[ée]f[ée]rence/i.test(p.text)) inA = true; if(!inA) return;
    p.rows.forEach(r=>{ const ci = r.it.findIndex(i=>/^\d{2,7}-\d{2}-\d$/.test(i.s)); if(ci<0) return; const cas = r.it[ci].s; if(seen.has(cas)) return; seen.add(cas); R.cas.push({cas, nom:r.it.slice(0,ci).map(i=>i.s).join(" ")}); }); });
  return R;
}
