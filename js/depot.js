"use strict";
/* ================= Dépôt unique de documents (devis, Seirich, ancien rapport, FDS…) ================= */
const CAS_ANY = /\b\d{2,7}-\d{2}-\d\b/;
function parseAnnexe(SH){
  const res = {ent:{}, agents:[], ateliers:[], plan:[], just:[], warn:[]}, cl = t => String(t==null?"":t).replace(/_x000D_/g,"").replace(/\r/g,"").trim();
  const D = SH["Décomposition en GEH"]; if(D){ let at = null;
    D.forEach(r=>{ if(!r) return; const a = cl(r[0]), b = cl(r[1]); let m;
      if((m = /^Atelier\s*\d+\s*:\s*(.*)$/i.exec(a))){ at = {id:uid(), nom:m[1].trim()||"Atelier", gehs:[]}; res.ateliers.push(at); }
      else if(/^\d+$/.test(a) && b && !/^d[ée]signation/i.test(b)){ if(!at){ at = {id:uid(), nom:"Atelier", gehs:[]}; res.ateliers.push(at); } const c = cl(r[2]); at.gehs.push({id:uid(), des:b, eff: (c && !/^\d+\s*-\s*/.test(c)) ? c : "", orga:"", epc:"", epi:"", com:"", taches:[], agents:[], srcs:[b], num:a}); } }); }
  Object.keys(SH).filter(n=>/^Tableau Accr/i.test(n)).forEach(n=>{ SH[n].forEach(r=>{ if(!r) return; const nm = cl(r[0]).replace(/\n/g," "), cas = cl(r[1]); if(!nm || !CAS_ANY.test(cas)) return; if(res.agents.some(x=>x.cas===cas)) return;
      res.agents.push({agent:nm, cas, cmr:cl(r[3]), v8:cl(r[4]), vct:cl(r[5]), accP:/x/i.test(cl(r[6]))?"X":"", accA:/x/i.test(cl(r[7]))?"X":"", type:"adm"}); }); });
  Object.keys(SH).filter(n=>/^Plan d.\s?[ée]chantillonnage/i.test(n)).forEach(n=>{ const R = SH[n]; const hi = R.findIndex(r=>r && norm(r[0])==="jour"); if(hi<0) return;
    R.slice(hi+1).forEach(r=>{ if(!r) return; const c = i => cl(r[i]); if(!c(0) && !c(1) && !c(2)) return;
      if(c(0) && !c(1) && !c(2) && !c(3)){ res.plan.push({kind:"sec", txt:c(0)}); return; }
      res.plan.push({kind:"row", jour:c(0), ags:c(1).split("\n").map(x=>x.trim()).filter(Boolean), geh:c(2), nb:c(3), type:c(4), plage:c(5)}); }); });
  return res;
}
function entFromText(t){
  const e = {}, L = t.split(/\n/).map(x=>x.trim()).filter(Boolean); let m;
  if((m = /\b(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})\b/.exec(t))) e.siret = m[1].replace(/\s/g,"");
  if((m = /(?:NAF|APE)[^A-Za-z0-9]{0,12}(\d{2}\.?\d{2}\s?[A-Z])\b/i.exec(t))) e.naf = m[1].replace(/\s/g,"").toUpperCase();
  if((m = /\b(\d{4}[A-Z0-9]{4}\d{7})\b/.exec(t))) e.affaire = m[1];
  if((m = /(?:à l[’']attention de|attention de|contact(?: sur (?:le )?site)?|interlocuteur)\s*:?\s*((?:M\.|Mme|Monsieur|Madame)?\s*[A-ZÉÈ][\wÀ-ÿ'’-]+(?:\s+[A-ZÉÈ][\wÀ-ÿ'’-]+){0,3})/i.exec(t))) e.contact = m[1].trim();
  if((m = /(\d{2,4})\s*(?:à\s*\d+\s*)?salari/i.exec(t))) e.effectif = m[0].trim();
  if((m = /(?:client|raison sociale|société|entreprise|nom)\s*:\s*([^\n|]{3,60})/i.exec(t))) e.nom = m[1].trim();
  const i = L.findIndex(l=>/^\d{5}\s+[A-ZÉÈÀ-Ý]/.test(l) || /\b\d{5}\s+[A-ZÉÈÀ-Ý][A-ZÉÈÀ-Ýa-zà-ÿ' -]{2,}$/.test(l));
  if(i>=0){ const mm = /(\d{5}\s+[A-ZÉÈÀ-Ýa-zà-ÿ' -]+)$/.exec(L[i]); if(mm) e.cpville = mm[1].trim(); const pre = L[i].replace(mm?mm[0]:"","").replace(/[,\s]+$/,"").trim(); if(pre) e.adresse = pre; else if(i>0 && !/^(à l|attention)/i.test(L[i-1])) e.adresse = L[i-1]; if(!e.nom && i>1 && !e.adresse) e.nom = L[i-2]; }
  return e;
}
async function docxText(buf){
  const z = await JSZip.loadAsync(buf), f = z.file("word/document.xml"); if(!f) throw new Error("Word invalide."); const doc = new DOMParser().parseFromString(await f.async("string"),"application/xml"), out = [];
  [...doc.getElementsByTagName("w:p")].forEach(p=>{ const t = wParaText(p).replace(/\s+/g," ").trim(); if(t) out.push(t); }); return {text:out.join("\n"), xml:doc};
}
async function classifyFile(f){
  const ext = (f.name.split(".").pop()||"").toLowerCase(), buf = await f.arrayBuffer();
  if(ext==="json"||ext==="zip") return {f, kind:"projet"};
  if(ext==="pdf"){ try{ const D = await readDevisPdf(buf); if(D) return {f, kind:"devis", pdfD:D}; }catch(err){ return {f, kind:"pdf", err:"Lecture du PDF impossible ("+err.message+")."}; } return {f, kind:"pdf"}; }
  if(/^docx?m?$/.test(ext)){ if(ext==="doc") return {f, kind:"inconnu"}; const z = await JSZip.loadAsync(buf), x = await z.file("word/document.xml").async("string");
    return {f, kind: (/Désignation du GEH/.test(x) && /Code NAF/.test(x)) ? "strategie" : "devis", buf}; }
  if(/^xls[xm]$/.test(ext)){ const SH = await readXlsx(buf);
    if(Object.keys(SH).some(n=>/^Plan d.\s?[ée]chantillonnage/i.test(n)) && SH["Décomposition en GEH"]) return {f, kind:"annexe", SH};
    if(SH["Tâches"] && SH["Zones"]) return {f, kind:"seirich", SH};
    if(SH["Composants"]) return {f, kind:"fds", SH};
    return {f, kind:"inventaire", SH}; }
  return {f, kind:"inconnu"};
}
const K_LAB = {projet:"Projet enregistré", strategie:"Ancien rapport (stratégie SOCOTEC)", annexe:"Annexe MonDevis", devis:"Devis / document client", seirich:"Seirich", inventaire:"Inventaire de produits", fds:"Résultats FDS", pdf:"PDF", inconnu:"Fichier non reconnu"};
const K_ORD = {projet:0, strategie:1, annexe:2, devis:3, seirich:4, inventaire:4, fds:5, pdf:6, inconnu:7};
let dropBusy = false;
async function processDrop(files){
  files = [...files]; if(!files.length || dropBusy) return; dropBusy = true; const log = $("#dropLog"); const rows = [];
  const draw = () => { log.innerHTML = '<ul class="cmp" style="list-style:none;padding:0">'+rows.map(r=>'<li class="'+r.cls+'"><b>'+esc(r.name)+'</b> — '+esc(r.kind)+'<br><span style="color:var(--mut)">'+r.msg+'</span></li>').join("")+'</ul>'; };
  try{
    const items = []; for(const f of files){ try{ items.push(await classifyFile(f)); }catch(err){ items.push({f, kind:"inconnu", err:err.message}); } }
    items.sort((a,b)=>K_ORD[a.kind]-K_ORD[b.kind]);
    items.forEach(it=>rows.push({name:it.f.name, kind:K_LAB[it.kind], msg:"En attente…", cls:"chg", it})); draw();
    const hasBase = items.some(i=>/^(strategie|annexe|seirich|inventaire|projet)$/.test(i.kind));
    if(hasBase && !items.some(i=>i.kind==="projet") && (S.agents.length||S.ateliers.length||(S.ent.nom||"").trim())) newDossier();
    const mk = f => ({target:{files:[f], value:""}});
    for(const r of rows){ const it = r.it; r.msg = "Lecture…"; draw();
      try{
        if(it.kind==="projet"){ await HND.fOpen(mk(it.f)); r.msg = "Dossier ouvert."; }
        else if(it.kind==="strategie"){ await HND.fPrev(mk(it.f)); r.msg = $("#prevMsg").innerHTML; try{ const T = await docxText(await it.f.arrayBuffer()), e = entFromText(T.text); Object.keys(e).forEach(k=>{ if(!(S.ent[k]||"").trim()) S.ent[k]=e[k]; }); persist(); }catch(_){} }
        else if(it.kind==="annexe"){ const R = parseAnnexe(it.SH); if(!R.agents.length && !R.ateliers.length) throw new Error("Annexe vide : aucun agent ni GEH."); if(items.some(i=>i.kind==="strategie") && S.ateliers.length){ const add=[]; if(!(S.plan||[]).length && R.plan.length){ S.plan = R.plan; add.push("plan d'échantillonnage ("+R.plan.length+" lignes)"); } const have=new Set(S.agents.map(a=>a.cas)); let na=0; R.agents.forEach(a=>{ if(!have.has(a.cas)){ S.agents.push(a); na++; } }); if(na) add.push(na+" agent(s) en plus"); persist(); r.msg = "Stratégie déjà chargée dans ce lot : elle prime. "+(add.length?"Ajouté depuis l'annexe : "+add.join(", ")+".":"Rien à ajouter."); }
          else { if(S.agents.length||S.ateliers.length) newDossier(); applyPrevRes(R, it.f.name, $("#prevMsg")); r.msg = $("#prevMsg").innerHTML; } }
        else if(it.kind==="devis"){ let e, T = null; if(it.pdfD){ e = it.pdfD.ent; } else { T = await docxText(it.buf); e = entFromText(T.text); } const got = []; Object.keys(e).forEach(k=>{ if(!(S.ent[k]||"").trim()){ S.ent[k] = e[k]; got.push(k); } });
          const LB = {nom:"nom",adresse:"adresse",cpville:"CP / ville",naf:"code NAF",siret:"SIRET",contact:"contact",effectif:"effectif",affaire:"n° d'affaire",contactFonction:"fonction",contactTel:"téléphone",contactMail:"e-mail",devis:"devis lié",redacteur:"rédacteur"}; let extra = "";
          if(it.pdfD){ const D = it.pdfD; if(D.geh.length && !S.ateliers.length){ const am = new Map(); D.geh.forEach(g=>{ let a = am.get(g.atelier); if(!a){ a = {id:uid(), nom:g.atelier, gehs:[]}; am.set(g.atelier, a); S.ateliers.push(a); } a.gehs.push(newGeh(g.des, g.eff, "")); }); extra += " "+D.geh.length+" GEH repris de l'annexe."; }
            if(D.cas.length){ let add = 0; const miss = []; D.cas.forEach(c=>{ const b = BASE.find(x=>x._c===c.cas); if(b){ if(addBase(b.ref)) add++; } else miss.push(c.nom||c.cas); }); extra += " "+add+" agent(s) ajouté(s) depuis l'annexe"+(miss.length?" ; absents de la base : "+miss.join(", "):"")+"."; } }
          persist(); bindEnt(); if(extra) { try{ renderGeh(); }catch(_){} }
          r.msg = (got.length ? "Repris : "+got.map(k=>LB[k]||k).join(", ")+". Vérifie les champs." : "Aucune information d'identification nouvelle (déjà renseignées ou format inhabituel).")+extra; r.cls = (got.length||extra) ? "add" : "del"; }
        else if(it.kind==="seirich"||it.kind==="inventaire"){
          if(S.ateliers.length){ await HND.fCmp(mk(it.f)); r.msg = "Comparé avec le dossier en cours : voir les écarts ci-dessous (bouton « Appliquer » pour intégrer)."; }
          else { await HND.fSeirich(mk(it.f)); r.msg = $("#impMsg").innerHTML; } }
        else if(it.kind==="fds"){ await HND.fFds(mk(it.f)); r.msg = $("#fdsMsg").innerHTML; }
        else if(it.kind==="pdf"){ r.msg = it.err || "PDF non reconnu comme devis SOCOTEC (seuls les devis « Proposition Commerciale » sont lus). Dépose plutôt la version Word / Excel."; r.cls = "del"; }
        else { r.msg = it.err || "Type non reconnu (attendu : Word, Excel .xlsx/.xlsm, projet .json)."; r.cls = "del"; }
        if(r.cls==="chg") r.cls = "add";
      }catch(err){ r.msg = "Échec : "+esc(err.message); r.cls = "del"; }
      draw(); }
    bindEnt(); renderSel(); renderList();
  } finally { dropBusy = false; }
}
(function(){
  const dz = $("#dropZone"), inp = $("#fAll");
  dz.addEventListener("click", ()=>inp.click()); dz.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); inp.click(); } });
  inp.addEventListener("change", ()=>{ processDrop(inp.files); setTimeout(()=>{ inp.value = ""; },0); });
  const over = (el,on)=>el.classList.toggle("over", on);
  ["dragenter","dragover"].forEach(ev=>document.addEventListener(ev, e=>{ if(e.dataTransfer && [...e.dataTransfer.types].includes("Files")){ e.preventDefault(); const c = e.target.closest && e.target.closest("[data-dropcat]"); $$(".dropping").forEach(x=>x.classList.remove("dropping")); (c||dz).classList.add("dropping"); } }));
  document.addEventListener("dragleave", e=>{ if(!e.relatedTarget) $$(".dropping").forEach(x=>x.classList.remove("dropping")); });
  document.addEventListener("drop", e=>{ if(!(e.dataTransfer && e.dataTransfer.files.length)) return; e.preventDefault(); $$(".dropping").forEach(x=>x.classList.remove("dropping"));
    const c = e.target.closest && e.target.closest("[data-dropcat]"), files = [...e.dataTransfer.files];
    if(c && c.dataset.dropcat!=="auto"){ (async()=>{ for(const f of files){ await HND[c.dataset.dropcat]({target:{files:[f], value:""}}); } })(); }
    else { processDrop(files); } });
  [["fSeirich"],["fFds"]].forEach(([id])=>{ const el = $("#"+id); const card = el && el.closest(".card"); if(card) card.dataset.dropcat = id; });
  const pc = $("#fPrev").closest(".card"); if(pc) pc.dataset.dropcat = "auto";
})();
function msg(h, cls){ $("#expMsg").innerHTML = '<div class="'+(cls||"ok")+'">'+h+'</div>'; }
$("#bWord").onclick = async ()=>{
  try{
    const zip = await JSZip.loadAsync(trameBuf || b64ToBytes(TRAME_B64));
    const f = zip.file("word/document.xml"); if(!f) throw new Error("Fichier Word invalide.");
    let xml = await f.async("string");
    xml = fillCover(xml); xml = dropRedClient(xml); xml = fillErc(xml); xml = fillTable24(xml); xml = fillIdent(xml); if(S.ateliers.length) xml = fillAteliers(xml); if(S.ateliers.length) xml = fillGeh(xml); if(S.plan.length) xml = fillPlan(xml); xml = fillJust(xml);
    zip.file("word/document.xml", xml);
    for(const n of Object.keys(zip.files)){ if(/^word\/footer\d*\.xml$/.test(n)){ const fx = await zip.file(n).async("string"); if(/affaire/.test(fx)) zip.file(n, fillFooter(fx, (S.ent.affaire||"").trim())); } }
    const blob = await zip.generateAsync({type:"blob", compression:"DEFLATE", mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
    download(blob, "Strategie_"+safe(S.ent.nom)+"_"+today()+".docx");
    msg("Word généré : "+S.agents.filter(a=>!noLab(a)).length+" agent(s) dans le tableau §2.4, identification remplie"+(S.ateliers.length?", GEH et tâches (§3.7)":"")+(S.plan.length?", plan d'échantillonnage ("+S.plan.filter(r=>r.kind!=="sec").length+" lignes).":"."));
  }catch(err){ msg("Échec de l'export Word : "+esc(err.message), "warn"); }
};
