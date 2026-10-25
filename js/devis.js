"use strict";
/* ================= Faisabilité & devis (catalogues SOCOTEC AIR / TERA / Toxilabo, local) ================= */
const DV_EQUIV = {
 "7778-50-9":["18540-29-9","Dichromate = Cr(VI) : dosage du chrome hexavalent total"],
 "136-52-7":["7440-48-4","Composé du cobalt : dosage du cobalt (élément)"], "10141-05-6":["7440-48-4","Composé du cobalt : dosage du cobalt (élément)"],
 "1307-96-6":["7440-48-4","Composé du cobalt : dosage du cobalt (élément)"], "1308-06-1":["7440-48-4","Composé du cobalt : dosage du cobalt (élément)"],
 "513-79-1":["7440-48-4","Composé du cobalt : dosage du cobalt (élément)"], "7646-79-9":["7440-48-4","Composé du cobalt : dosage du cobalt (élément)"],
 "71-48-7":["7440-48-4","Composé du cobalt : dosage du cobalt (élément)"], "10124-43-3":["7440-48-4","Composé du cobalt : dosage du cobalt (élément)"],
 "592-85-8":["7439-97-6","Composé du mercure : dosage du mercure (élément)"], "7783-35-9":["7439-97-6","Composé du mercure : dosage du mercure (élément)"],
 "7761-88-8":["7440-22-4","Composé de l'argent : dosage de l'argent (élément)"],
 "7646-85-7":["7440-66-6","Composé du zinc : dosage du zinc (élément)"], "13463-41-7":["7440-66-6","Pyrithione de zinc : dosage du zinc (élément), indicatif"],
 "12027-67-7":["7439-98-7","Molybdate : dosage du molybdène (élément)"], "10102-40-6":["7439-98-7","Molybdate : dosage du molybdène (élément)"],
 "7722-64-7":["7439-96-5","Permanganate : dosage du manganèse (élément)"], "1344-28-1":["7429-90-5","Oxyde d'aluminium : dosage de l'aluminium (élément)"],
 "10043-35-3":["7440-42-8","Acide borique : dosage du bore (élément)"]
};
const DV_DUST = new Set(["471-34-1","9004-34-6","57-50-1","12125-02-9","56-81-5","8002-74-2"]);
const DV_PASS = /radiello|badge|passif|gabie/i;
const DV = {rows:[], plan:[], ready:false, byCas:null, byName:null, dust:[]};
function dvInit(){
  if(DV.byCas) return;
  DV.byCas = new Map(); DV.byName = new Map();
  const I = CATDATA.items, F = CATDATA.fams;
  CATDATA.offers.forEach(r=>{
    const sp = r.s>=0 ? I[r.s] : null, pr = r.r>=0 ? I[r.r] : null, f = F[r.f];
    const o = {nom:r.n, code:r.c, cas:r.a, cofrac:!!r.k, lq:r.q, meth:r.m, pa:r.p, extra:(r.e==null?null:r.e), sup:sp, pre:pr, fam:f[2]+"|"+f[1]+"|"+f[0], famName:f[0], lab:r.l, src:r.o, variants:r.v||"", lqug:dvLq(r.q)};
    r.a.forEach(c=>{ if(!DV.byCas.has(c)) DV.byCas.set(c,[]); DV.byCas.get(c).push(o); });
    const nn = norm(r.n); if(!DV.byName.has(nn)) DV.byName.set(nn,[]); DV.byName.get(nn).push(o);
    if(r.c==="LSA55" || r.c==="N810A") DV.dust.push(o);
  });
}
function dvLq(s){ s = String(s||"").replace(",","."); const m = /([\d.]+)\s*(µg|ug|mg|ng)?/.exec(s); if(!m) return null; const v = parseFloat(m[1]); if(isNaN(v)) return null; const u = m[2]||"µg"; return u==="mg" ? v*1000 : (u==="ng" ? v/1000 : v); }
function dvTotal(o){ return (o.pa||0) + (o.sup&&o.sup[2]||0) + (o.pre&&o.pre[2]||0); }
function dvOffers(cas, nom){
  cas = String(cas||"").trim();
  if(cas && DV.byCas.has(cas)) return {list:DV.byCas.get(cas), mode:"direct", ex:""};
  if(DV_EQUIV[cas] && DV.byCas.has(DV_EQUIV[cas][0])) return {list:DV.byCas.get(DV_EQUIV[cas][0]), mode:"équivalence", ex:DV_EQUIV[cas][1]};
  if(DV_DUST.has(cas) && DV.dust.length) return {list:DV.dust, mode:"équivalence", ex:"Poussières : dosage gravimétrique des poussières inhalables (à valider selon la nature réelle de l'agent)"};
  const n = norm(nom||""); if(n && DV.byName.has(n)) return {list:DV.byName.get(n), mode:"nom", ex:""};
  return {list:[], mode:"", ex:""};
}
function dvBase(cas){ cas = String(cas||"").trim(); return cas ? BASE.filter(b=>b._c===cas) : []; }
function dvLabMatch(a,b){ a = norm(a); b = norm(b); return !!a && !!b && (a.includes(b) || b.includes(a) || (a.includes("eurofins") && b.includes("eurofins"))); }
function dvRank(list, cas, base){
  const codes = new Set((CATDATA.bc[cas]||[])), labs = base.map(b=>b.labo).filter(Boolean);
  const k = o => [codes.has(o.code)?0:1, labs.some(l=>dvLabMatch(l,o.lab))?0:1, o.cofrac?0:1, dvTotal(o)];
  return list.slice().sort((x,y)=>{ const a = k(x), b = k(y); for(let i=0;i<4;i++){ if(a[i]!==b[i]) return a[i]-b[i]; } return 0; });
}
function dvFlow(a, o){
  if(DV_PASS.test(o.famName+" "+(o.sup?o.sup[1]:""))) return "P";
  for(const b of a.base){ if(b.labo && dvLabMatch(b.labo,o.lab)){ const mn = parseFloat(String(b.dmin8).replace(",",".")), mx = parseFloat(String(b.dmax8).replace(",",".")); if(!isNaN(mn) && !isNaN(mx)) return [mn,mx]; } }
  return null;
}
function dvSplit(mem){
  const fl = mem.map(m=>dvFlow(m.a,m.o)), ord = mem.map((m,i)=>i).sort((i,j)=>{ const a = Array.isArray(fl[i]), b = Array.isArray(fl[j]); if(a!==b) return a?-1:1; return a ? fl[i][0]-fl[j][0] : 0; });
  const out = [];
  ord.forEach(i=>{ const f = fl[i]; let g = null;
    for(const x of out){ if(!Array.isArray(f) || !x.f){ g = x; if(Array.isArray(f) && !x.f) x.f = f; break; } const lo = Math.max(x.f[0],f[0]), hi = Math.min(x.f[1],f[1]); if(lo<=hi){ x.f = [lo,hi]; g = x; break; } }
    if(!g){ g = {f:Array.isArray(f)?f:null, m:[]}; out.push(g); } g.m.push(mem[i]); });
  return out.map(g=>g.m);
}
function dvGroupCost(mem){
  let sup = 0, pre = 0, an = 0, s0 = null, p0 = null;
  mem.forEach(({o})=>{ if(s0==null && o.sup && o.sup[2]!=null){ s0 = 1; sup = o.sup[2]; } if(p0==null && o.pre && o.pre[2]!=null){ p0 = 1; pre = o.pre[2]; } });
  if(mem.every(({o})=>o.src==="TERA")){ const s = mem.slice().sort((x,y)=>(y.o.pa||0)-(x.o.pa||0)); an = (s[0].o.pa||0) + s.slice(1).reduce((t,m)=>t+(m.o.extra!=null?m.o.extra:(m.o.pa||0)),0); }
  else an = mem.reduce((t,m)=>t+(m.o.pa||0),0);
  return {sup, pre, an, tot:sup+pre+an};
}
function dvAnalyse(inp, labsOk){
  dvInit();
  const A = [];
  inp.forEach(x=>{
    const cas = (x.cas||"").trim(); let r = dvOffers(cas, x.nom);
    const base = dvBase(cas), key = cas || norm(x.nom), sel = (S.dvSel||{})[key]; let mode = r.mode, ex = r.ex, valid = false, skipped = false, manual = false;
    const allR = r.list.length ? dvRank(r.list, cas, base) : [];
    let list = allR.filter(o=>labsOk.has(o.lab));
    if(sel && sel.t==="o"){ const i = allR.findIndex(o=>o.lab===sel.lab && o.code===sel.code && (o.famName||"")===(sel.fam||"")); if(i>=0){ const c = allR[i]; list = [c].concat(list.filter(o=>o!==c)); valid = true; } }
    else if(sel && sel.t==="c"){ list = [dvCustom(sel.o)]; mode = "manuel"; ex = "Solution saisie : "+[sel.o.lab, sel.o.nom, sel.o.sup].filter(Boolean).join(" · "); manual = true; }
    else if(sel && sel.t==="x"){ list = []; skipped = true; }
    let fl = null; for(const b of base){ const mn = parseFloat(String(b.dmin8).replace(",",".")), mx = parseFloat(String(b.dmax8).replace(",",".")); if(!isNaN(mn)&&!isNaN(mx)){ fl = [mn,mx]; break; } }
    A.push(Object.assign({}, x, {cas, key, mode, ex, offs:list, all:allR, base, fl, valid, skipped, manual, sel:sel||null, filtered:r.list.length>0 && !list.length && !skipped}));
  });
  /* GEH -> prélèvements regroupés (couverture gloutonne par famille de prélèvement) */
  const gm = new Map(); A.forEach(a=>(a.gehs.length?a.gehs:["Ensemble"]).forEach(g=>{ if(!gm.has(g)) gm.set(g,[]); gm.get(g).push(a); }));
  const plan = [];
  gm.forEach((ags,g)=>{
    const rem = ags.filter(a=>a.offs.length), none = ags.filter(a=>!a.offs.length), fams = new Map();
    rem.forEach(a=>a.offs.forEach(o=>{ if(!fams.has(o.fam)) fams.set(o.fam,new Map()); const m = fams.get(o.fam); if(!m.has(a)) m.set(a,o); }));
    const left = new Set(rem), picks = [];
    while(left.size){
      let best = null, bs = null;
      fams.forEach((m,k)=>{ let n = 0, c = 0; m.forEach((o,a)=>{ if(left.has(a)){ n++; if(o.cofrac) c++; } }); if(!best || n>bs[0] || (n===bs[0] && c>bs[1])){ best = k; bs = [n,c]; } });
      const mem = []; fams.get(best).forEach((o,a)=>{ if(left.has(a)) mem.push({a,o}); });
      if(!mem.length) break;
      dvSplit(mem).forEach(sub=>picks.push(sub)); mem.forEach(({a})=>left.delete(a));
    }
    plan.push({geh:g, picks, none});
  });
  return {A, plan};
}
/* ---- entrée ---- */
function dvInputProject(withCand){
  const out = new Map(), put = (nom,cas,v8,vct,cmr,geh)=>{ const k = cas || norm(nom); let x = out.get(k); if(!x){ x = {nom, cas:cas||"", v8:v8||"", vct:vct||"", cmr:cmr||"", gehs:[], prods:[]}; out.set(k,x); } if(geh && !x.gehs.includes(geh)) x.gehs.push(geh); return x; };
  S.ateliers.forEach(a=>a.gehs.forEach(g=>{ const gn = g.des||"(GEH sans nom)";
    [...new Set((g.agents||[]).concat(agentsOfGeh(g)))].forEach(u=>{ const ag = S.agents.find(x=>x.uid===u); if(ag) put(ag.agent, ag.cas, ag.v8, ag.vct, ag.cmr, gn); });
    if(withCand){ const names = new Set([g.des].concat(g.srcs||[])); (S.cand||[]).forEach(c=>{ if(c.emis) return; if((c.gehs||[]).some(n=>names.has(n))){ const x = put(c.nom, c.cas, c.v8, c.vct, c.cmr, gn); (c.prods||[]).forEach(p=>{ if(!x.prods.includes(p)) x.prods.push(p); }); } }); } }));
  if(!out.size) (S.agents||[]).forEach(ag=>put(ag.agent, ag.cas, ag.v8, ag.vct, ag.cmr, ""));
  return [...out.values()];
}
function dvParseLines(lines){
  const out = new Map();
  lines.forEach(line=>{
    const f = String(line).split(/\t|;/).map(s=>s.trim()).filter(Boolean); if(!f.length) return;
    let geh = "", cas = "", nom = "";
    f.forEach(s=>{ const m = CAS_RE.exec(s); if(m && s.replace(m[0],"").trim().length<3) cas = m[0]; });
    const rest = f.filter(s=>!(CAS_RE.exec(s) && s.replace(CAS_RE.exec(s)[0],"").trim().length<3));
    if(rest.length>=2){ geh = rest[0]; nom = rest.slice(1).join(" "); } else if(rest.length===1){ if(cas && f.length>=2) geh = rest[0]; else nom = rest[0]; }
    if(!cas){ const m = CAS_RE.exec(nom); if(m) cas = m[0]; }
    if(!nom && !cas) return;
    if(!cas){ const b = BASE.find(b=>b._n===norm(nom)); if(b) cas = b._c||""; }
    if(/^(agent|cas|n° cas|nom)$/i.test(nom) || /^n° ?cas$/i.test(cas)) return;
    const k = cas || norm(nom); let x = out.get(k); if(!x){ const b = cas ? BASE.find(b=>b._c===cas) : null; x = {nom:nom||(b?b.agent:cas), cas, v8:b?b.v8:"", vct:b?b.vct:"", cmr:"", gehs:[], prods:[]}; out.set(k,x); }
    if(geh && !x.gehs.includes(geh)) x.gehs.push(geh);
  });
  return [...out.values()];
}
async function dvReadFile(f){
  const ext = (f.name.split(".").pop()||"").toLowerCase();
  if(/^xls[xm]$/.test(ext)){
    const SH = await readXlsx(await f.arrayBuffer()), lines = [];
    Object.keys(SH).forEach(n=>{ const R = SH[n]; if(!R.length) return;
      let gc = -1; R.slice(0,12).forEach(r=>r.forEach((c,j)=>{ if(gc<0 && /^(geh|poste|groupe|zone|atelier)/i.test(String(c||"").trim())) gc = j; }));
      R.forEach(r=>{ const cells = r.map(c=>String(c==null?"":c).trim()); if(!cells.some(Boolean)) return;
        const cj = cells.findIndex(c=>/^\d{2,7}-\d{2}-\d$/.test(c)), nm = cells.findIndex((c,j)=>c && j!==cj && j!==gc && !/^[\d.,\s\-\/]+$/.test(c) && c.length>2);
        if(cj<0 && nm<0) return; const geh = gc>=0 ? cells[gc] : "";
        lines.push([geh, nm>=0?cells[nm]:"", cj>=0?cells[cj]:""].filter(Boolean).join(";")); }); });
    return lines.join("\n");
  }
  return await f.text();
}
/* ---- rendu ---- */
const dvEur = v => v==null ? "" : v.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
function dvStatus(a){ const o = a.offs[0]; if(a.skipped) return "Écarté (choix)"; if(!o) return a.filtered ? "Hors labos cochés" : "Non trouvé"; if(a.manual) return "Solution saisie – à confirmer avec le labo"; return "Faisable – "+(o.cofrac?"accrédité COFRAC":"non accrédité")+(a.mode==="équivalence" ? (a.valid ? " – équivalence validée" : " – équivalence à valider") : ""); }
const dvNum = v => { const n = parseFloat(String(v==null?"":v).replace(",",".")); return isNaN(n) ? null : n; };
function dvCustom(c){ const sp = dvNum(c.supPrix), pp = dvNum(c.prePrix);
  return {lab:c.lab||"Saisie manuelle", src:"manuel", code:c.code||"—", nom:c.nom||"Solution saisie", lq:c.lq||"", meth:c.meth||"", cofrac:!!c.cofrac, fam:"manuel|"+norm(c.lab)+"|"+norm(c.sup)+"|"+norm(c.pre), famName:[c.sup,c.pre].filter(Boolean).join(" + "),
    sup: c.sup ? ["", c.sup, sp] : null, pre: c.pre ? ["", c.pre, pp] : null, pa: dvNum(c.prix)||0, extra:null, variants:"", lqug:null}; }
