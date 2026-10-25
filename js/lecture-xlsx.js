"use strict";
/* ================= Lecture xlsx (local) ================= */
function colIdx(ref){ let n=0; const m = /^[A-Z]+/.exec(ref)[0]; for(const ch of m) n = n*26 + ch.charCodeAt(0)-64; return n-1; }
async function readXlsx(buf){
  const z = await JSZip.loadAsync(buf), P = t => new DOMParser().parseFromString(t,"application/xml");
  const rd = async p => { const f = z.file(p); return f ? P(await f.async("string")) : null; };
  const wb = await rd("xl/workbook.xml"), rel = await rd("xl/_rels/workbook.xml.rels");
  if(!wb || !rel) throw new Error("Fichier Excel invalide.");
  const rmap = {}; for(const r of rel.getElementsByTagName("Relationship")) rmap[r.getAttribute("Id")] = r.getAttribute("Target");
  const ss = [], sst = await rd("xl/sharedStrings.xml");
  if(sst) for(const si of sst.getElementsByTagName("si")) ss.push([...si.getElementsByTagName("t")].filter(t=>t.parentNode.nodeName!=="rPh").map(t=>t.textContent).join(""));
  const out = {};
  for(const sh of wb.getElementsByTagName("sheet")){
    const name = sh.getAttribute("name"), rid = sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id") || sh.getAttribute("r:id");
    let tg = rmap[rid]; if(!tg) continue; tg = tg.replace(/^\//,""); const doc = await rd(tg.startsWith("xl/") ? tg : "xl/"+tg); if(!doc) continue;
    const rows = [];
    for(const row of doc.getElementsByTagName("row")){
      const ri = parseInt(row.getAttribute("r"))-1, arr = [];
      for(const c of row.getElementsByTagName("c")){
        const t = c.getAttribute("t"); let v = "";
        if(t==="inlineStr") v = [...c.getElementsByTagName("t")].map(x=>x.textContent).join("");
        else { const ve = c.getElementsByTagName("v")[0]; if(ve){ v = ve.textContent; if(t==="s") v = ss[+v]||""; else if(t==="b") v = v==="1"?"True":"False"; } }
        arr[colIdx(c.getAttribute("r"))] = v;
      }
      rows[ri] = arr;
    }
    out[name] = Array.from(rows, r=>r||[]);
  }
  return out;
}
