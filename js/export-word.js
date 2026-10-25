"use strict";
/* ================= Export Word ================= */
let trameBuf = null, trameName = "Stratégie vierge (intégrée)";
function b64ToBytes(b){ const bin = atob(b), u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
$("#trameState").textContent = trameName;
$("#fTrame").addEventListener("change", async e=>{
  const f = e.target.files[0]; if(!f) return;
  trameBuf = await f.arrayBuffer(); trameName = f.name; $("#trameState").textContent = "Trame : "+f.name;
});

const rows_of = t => [...t.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)];
const textOf = x => [...x.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map(m=>m[1]).join("");
const BORD = '<w:tcBorders>'+["top","left","bottom","right"].map(s=>'<w:'+s+' w:val="single" w:sz="6" w:space="0" w:color="00ACE8"/>').join("")+'</w:tcBorders>';
function wcell(w, text, rp, span){
  const rpr = '<w:rPr><w:rFonts w:cs="Arial"/>'+rp+'<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>';
  return '<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+(span?'<w:gridSpan w:val="2"/>':'')+BORD+'<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/>'+rpr+'</w:pPr>'+(text===""?"":'<w:r>'+rpr+'<w:t xml:space="preserve">'+esc(text)+'</w:t></w:r>')+'</w:p></w:tc>';
}
function agentRow(a){
  const t = vtype(a), st = t==="contr" ? '<w:b/><w:bCs/>' : (t==="indic" ? '<w:b/><w:bCs/><w:color w:val="0000FF"/>' : "");
  return '<w:tr><w:trPr><w:trHeight w:val="720"/><w:jc w:val="center"/></w:trPr>'+
    wcell(2873, a.agent, st)+wcell(1285, a.cas||"-", st)+wcell(999, fmt(a.v8), st)+wcell(1000, fmt(a.vct), st)+
    wcell(999, a.cmr||"-", "")+wcell(1211, a.accP==="X"?"X":"", "")+wcell(1178, a.accA==="X"?"X":"", "", true)+'</w:tr>';
}
function fillTable24(xml){
  const i = xml.indexOf(">Agent chimique<"); if(i<0) throw new Error("Tableau §2.4 introuvable dans la trame.");
  const s = xml.lastIndexOf("<w:tbl>", i), e = xml.indexOf("</w:tbl>", i)+8;
  const t = xml.slice(s,e); if(t.indexOf("N° CAS")<0) throw new Error("Tableau §2.4 : en-têtes inattendus.");
  const rs = rows_of(t); if(rs.length<3) throw new Error("Tableau §2.4 : structure inattendue.");
  const head = t.slice(0, rs[2].index);
  const body = sortedIdx().filter(k=>!noLab(S.agents[k])).map(k=>agentRow(S.agents[k])).join("");
  return xml.slice(0,s) + head + body + "</w:tbl>" + xml.slice(e);
}
function setFormText(tc, text){
  const v = esc(text||"");
  const re = /(w:fldCharType="separate"\/><\/w:r>)([\s\S]*?)(<w:r[ >](?:(?!<w:r[ >])[\s\S])*?w:fldCharType="end"\/><\/w:r>)/;
  if(re.test(tc)) return tc.replace(re, (m,a,b,c)=> a+'<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">'+v+'</w:t></w:r>'+c);
  return tc.replace(/<\/w:p>/, '<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">'+v+'</w:t></w:r></w:p>');
}
function fillIdent(xml){
  const i = xml.indexOf("Code NAF"); if(i<0) return xml;
  const s = xml.lastIndexOf("<w:tbl>", i), e = xml.indexOf("</w:tbl>", i)+8;
  let t = xml.slice(s,e);
  const map = {"nom":"nom","adresse":"adresse","code naf":"naf","siret":"siret","effectif site":"effectif","contact sur le site":"contact","activite":"activite"};
  t = t.replace(/<w:tr[ >][\s\S]*?<\/w:tr>/g, row=>{
    const cells = [...row.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)];
    let out = row;
    cells.forEach((c,idx)=>{
      const lab = norm(textOf(c[0]));
      const key = map[lab];
      if(key && cells[idx+1]){
        const nc = setFormText(cells[idx+1][0], key==="adresse" ? [S.ent.adresse,S.ent.cpville].filter(Boolean).join(", ") : S.ent[key]);
        out = out.replace(cells[idx+1][0], ()=>nc);
      }
    });
    return out;
  });
  return xml.slice(0,s)+t+xml.slice(e);
}
const PBORD = '<w:tcBorders>'+["top","left","bottom","right"].map(x=>'<w:'+x+' w:val="single" w:sz="4" w:space="0" w:color="00B0F0"/>').join("")+'</w:tcBorders>';
function pcell(wpct, lines, fill, rp, span){
  const rpr = '<w:rPr><w:rFonts w:cs="Arial"/>'+rp+'<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>';
  const runs = lines.length ? lines.map((t,i)=>'<w:r>'+rpr+(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+esc(t)+'</w:t></w:r>').join("") : "";
  return '<w:tc><w:tcPr><w:tcW w:w="'+wpct+'" w:type="pct"/>'+(span?'<w:gridSpan w:val="'+span+'"/>':'')+PBORD+'<w:shd w:val="clear" w:color="auto" w:fill="'+fill+'"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>'+rpr+'</w:pPr>'+runs+'</w:p></w:tc>';
}
function planTableXml(){
  const W = [700,1450,750,800,450,850], H = ["Jour","Agents chimiques","N° GEH","Nb total de prélèvements","Type de VLEP","Plage horaire de prélèvement"];
  let x = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="1384"/><w:gridCol w:w="3230"/><w:gridCol w:w="1382"/><w:gridCol w:w="1221"/><w:gridCol w:w="720"/><w:gridCol w:w="1842"/></w:tblGrid>';
  x += '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="636"/><w:tblHeader/></w:trPr>'+H.map((h,i)=>pcell(W[i],[h],i?"4F81BD":"3381C7",'<w:b/><w:bCs/><w:color w:val="FFFFFF"/>')).join("")+'</w:tr>';
  const gl = gehList();
  /* GEH vide dans le plan : on le déduit des tâches où l'agent est utilisé (export seulement, le plan n'est pas modifié) */
  const gehCell = r => { const g = planGeh(r); if(g) return [g]; const ids = new Set();
    planAgents(r).forEach(a=>gehsOfAgent(a, gl).forEach(id=>ids.add(id))); return ids.size ? gl.filter(g=>ids.has(g.id)).map(g=>String(g.n)) : [""]; };
  S.plan.forEach(r=>{
    if(r.kind==="sec"){ x += '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="400"/></w:trPr>'+pcell(5000,[r.txt||""],"95B3D7",'<w:b/><w:bCs/>',6)+'</w:tr>'; return; }
    if(!planAgents(r).length) return; /* ligne sans agent : rien à publier */
    const cells = [[(r.jour||"").trim()],planAgents(r),gehCell(r),[r.nb==null?"":String(r.nb)],[r.type||""],[(r.plage||"").trim()]];
    x += '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="528"/></w:trPr>'+cells.map((c,i)=>pcell(W[i],c.filter((t,j)=>t!==""||c.length===1),i?"B8CCE4":"95B3D7","")).join("")+'</w:tr>';
  });
  return x+'</w:tbl>';
}
function fillPlan(xml){
  const m = xml.indexOf("proposé"); if(m<0) return xml;
  const s = xml.indexOf("<w:tbl>", m); if(s<0) return xml;
  const e = xml.indexOf("</w:tbl>", s)+8;
  const t = xml.slice(s,e); if(t.indexOf("Jour")<0) return xml;
  let pre = xml.slice(0,s);
  const ps = pre.lastIndexOf("<w:p "), pe = pre.length;
  if(ps>=0 && pre.indexOf("<w:tbl>",ps)<0){ const ptxt = textOf(pre.slice(ps)).trim(); if(/^Atelier\s*1$/i.test(ptxt)) pre = pre.slice(0,ps); }
  return pre + planTableXml() + xml.slice(e);
}
/* dénomination de la base si l'agent y existe (par CAS ou par nom), sinon nom saisi */
const _acdC = new Map();
function acdNames(nm){ nm = String(nm||"").trim(); const k = norm(nm); if(_acdC.has(k)) return _acdC.get(k);
  let out = [nm]; const c = (S.cand||[]).find(x=>norm(x.nom)===k), ag = S.agents.find(x=>norm(x.agent)===k);
  const bs = c ? baseByCas(c.cas, c.nom) : (ag ? [] : baseByCas("", nm));
  if(bs.length) out = [...new Set(bs.map(b=>cleanName(b.agent)))]; else if(ag) out = [ag.agent];
  _acdC.set(k, out); return out; }
const acdName = nm => acdNames(nm)[0];
function mergedTasks(g, raw){
  const m = new Map(), NL = new Set(S.agents.filter(noLab).flatMap(a=>[norm(a.agent), a.cas?norm(a.cas):""].filter(Boolean))), RN = new Set(S.agents.flatMap(a=>[norm(a.agent), a.cas?norm(a.cas):""].filter(Boolean))), retained = n => !S.agents.length || RN.has(norm(n)) || RN.has(norm(acdName(n))) || (()=>{ const c=(S.cand||[]).find(z=>norm(z.nom)===norm(n)); return !!(c && c.cas && RN.has(norm(c.cas))); })(), isNL = n => raw ? false : !retained(n) || NL.has(norm(n)) || (()=>{ const c=(S.cand||[]).find(z=>norm(z.nom)===norm(n)); return !!(c && c.cas && NL.has(norm(c.cas))); })(), add = (arr,v)=>{ v = String(v||"").trim(); if(v && !arr.some(y=>norm(y)===norm(v))) arr.push(v); };
  (g.taches||[]).forEach((k,ki)=>{ const key = norm(k.t||""); let x = m.get(key); if(!x){ x = {t:k.t||"", dur:[], frq:[], prods:[], ags:[], pa:new Map(), multi:new Set(), idx:[], ids:[], q:[]}; m.set(key,x); }
    x.idx.push(ki); x.ids.push(k.id); add(x.q, [k.qj,k.qa].filter(Boolean).join(" · "));
    add(x.dur,k.duree); add(x.frq,k.freq);
    const L = String(k.prod||"").split("\n").map(z=>z.trim()).filter(Boolean);
    if(k.em) L.forEach(l=>acdNames(l).forEach(n=>(isNL(l)||isNL(n)) ? (x.nl=1) : add(x.ags,n))); else { if(L[0]) add(x.prods,L[0]); L.slice(1).forEach(l=>l.split(/,\s+/).forEach(a=>{ acdNames(a).forEach(a=>{ if(isNL(a)){ x.nl=1; return; } add(x.ags,a); const na = norm(a); if(!x.pa.has(na)) x.pa.set(na,new Set()); x.pa.get(na).add(norm(L[0]||"")); }); })); } });
  m.forEach(x=>x.pa.forEach((ps,na)=>{ if(ps.size>1) x.multi.add(na); }));
  return raw ? [...m.values()] : [...m.values()].filter(x=>x.ags.length || !x.nl);
}
const PROD_MAX = 6;
/* cellule « produits / ACD » : produits en normal (résumés au-delà de PROD_MAX), ACD une seule fois en gras */
function taskCellLines(k){
  const big = k.prods.length>PROD_MAX, out = [];
  if(k.prods.length) out.push(big ? k.prods.length+" produits, dont : "+k.prods.slice(0,3).join(", ")+"… (liste complète dans l'Excel)" : k.prods.join(", "));
  if(k.ags.length>4) out.push({t:k.ags.join(" ; "), b:true}); else k.ags.forEach(a=>out.push({t:a, b:true}));
  return out;
}
const qHtml = k => !k.q.length ? '' : '<div class="m">'+(k.q.length<=2 ? 'Quantité (Seirich) : '+esc(k.q.join(" ; ")) : 'Quantités variables selon les produits')+'</div>';
const cellHtml = k => taskCellLines(k).map(l=> (l && typeof l==="object") ? '<div class="m"><b>'+esc(l.t)+'</b></div>' : '<div class="m">'+esc(l)+'</div>').join("");
function groupedTable(g){
  const L = mergedTasks(g, true); if(!L.length) return '<div class="legend">Aucune tâche.</div>';
  return '<table class="t"><thead><tr><th>Tâche élémentaire</th><th style="width:150px">Durée</th><th style="width:110px">Fréquence</th><th>Produits (normal) / agents chimiques (gras)</th></tr></thead><tbody>'+
    L.map(k=>'<tr><td class="l">'+esc(k.t||"(sans nom)")+(k.idx.length>1?'<div class="m">'+k.idx.length+' lignes fusionnées</div>':'')+'</td><td>'+esc(k.dur.join(" / "))+'</td><td>'+esc(k.frq.join(" / "))+'</td><td class="l">'+cellHtml(k)+qHtml(k)+'</td></tr>').join("")+'</tbody></table>';
}
function gcell(w, lines, o){
  o = o||{}; const rpr = '<w:rPr><w:rFonts w:cs="Arial"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>';
  const runs = lines.map((t,i)=>{ const b = t && typeof t==='object' && t.b, it = t && typeof t==='object' && t.i, tx = (t && typeof t==='object') ? t.t : t, rp = rpr.replace('<w:sz ',(b?'<w:b/><w:bCs/>':'')+(it?'<w:i/><w:iCs/>':'')+'<w:sz '); return '<w:r>'+rp+(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+esc(tx)+'</w:t></w:r>'; }).join("");
  return '<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+(o.vm==="restart"?'<w:vMerge w:val="restart"/>':(o.vm==="cont"?'<w:vMerge/>':''))+BORD+'<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="'+(o.left?"left":"center")+'"/>'+rpr+'</w:pPr>'+runs+'</w:p></w:tc>';
}
function fillAteliers(xml){
  const i = xml.indexOf("Description de la production"); if(i<0 || !S.ateliers.length) return xml;
  const st = xml.lastIndexOf("<w:tbl>", i), en = xml.indexOf("</w:tbl>", i)+8, t = xml.slice(st,en);
  const rs = rows_of(t); if(rs.length<2) return xml;
  const tpl = rs[1][0], tcs = tpl.match(/<w:tc>[\s\S]*?<\/w:tc>/g); if(!tcs || tcs.length<2) return xml;
  const body = S.ateliers.filter(a=>a.gehs.some(gehActive)).map((a,k)=>{
    let c0 = tcs[0].replace(/<w:t>[^<]*<\/w:t>/, '<w:t>'+(k+1)+'</w:t>');
    const ps = tcs[1].match(/<w:p[ >][\s\S]*?<\/w:p>/g)[0];
    const c1 = tcs[1].replace(/<w:p[ >][\s\S]*<\/w:p>/, ps.replace(/<\/w:pPr>/, '</w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">'+esc(a.nom||"")+'</w:t></w:r>'));
    return tpl.replace(tcs[0], c0).replace(tcs[1], c1);
  }).join("");
  const last = rs[rs.length-1], head = t.slice(0, rs[1].index);
  return xml.slice(0,st) + head + body + t.slice(last.index + last[0].length) + xml.slice(en);
}
function fillGeh(xml){
  if(!S.ateliers.length) return xml;
  const tbls = []; let pos = 0;
  while(true){ const a = xml.indexOf("<w:tbl>", pos); if(a<0) break; const b = xml.indexOf("</w:tbl>", a)+8; tbls.push([a,b]); pos = b; }
  const gt = tbls.filter(([a,b])=>textOf(xml.slice(a,b)).indexOf("Désignation du GEH")>=0);
  if(!gt.length) return xml;
  const t0 = xml.slice(gt[0][0], gt[0][1]);
  let head = t0.match(/<w:tblPr>[\s\S]*?<\/w:tblGrid>/)[0]; const rs = rows_of(t0); if(!rs.length) return xml;
  const W = [...head.matchAll(/<w:gridCol w:w="(\d+)"/g)].map(m=>+m[1]);
  /* colonne « produits / ACD » élargie au détriment de la colonne « tâches » pour une lecture plus compacte */
  if(W.length>8){ const mv = Math.round(W[4]*0.4); W[4] -= mv; W[7] += mv; let gi = 0; head = head.replace(/<w:gridCol w:w="\d+"/g, ()=>'<w:gridCol w:w="'+W[gi++]+'"'); }
  /* début = paragraphe d'étiquette juste avant le 1er tableau */
  const pre = xml.slice(0, gt[0][0]); const ps = Math.max(pre.lastIndexOf("<w:p "), pre.lastIndexOf("<w:p>"));
  const start = (ps>=0 && textOf(pre.slice(ps)).trim()) ? ps : gt[0][0];
  const end = gt[gt.length-1][1];
  let n = 0, out = "";
  let ai2 = 0; S.ateliers.forEach((a,ai)=>{
    if(!a.gehs.some(gehActive)) return; ai2++;
    out += '<w:p><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="120"/><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">'+esc(ai2+" – "+(a.nom||""))+'</w:t></w:r></w:p>';
    a.gehs.filter(gehActive).forEach(g=>{
      let t = '<w:tbl>'+head+rs[0][0].replace(/<w:pPr>(<w:pStyle [^>]*\/>)?/g,(m,ps)=>'<w:pPr>'+(ps||'')+'<w:keepNext/>');
      n++; const L = mergedTasks(g);
      L.forEach((k,i)=>{
        const vm = i===0 ? "restart" : "cont", first = i===0;
        t += '<w:tr><w:trPr><w:trHeight w:val="298"/></w:trPr>'+
          gcell(W[0], first?[String(n)]:[], {vm})+gcell(W[1], first?[g.des||""]:[], {vm})+gcell(W[2], first?[g.eff||""]:[], {vm})+gcell(W[3], first?[g.orga||""]:[], {vm})+
          gcell(W[4], [k.t||""], {left:true})+gcell(W[5], [k.dur.join(" / ")])+gcell(W[6], [k.frq.join(" / ")])+gcell(W[7], taskCellLines(k), {left:true})+
          gcell(W[8], first?[String(g.epc||"").replace(/(^|,\s*|\n)\s*(absence de|pas de|sans|aucune|aucun) ventilation[^,\n]*/gi,"$1").replace(/(^|,)\s*aucun\s*(?=,|$)/gi,"$1").replace(/^[,\s]+|[,\s]+$/g,"")]:[], {vm})+gcell(W[9], first?[g.epi||""]:[], {vm})+gcell(W[10], first?[g.com||""]:[], {vm})+'</w:tr>';
      });
      out += t + '</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="160"/><w:rPr><w:sz w:val="8"/></w:rPr></w:pPr></w:p>';
    });
  });
  return xml.slice(0,start) + out + xml.slice(end);
}
/* ================= Page de garde ================= */
function posOfText(xml, needle, from){
  const re = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g; re.lastIndex = from||0; let txt = "", map = [], m;
  while((m = re.exec(xml))){ map.push([txt.length, m.index]); txt += m[1]; }
  const i = txt.indexOf(needle); if(i<0) return -1;
  let k = 0; while(k+1<map.length && map[k+1][0]<=i) k++; return map[k][1];
}
function fillFieldsSeq(seg, vals, sizes){
  let i = -1; const re = /(FORMTEXT[\s\S]*?w:fldCharType="separate"\/><\/w:r>)([\s\S]*?)(<w:r[ >](?:(?!<w:r[ >])[\s\S])*?w:fldCharType="end"\/><\/w:r>)/g;
  return seg.replace(re, (m,a,b,c)=>{ i++; const v = vals[i]; if(v==null || String(v).trim()==="") return m;
    const sz = (sizes && sizes[i]) || 20; return a+'<w:r><w:rPr><w:sz w:val="'+sz+'"/><w:szCs w:val="'+sz+'"/></w:rPr>'+String(v).split("\n").map((l,j)=>(j?'<w:br/>':'')+'<w:t xml:space="preserve">'+esc(l)+'</w:t>').join("")+'</w:r>'+c; });
}
const fmtDate = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v||""); return m ? m[3]+"/"+m[2]+"/"+m[1] : (v||""); };