function dvLabBase(a){ return [...new Set(a.base.map(b=>b.labo).filter(l=>l && l!=="-" && !/sans objet/i.test(l)))].join(" / "); }
function dvVol(a){ const o = a.offs[0], v = parseFloat(String(a.v8).replace(",",".")); return (o && o.lqug && v>0) ? o.lqug/(0.1*v) : null; }
function dvFlowTxt(mem){
  const ff = mem.map(m=>dvFlow(m.a,m.o)); if(ff.every(f=>f==="P")) return "passif (sans pompe)";
  const fl = ff.filter(Array.isArray); if(!fl.length) return "à vérifier (débit absent de la base)";
  const lo = Math.max(...fl.map(f=>f[0])), hi = Math.min(...fl.map(f=>f[1]));
  return lo+"–"+hi+" L/min"+(fl.length<mem.length ? " (partiel : certains agents sans débit en base)" : "");
}
function dvPlanRows(R){
  const rows = []; let tg = 0, ts = 0;
  R.plan.forEach(p=>{
    p.picks.forEach((mem,n)=>{ const o0 = mem[0].o, c = dvGroupCost(mem), sep = mem.reduce((t,m)=>t+dvTotal(m.o),0); tg += c.tot; ts += sep;
      rows.push([p.geh, n+1, o0.lab, o0.famName, o0.sup?(o0.sup[0]+" – "+o0.sup[1]):"", o0.pre?(o0.pre[0]+" – "+o0.pre[1]):"—", mem.length, mem.map(m=>m.a.nom).join(" ; "), mem.map(m=>m.o.code).join(" ; "), dvFlowTxt(mem), c.sup, c.pre, c.an, c.tot, sep, sep-c.tot, mem.every(m=>m.o.cofrac)?"Oui":"Partiel/Non"]); });
    if(p.none.length) rows.push([p.geh,"—","","Sans offre au catalogue","","",p.none.length,p.none.map(a=>a.nom).join(" ; "),"","","","","","","","",""]);
  });
  return {rows, tg, ts};
}
function renderDevis(){
  const w = $("#dvOut"); if(!DV.ready){ w.innerHTML = ""; return; }
  const R = DV.R, ok = R.A.filter(a=>a.offs.length).length, P = dvPlanRows(R), nPre = R.plan.reduce((t,p)=>t+p.picks.length,0);
  let h = '<div class="card"><h2>Résultat</h2><div class="ok">'+R.A.length+' agent(s) analysé(s) : <b>'+ok+'</b> avec offre au catalogue, <b>'+(R.A.length-ok)+'</b> sans offre. '+R.plan.length+' GEH / ensemble(s), <b>'+nPre+'</b> prélèvement(s) après regroupement. Coût estimé HT : <b>'+dvEur(P.tg)+'</b> regroupé, contre '+dvEur(P.ts)+' en prélèvements séparés (économie '+dvEur(P.ts-P.tg)+').</div>'+
    '<div class="legend">Prix HT remisés SOCOTEC (catalogue 2026), hors port, location de pompe et frais de dossier. TERA : support chiffré seulement s\'il figure au catalogue. Vérifie capacités de piégeage et interférences avant de retenir un regroupement. <b>Clique sur une ligne jaune (à vérifier) ou rouge (non trouvé)</b> pour choisir une offre ou saisir ta propre solution.</div>'+
    '<div class="row"><button class="btn pri" id="dvXlsx" type="button">Exporter en Excel</button></div></div>';
  h += '<div class="card"><h2>Faisabilité par agent</h2><div style="overflow:auto"><table class="t"><thead><tr><th>Agent</th><th>CAS</th><th>VLEP 8h</th><th>Faisabilité</th><th>Labo (base)</th><th>Labo retenu</th><th>Analyse</th><th>LQ</th><th>Support</th><th>Prétraitement</th><th>Total HT</th><th>Vol. mini (L)</th></tr></thead><tbody>';
  R.A.slice().sort((x,y)=>(x.offs.length?0:1)-(y.offs.length?0:1) || x.nom.localeCompare(y.nom)).forEach(a=>{ const o = a.offs[0], v = dvVol(a), st = dvStatus(a);
    const cls = !o ? "del" : (a.mode==="équivalence" ? "warn" : "");
    const chk = !a.skipped && (!o || (a.mode==="équivalence" && !a.valid) || a.manual);
    h += '<tr data-dvk="'+esc(a.key)+'" style="cursor:pointer;'+(a.skipped?'background:#EEE;color:#777':(!o?'background:#FBE5D6':(chk?'background:#FFF2CC':'')))+'" title="Cliquer pour choisir / modifier"><td class="l">'+esc(a.nom)+(chk||a.skipped||a.sel?'<span class="m" style="color:#b45309">'+(a.skipped?'écarté — cliquer pour modifier':(!o?'non trouvé — cliquer pour saisir une solution':(a.manual?'solution saisie — cliquer pour modifier':'à vérifier — cliquer pour choisir')))+'</span>':(a.offs.length>1?'<span class="m">cliquer pour choisir une autre offre</span>':''))+(a.offs.length>1?'<span class="m">'+(a.offs.length-1)+' autre(s) offre(s)</span>':'')+'</td><td>'+esc(a.cas)+'</td><td>'+esc(a.v8||"")+'</td><td class="l">'+esc(st)+(a.ex?'<span class="m">'+esc(a.ex)+'</span>':'')+'</td><td class="l">'+esc(dvLabBase(a)||"—")+'</td>'+
      (o ? '<td class="l">'+esc(o.lab)+'</td><td class="l">'+esc(o.code+" – "+o.nom)+'</td><td>'+esc(o.lq)+'</td><td class="l">'+esc(o.sup?o.sup[0]+" – "+o.sup[1]:"")+(o.sup&&o.sup[2]!=null?'<span class="m">'+dvEur(o.sup[2])+'</span>':'')+'</td><td class="l">'+esc(o.pre?o.pre[0]+" – "+o.pre[1]:"—")+(o.pre&&o.pre[2]!=null?'<span class="m">'+dvEur(o.pre[2])+'</span>':'')+'</td><td>'+dvEur(dvTotal(o))+'<span class="m">dont analyse '+dvEur(o.pa)+'</span></td><td>'+(v?v.toFixed(2):"")+'</td>' : '<td colspan="7" class="l">—</td>')+'</tr>'; });
  h += '</tbody></table></div></div>';
  h += '<div class="card"><h2>Co-prélèvements par GEH</h2><div class="legend" style="margin-bottom:8px">Agents d\'un même GEH dosables sur un même prélèvement (même labo, même support, même prétraitement, débits compatibles). Support et prétraitement comptés une seule fois.</div><div style="overflow:auto"><table class="t"><thead><tr><th>GEH</th><th>N°</th><th>Labo</th><th>Famille de prélèvement</th><th>Agents sur ce prélèvement</th><th>Débit commun</th><th>Total regroupé</th><th>Si séparés</th></tr></thead><tbody>'+
    P.rows.map(r=>'<tr><td class="l">'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td class="l">'+esc(r[2])+'</td><td class="l">'+esc(r[3])+'<span class="m">'+esc(r[4])+(r[5]&&r[5]!=="—"?" · "+esc(r[5]):"")+'</span></td><td class="l"><b>'+r[6]+'</b> : '+esc(r[7])+'</td><td class="l">'+esc(r[9])+'</td><td>'+(r[13]===""?"":dvEur(r[13]))+'</td><td>'+(r[14]===""?"":dvEur(r[14]))+'</td></tr>').join("")+'</tbody></table></div></div>';
  w.innerHTML = h;
}
function dvXlsxBlob(){
  const R = DV.R, P = dvPlanRows(R), sh = [];
  const rd = ["Lisez-moi"], rl = [
   ["FAISABILITÉ DES ANALYSES, PRIX ET CO-PRÉLÈVEMENTS"],["Dossier : "+(S.ent.nom||"—")+" · généré le "+today()],[""],
   ["Sources : catalogue SOCOTEC AIR 2026 (labo EAA = Eurofins Analyses de l'Air), TERA Environnement 2026, Toxilabo 2026, base MonDevis (labos et débits)."],
   ["Prix HT remisés SOCOTEC (« remisé EOL » SOCOTEC AIR, « Tarif remisé » TERA ; tarif 2026 Toxilabo, sans remise distincte). « ND » au catalogue = prix public. Hors port, location de pompe et frais de dossier."],
   ["Offre retenue : 1) code analyse de la base MonDevis, 2) labo de la base, 3) accréditée COFRAC, 4) la moins chère."],
   ["Équivalence : produits non listés sous leur CAS (sels de métaux, dichromate, poussières…) rattachés à l'analyse de l'élément ou de l'indice : à valider."],
   ["Co-prélèvement : même labo, même famille de prélèvement (support + désorption/minéralisation), débits 8h compatibles (base MonDevis). Support et prétraitement comptés 1 fois ; TERA : molécules supplémentaires au tarif dédié."],
   ["Volume mini : volume d'air pour que la LQ atteigne 10 % de la VLEP 8h (LQ µg ÷ (0,1 × VLEP mg/m³))."],
   ["Limites : prix et références issus des catalogues embarqués dans l'outil ; à vérifier avant devis. Capacités de piégeage et interférences non contrôlées."]];
  sh.push(["Lisez-moi", sheetXml(["Information"], rl, [150], (r,c)=>2, {noFilter:true})]);
  const d1 = R.A.slice().sort((x,y)=>(x.offs.length?0:1)-(y.offs.length?0:1) || x.nom.localeCompare(y.nom)).map(a=>{ const o = a.offs[0], v = dvVol(a);
    return [a.nom,a.cas,a.v8||"",a.vct||"",a.cmr||"",a.gehs.join("; "),dvStatus(a),dvLabBase(a)||"—",o?o.lab:"",o?o.src:"",o?o.code:"",o?o.nom:"",o?o.lq:"",o?o.meth:"",o&&o.sup?o.sup[0]+" – "+o.sup[1]:"",o&&o.sup&&o.sup[2]!=null?o.sup[2]:"",o?(o.pre?o.pre[0]+" – "+o.pre[1]:"—"):"",o&&o.pre&&o.pre[2]!=null?o.pre[2]:"",o&&o.pa!=null?o.pa:"",o?Math.round(dvTotal(o)*100)/100:"",a.fl?a.fl[0]+"–"+a.fl[1]:"",v?Math.round(v*100)/100:"",a.offs.length,a.ex]; });
  sh.push(["Faisabilité agents", sheetXml(["Agent","CAS","VLEP 8h (mg/m³)","VLEP CT (mg/m³)","CMR","GEH","Faisabilité","Labo base MonDevis","Labo (offre retenue)","Catalogue","Code analyse","Intitulé analyse","LQ","Méthode","Support","Prix support HT","Prétraitement","Prix prétraitement HT","Prix analyse HT remisé","Total unitaire HT","Débit 8h base (L/min)","Volume mini LQ=10 % VLEP (L)","Nb offres","Remarque"], d1, [34,12,10,10,8,30,28,22,22,10,11,34,12,22,34,10,34,10,10,10,11,11,6,40], (r,c)=>(c===6 && !/^Faisable/.test(r[6])) || (c===6 && /valider/.test(r[6])) ? 6 : 2)]);
  const d2 = []; R.A.slice().sort((x,y)=>x.nom.localeCompare(y.nom)).forEach(a=>a.offs.slice(0,15).forEach((o,i)=>d2.push([a.nom,a.cas,i===0?"★ retenue":"",o.lab,o.src,o.code,o.nom,o.cofrac?"Oui":"Non",o.lq,o.meth,o.famName,o.sup?o.sup[0]+" – "+o.sup[1]:"",o.sup&&o.sup[2]!=null?o.sup[2]:"",o.pre?o.pre[0]+" – "+o.pre[1]:"",o.pre&&o.pre[2]!=null?o.pre[2]:"",o.pa!=null?o.pa:"",Math.round(dvTotal(o)*100)/100,o.extra!=null?o.extra:"",o.variants])));
  sh.push(["Toutes les offres", sheetXml(["Agent","CAS","Rang","Labo","Catalogue","Code analyse","Intitulé","COFRAC","LQ","Méthode","Famille de prélèvement","Support","Prix support","Prétraitement","Prix prétraitement","Prix analyse remisé","Total unitaire","Molécule suppl. (TERA)","Autres supports / prétraitements possibles"], d2, [32,12,9,22,10,10,32,8,12,24,38,34,9,34,9,9,9,9,50], (r,c)=>2)]);
  const d3 = P.rows.map(r=>r.map(x=>typeof x==="number"?Math.round(x*100)/100:x));
  sh.push(["Co-prélèvements par GEH", sheetXml(["GEH","N° prélèvement","Labo","Famille de prélèvement","Support","Prétraitement","Nb agents","Agents dosés sur ce prélèvement","Codes analyse","Débit commun","Support HT (1×)","Prétraitement HT (1×)","Analyses HT","Total regroupé HT","Si séparés HT","Économie HT","Tout accrédité"], d3, [28,8,20,38,34,34,7,60,30,24,10,10,10,12,12,10,10], (r,c)=>(c===9 && /vérifier/.test(String(r[9]))) ? 6 : 2)]);
  const gl = [...new Set(R.plan.map(p=>p.geh))], asg = new Map();
  R.plan.forEach(p=>p.picks.forEach((mem,n)=>mem.forEach(({a,o})=>asg.set(p.geh+"|"+a.nom+"|"+a.cas,"P"+(n+1)+" · "+o.lab+" · "+o.code))));
  const d4 = R.A.slice().sort((x,y)=>x.nom.localeCompare(y.nom)).map(a=>[a.nom,a.cas].concat(gl.map(g=>asg.get(g+"|"+a.nom+"|"+a.cas) || ((a.gehs.length?a.gehs:["Ensemble"]).includes(g) && !a.offs.length ? "SANS OFFRE" : ""))));
  sh.push(["Matrice GEH x agents", sheetXml(["Agent","CAS"].concat(gl), d4, [34,12].concat(gl.map(()=>20)), (r,c)=>r[c]==="SANS OFFRE"?6:2)]);
  const d5 = R.A.filter(a=>!a.offs.length).map(a=>[a.nom,a.cas,a.v8||"",a.cmr||"",a.gehs.join("; "),(a.prods||[]).slice(0,6).join("; "),dvLabBase(a)||"—",a.filtered?"Offre existante mais labo décoché":""]);
  sh.push(["Sans offre", sheetXml(["Agent","CAS","VLEP 8h","CMR","GEH","Produits","Labo base MonDevis","Remarque"], d5, [40,14,10,10,40,60,22,30], (r,c)=>2)]);
  const z = new JSZip(), n = sh.length, ids = Array.from({length:n},(_,i)=>i+1);
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  z.file("[Content_Types].xml", X+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+ids.map(i=>'<Override PartName="/xl/worksheets/sheet'+i+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>');
  z.file("_rels/.rels", X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  z.file("xl/workbook.xml", X+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sh.map((s,i)=>'<sheet name="'+esc(s[0]).slice(0,31)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+'</sheets></workbook>');
  z.file("xl/_rels/workbook.xml.rels", X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+ids.map(i=>'<Relationship Id="rId'+i+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+i+'.xml"/>').join("")+'<Relationship Id="rId99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  z.file("xl/styles.xml", DV_STYLES);
  sh.forEach((s,i)=>z.file("xl/worksheets/sheet"+(i+1)+".xml", s[1]));
  return z.generateAsync({type:"blob", compression:"DEFLATE", mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
const DV_STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FF0000FF"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFB35A00"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00ACE8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3E6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFE7F7"/></left><right style="thin"><color rgb="FFBFE7F7"/></right><top style="thin"><color rgb="FFBFE7F7"/></top><bottom style="thin"><color rgb="FFBFE7F7"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

/* ---- fenêtre de choix par agent (agents à vérifier / non trouvés) ---- */
function dvReanalyse(){ if(!DV.inp) return; DV.R = dvAnalyse(DV.inp, dvLabs()); renderDevis(); }
function dvClose(){ const m = document.getElementById("dvModal"); if(m) m.remove(); }
function dvSetSel(key, v){ S.dvSel = S.dvSel||{}; if(v) S.dvSel[key] = v; else delete S.dvSel[key]; persist(); dvClose(); dvReanalyse(); syncStrategy(); }
function dvOpen(key){
  const a = (DV.R||{A:[]}).A.find(x=>x.key===key); if(!a) return; dvClose();
  const m = document.createElement("div"); m.id = "dvModal"; m.dataset.key = key;
  m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px";
  const cur = a.offs[0], inp = (id,l,ph,w) => '<label style="display:block;font-size:12px;margin-top:6px">'+l+'<input id="'+id+'" placeholder="'+(ph||"")+'" style="width:100%;padding:6px 8px;border:1px solid var(--bord);border-radius:6px;box-sizing:border-box;'+(w||"")+'"></label>';
  let body = '<div style="font-size:13px;margin-bottom:8px">VLEP 8h : <b>'+esc(a.v8||"—")+'</b> · CAS '+esc(a.cas||"—")+(dvLabBase(a)?' · labo base : '+esc(dvLabBase(a)):'')+'</div>';
  if(a.ex) body += '<div class="warn" style="margin:0 0 8px">'+esc(a.ex)+'</div>';
  if(a.all.length){
    body += '<b style="font-size:13px">Offres possibles ('+a.all.length+') — choisis celle à retenir</b><div style="overflow:auto;max-height:42vh;margin-top:6px"><table class="t"><thead><tr><th></th><th>Labo</th><th>Analyse</th><th>LQ</th><th>COFRAC</th><th>Support / prétraitement</th><th>Total HT</th></tr></thead><tbody>'+
      a.all.slice(0,40).map((o,i)=>'<tr'+(cur===o?' style="background:#E8F4FB"':'')+'><td><button class="btn sm pri" data-dvpick="'+i+'" type="button">'+(cur===o&&!a.manual?'✓ Retenue':'Choisir')+'</button></td><td class="l">'+esc(o.lab)+'<span class="m">'+esc(o.src)+'</span></td><td class="l">'+esc(o.code+" – "+o.nom)+'</td><td>'+esc(o.lq)+'</td><td>'+(o.cofrac?"Oui":"Non")+'</td><td class="l">'+esc((o.sup?o.sup[1]:"—")+(o.pre?" + "+o.pre[1]:""))+'</td><td>'+dvEur(dvTotal(o))+'</td></tr>').join("")+'</tbody></table></div>';
  } else body += '<div class="warn" style="margin:0 0 6px">Aucune offre dans les catalogues pour cet agent.</div>';
  body += '<details'+(a.all.length?'':' open')+' style="margin-top:10px"><summary style="cursor:pointer;font-weight:650">J\'ai une solution (saisie manuelle)</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">'+
    inp("dvcLab","Laboratoire","ex : Eurofins, Carso…")+inp("dvcNom","Analyse / méthode","ex : dosage par HPLC")+inp("dvcCode","Code analyse","")+inp("dvcLq","LQ","ex : 0,5 µg/support")+
    inp("dvcSup","Support de prélèvement","ex : tube charbon actif")+inp("dvcSupPrix","Prix support HT (€)","")+inp("dvcPre","Prétraitement","ex : désorption CS2")+inp("dvcPrePrix","Prix prétraitement HT (€)","")+inp("dvcPrix","Prix analyse HT (€)","")+
    '<label style="font-size:12px;margin-top:22px"><input type="checkbox" id="dvcCofrac"> Accrédité COFRAC</label></div><div class="row" style="margin-top:8px"><button class="btn pri" data-dvsave="1" type="button">Retenir cette solution</button></div></details>';
  body += '<div class="row" style="margin-top:12px"><button class="btn" data-dvskip="1" type="button">Écarter cet agent (aucune analyse retenue)</button>'+(a.sel?'<button class="btn" data-dvauto="1" type="button">Revenir au choix automatique</button>':'')+'<button class="btn" data-dvclose="1" type="button" style="margin-left:auto">Fermer</button></div>';
  m.innerHTML = '<div style="background:#fff;color:#1b2a38;border-radius:12px;max-width:860px;width:100%;max-height:92vh;overflow:auto;padding:16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.35)"><h2 style="margin:0 0 6px">'+esc(a.nom)+'</h2>'+body+'</div>';
  document.body.appendChild(m);
  if(a.sel && a.sel.t==="c"){ const c = a.sel.o; [["dvcLab","lab"],["dvcNom","nom"],["dvcCode","code"],["dvcLq","lq"],["dvcSup","sup"],["dvcSupPrix","supPrix"],["dvcPre","pre"],["dvcPrePrix","prePrix"],["dvcPrix","prix"]].forEach(([id,k])=>{ const e = document.getElementById(id); if(e) e.value = c[k]||""; }); const cb = document.getElementById("dvcCofrac"); if(cb) cb.checked = !!c.cofrac; }
}
document.addEventListener("click", e=>{
  const m = document.getElementById("dvModal");
  if(m){ const t = e.target, key = m.dataset.key, a = (DV.R||{A:[]}).A.find(x=>x.key===key);
    if(t===m || t.closest("[data-dvclose]")){ dvClose(); return; }
    const pk = t.closest("[data-dvpick]"); if(pk && a){ const o = a.all[+pk.dataset.dvpick]; dvSetSel(key, {t:"o", lab:o.lab, code:o.code, fam:o.famName||""}); return; }
    if(t.closest("[data-dvskip]")){ dvSetSel(key, {t:"x"}); return; }
    if(t.closest("[data-dvauto]")){ dvSetSel(key, null); return; }
    if(t.closest("[data-dvsave]")){ const g = id => (document.getElementById(id)||{}).value||""; const o = {lab:g("dvcLab").trim(), nom:g("dvcNom").trim(), code:g("dvcCode").trim(), lq:g("dvcLq").trim(), sup:g("dvcSup").trim(), supPrix:g("dvcSupPrix").trim(), pre:g("dvcPre").trim(), prePrix:g("dvcPrePrix").trim(), prix:g("dvcPrix").trim(), cofrac:!!(document.getElementById("dvcCofrac")||{}).checked};
      if(!o.lab && !o.nom){ alert("Indique au moins le laboratoire ou l\u2019analyse."); return; } dvSetSel(key, {t:"c", o}); return; }
    return; }
  const r = e.target.closest("#dvOut tr[data-dvk]"); if(r && !e.target.closest("button")) dvOpen(r.dataset.dvk);
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape") dvClose(); });
function dvLabs(){ return new Set($$("#dvLabs input:checked").map(i=>i.value)); }
function dvRun(){
  const mode = ($$("input[name=dvSrc]").find(r=>r.checked)||{}).value || "proj"; let inp;
  if(mode==="paste") inp = dvParseLines($("#dvTxt").value.split(/\r?\n/));
  else inp = dvInputProject(mode==="projc");
  if(!inp.length){ $("#dvMsg").innerHTML = '<div class="warn">Aucun agent à analyser : '+(mode==="paste"?"colle une liste (CAS ou noms, un par ligne).":"le projet ne contient encore ni agent retenu ni candidat.")+'</div>'; DV.ready = false; renderDevis(); return; }
  inp.forEach(x=>{ if(!x.gehs.length) x.gehs = []; });
  try{ DV.inp = inp; DV.R = dvAnalyse(inp, dvLabs()); DV.ready = true; $("#dvMsg").innerHTML = ""; renderDevis(); }
  catch(e){ $("#dvMsg").innerHTML = '<div class="warn">Erreur d\'analyse : '+esc(e.message)+'</div>'; }
}
(function(){
  const b = $("#dvRun"); if(!b) return;
  b.onclick = dvRun;
  $("#fDv").addEventListener("change", async e=>{ const f = e.target.files[0]; e.target.value = ""; if(!f) return;
    try{ $("#dvTxt").value = await dvReadFile(f); $$("input[name=dvSrc]").forEach(r=>r.checked = r.value==="paste"); $("#dvMsg").innerHTML = '<div class="ok">Fichier lu : '+esc(f.name)+'. Vérifie la liste puis clique sur Analyser.</div>'; }
    catch(err){ $("#dvMsg").innerHTML = '<div class="warn">Lecture impossible : '+esc(err.message)+'</div>'; } });
  $("#dvOut").addEventListener("click", async e=>{ if(e.target.id!=="dvXlsx") return;
    try{ download(await dvXlsxBlob(), "Faisabilite_devis_"+safe(S.ent.nom)+"_"+today()+".xlsx"); }catch(err){ $("#dvMsg").innerHTML = '<div class="warn">Export impossible : '+esc(err.message)+'</div>'; } });
})();