/* ---- §3.2 : choix 1 (pas d'ERC) / choix 2 (ERC) : on ne garde qu'un seul bloc ---- */
function fillErc(xml){
  const e = S.ent; const mode = e.ercMode || ((S.cand||[]).length ? "present" : ""); if(!mode) return xml;
  const a = xml.indexOf("Choix 1"); if(a<0) return xml;
  const pStart = i => Math.max(xml.lastIndexOf("<w:p ", i), xml.lastIndexOf("<w:p>", i));
  const s0 = pStart(a), eIdx = posOfText(xml, "Le détail des modifications", a); if(eIdx<0) return xml; const e0 = xml.indexOf("</w:p>", eIdx)+6;
  const seg = xml.slice(s0, e0), P = [...seg.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(m=>m[0]);
  const txt = p => textOf(p).replace(/\s+/g," ").trim(), nored = p => p.replace(/<w:color w:val="FF0000"\/>/g,"");
  const mk = (p, t) => { const ppr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(p)||[""])[0].replace(/<w:rPr>[\s\S]*?<\/w:rPr>/,""); return "<w:p>"+ppr+'<w:r><w:t xml:space="preserve">'+esc(t)+"</w:t></w:r></w:p>"; };
  const i2 = P.findIndex(p=>/^Choix 2/.test(txt(p))); if(i2<0) return xml;
  let out = [];
  if(mode==="absent"){ out = P.slice(0,i2).filter(p=>!/^Choix 1/.test(txt(p))); }
  else {
    P.slice(i2+1).forEach(p=>{ const t = txt(p);
      if(/référencée/.test(t)){ out.push(fillFieldsSeq(p, [null, e.ercRef||"Seirich", fmtDate(e.ercDate)])); return; }
      if(/^Descriptif de la méthode de l/.test(t)){ out.push(mk(p, "Descriptif de la méthode de l’ERC (SEIRICH) et de la méthode de cotation :")); return; }
      if(/^Elle comporte l.inventaire/.test(t)){ out.push(nored(p)); return; }
      if(/^Résultats de l.ERC/.test(t)){ out.push(mk(p, "Résultats de l’ERC : les GEH, leurs tâches et les agents chimiques issus de l’inventaire sont présentés au paragraphe 3.7.")); return; }
      if(/^Compléments éventuels/.test(t) || /^Une analyse critique/.test(t) || /^supprimer certains/.test(t) || /^Le détail des modifications/.test(t)){ out.push(nored(p)); return; }
      if(/^reclasser certains/.test(t)) return;
      if(!t && /FORMTEXT/.test(p)) return;
      out.push(p); });
  }
  return xml.slice(0,s0) + out.join("") + xml.slice(e0);
}
/* ---- §2.3 : phrases rouges du modèle (exclusions / VLEP non réglementaires) : retirées, à ajouter à la main si le client l'a demandé ---- */
function dropRedClient(xml){
  [/A votre demande, les services \/ laboratoires/, /A votre demande, x pr.l.vements individuels/].forEach(re=>{
    const m = re.exec(textOf(xml)); if(!m) return;
    const i = posOfText(xml, m[0].slice(0,24)); if(i<0) return; const st = Math.max(xml.lastIndexOf("<w:p ", i), xml.lastIndexOf("<w:p>", i)), en = xml.indexOf("</w:p>", i)+6;
    if(st>=0 && en>st && /FF0000/.test(xml.slice(st,en))) xml = xml.slice(0,st)+xml.slice(en); });
  return xml;
}
/* ---- pieds de page : n° d'affaire ---- */
function fillFooter(xml, aff){
  if(!aff) return xml; const a = xml.indexOf("affaire"); if(a<0) return xml;
  const re = /<w:r[ >](?:(?!<w:r[ >])[\s\S])*?<w:t[^>]*>[^<]*:[^<]*<\/w:t>(?:(?!<w:r[ >])[\s\S])*?<\/w:r>/g; re.lastIndex = Math.max(xml.lastIndexOf("<w:r>", a), xml.lastIndexOf("<w:r ", a));
  const m = re.exec(xml); if(!m) return xml; const rpr = (/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(m[0])||[""])[0];
  return xml.slice(0, m.index+m[0].length) + '<w:r>'+rpr+'<w:t xml:space="preserve"> '+esc(aff)+' </w:t></w:r>' + xml.slice(m.index+m[0].length);
}
function fillCover(xml){
  const e = S.ent;
  try{
    /* segment 3 : n° d'affaire, mission, agence, accréditation */
    let a = posOfText(xml, "affaire"), b = posOfText(xml, "Liste des sites");
    if(a>=0 && b>a){ xml = xml.slice(0,a) + fillFieldsSeq(xml.slice(a,b), [e.affaire, fmtDate(e.dateMission), e.agence, e.accred], [0,0,0,10]) + xml.slice(b); }
    /* § Objectif : « contrat référencé » = n° d'affaire */
    const ct = posOfText(xml, "contrat référencé");
    if(ct>=0 && (e.affaire||"").trim()){ const ce = xml.indexOf("</w:p>", ct); xml = xml.slice(0,ct) + fillFieldsSeq(xml.slice(ct, ce>ct?ce:ct+3000), [e.affaire]) + xml.slice(ce>ct?ce:ct+3000); }
    /* date d'édition : cellule vide sous l'intitulé */
    const d = posOfText(xml, "dition du rapport");
    if(d>=0){
      const tr0 = xml.lastIndexOf("<w:tr", d), tr1 = xml.indexOf("</w:tr>", d)+7, nx = xml.indexOf("<w:tr", tr1);
      if(nx>=0){ const nxe = xml.indexOf("</w:tr>", nx)+7, row = xml.slice(nx,nxe), tc = /<w:tc>[\s\S]*?<\/w:tc>/.exec(row);
        if(tc){ const val = fmtDate(e.dateEdition) || new Date().toLocaleDateString("fr-FR"); const nc = tc[0].replace(/<\/w:p>/, '<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">'+esc(val)+'</w:t></w:r></w:p>'); xml = xml.slice(0,nx) + row.replace(tc[0], ()=>nc) + xml.slice(nxe); } }
    }
    /* segment 2 : une seule case « rédacteur » (on retire « intervenant » et « validé par ») */
    { const ia = xml.indexOf("Intervention sur site");
      if(ia>=0){ const ts = xml.lastIndexOf("<w:tbl>", ia), te = xml.indexOf("</w:tbl>", ia)+8; let t = xml.slice(ts,te);
        const rs = rows_of(t); if(rs.length>=3){
          const tcsOf = r => r[0].match(/<w:tc>[\s\S]*?<\/w:tc>/g)||[];
          const keep = [1,1,1].map((ci,k)=>{ const c = tcsOf(rs[k]); return c[Math.min(ci,c.length-1)] || c[0]; }).map(c=>c.replace(/<w:tcW [^>]*\/>/, '<w:tcW w:w="3118" w:type="dxa"/>').replace(/<w:gridSpan [^>]*\/>/, ""));
          let nt = t.slice(0, rs[0].index).replace(/<w:tblW [^>]*\/>/, '<w:tblW w:w="3118" w:type="dxa"/>').replace(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/, '<w:tblGrid><w:gridCol w:w="3118"/></w:tblGrid>');
          rs.slice(1,3).forEach((r,k0)=>{ const k = k0+1; const open = r[0].match(/^<w:tr[^>]*>(?:<w:trPr>[\s\S]*?<\/w:trPr>)?/)[0]; nt += open + (k===1 ? keep[k].replace(/(<w:t[^>]*>)\s*rédigé(<\/w:t>)/, '$1Rédacteur$2').replace(/(<w:t[^>]*>)\s*par(<\/w:t>)/, '$1$2') : keep[k]) + "</w:tr>"; });
          nt += "</w:tbl>";
          nt = fillFieldsSeq(nt, [e.redacteur]);
          xml = xml.slice(0,ts) + nt + xml.slice(te); } } }
    /* segment 1 : destinataire */
    b = posOfText(xml, "CONTROLE REGLEMENTAIRE");
    if(b>0){ let s = xml.slice(0,b);
      s = fillFieldsSeq(s, [e.nom||"\u200b", e.adresse||"\u200b", e.cpville||"\u200b"]);
      if(!(e.contact||"").trim()) s = s.replace(/(<w:t(?: [^>]*)?>)([^<]*attention de\s*)(<\/w:t>)/, '$1$3'); else s = s.replace(/(<w:t(?: [^>]*)?>)([^<]*attention de\s*)(<\/w:t>)/, (m,o,t,c)=>'<w:t xml:space="preserve">'+t.replace(/\s*$/," ")+esc(e.contact.trim())+c);
      xml = s + xml.slice(b); }
  }catch(err){ console.warn("Page de garde :", err); }
  return xml;
}
