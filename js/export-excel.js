"use strict";
/* ================= Export Excel (xlsx minimal) ================= */
const colL = n => { let s=""; n++; while(n){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26);} return s; };
function sheetXml(header, data, widths, styleFor, opts){
  opts = opts||{};
  const cell = (v,c,r,st)=>{
    const ref = colL(c)+r;
    if(v===""||v==null) return '<c r="'+ref+'" s="'+st+'"/>';
    if(typeof v==="number") return '<c r="'+ref+'" s="'+st+'"><v>'+v+'</v></c>';
    return '<c r="'+ref+'" s="'+st+'" t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>';
  };
  let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+
    widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols><sheetData>';
  x += '<row r="1" ht="32" customHeight="1">'+header.map((h,c)=>cell(h,c,1,1)).join("")+'</row>';
  data.forEach((row,ri)=>{ x += '<row r="'+(ri+2)+'">'+row.map((v,c)=>cell(v,c,ri+2,styleFor(row,c))).join("")+'</row>'; });
  x += '</sheetData>'+(opts.noFilter?'':'<autoFilter ref="A1:'+colL(header.length-1)+(data.length+1)+'"/>');
  if(opts.merges && opts.merges.length) x += '<mergeCells count="'+opts.merges.length+'">'+opts.merges.map(m=>'<mergeCell ref="'+m+'"/>').join("")+'</mergeCells>';
  x += '</worksheet>';
  return x;
}
const num = v => (v!=null && v!=="" && !isNaN(+v)) ? +v : (v==null?"":v);
async function buildXlsx(){
  const idx = sortedIdx().map(k=>S.agents[k]).filter(a=>!noLab(a));
  const ent = [["Nom",S.ent.nom],["Adresse",S.ent.adresse],["Code NAF",S.ent.naf],["SIRET",S.ent.siret],["Effectif site",S.ent.effectif],["Contact sur le site",S.ent.contact],["Activité",S.ent.activite],["Notes de visite",S.ent.notes]];
  const s1 = sheetXml(["Champ","Valeur"], ent, [26,80], (r,c)=>c===0?3:2);
  const h2 = ["Agent chimique","N° CAS","VLEP 8 h (mg/m³)","VLEP CT (mg/m³)","CMR","Type de VLEP","Accréd. prélèvements","Accréd. analyses"];
  const d2 = idx.map(a=>[a.agent,a.cas||"-",num(a.v8),num(a.vct),a.cmr||"-",TYPE_LBL[vtype(a)],a.accP==="X"?"X":"",a.accA==="X"?"X":""]);
  const typeOf = r => r[5]==="contraignante"?"contr":(r[5]==="indicative"?"indic":"adm");
  const s2 = sheetXml(h2, d2, [46,14,12,12,8,16,12,12], (r,c)=> (r[6]!=="X"||r[7]!=="X") && c===0 ? 6 : (c<4 ? (typeOf(r)==="contr"?3:(typeOf(r)==="indic"?4:2)) : 2));
  const h3 = ["Agent chimique","N° CAS","Méthode","Principe du prélèvement","Support de prélèvement","Positionnement du support","Laboratoire","LQ (µg/support)","Débit min CT (L/min)","Débit max CT (L/min)","Débit min 8 h (L/min)","Débit max 8 h (L/min)","Commentaire","Stockage avant prélèvement","Conservation après prélèvement","Transport","Accréd. prélèvements","Accréd. analyses"];
  const d3 = idx.map(a=>[a.agent,a.cas||"-",a.methode||"",a.principe||"",a.support||"",a.position||"",a.labo||"",num(a.lq),num(a.dminCT),num(a.dmaxCT),num(a.dmin8),num(a.dmax8),a.commentaire||"",a.stockage||"",a.conservation||"",a.transport||"",a.accP==="X"?"X":"",a.accA==="X"?"X":""]);
  const s3 = sheetXml(h3, d3, [40,13,30,34,26,22,22,10,10,10,10,10,50,34,34,30,11,11], (r,c)=>c===0?3:2);
  /* Décomposition en GEH */
  const gd = [], gm = []; let rn = 1, gn = 0;
  S.ateliers.forEach((a,ai)=>{ rn++; const hd = ["Atelier "+(ai+1)+" : "+(a.nom||""),"",""]; hd.sec = true; gd.push(hd); gm.push("A"+rn+":C"+rn);
    a.gehs.forEach(g=>{ rn++; gn++; gd.push([gn, g.des||"", g.eff||""]); }); });
  const s4 = sheetXml(["N° GEH","Désignation du GEH","Effectif"], gd, [14,60,16], (r,c)=> r.sec ? 3 : 2, {merges:gm, noFilter:true});
  /* Plan d'échantillonnage */
  const pd = [], pm = []; rn = 1;
  S.plan.forEach(r=>{ rn++; if(r.kind==="sec"){ const row = [r.txt||"","","","","",""]; row.sec = true; pd.push(row); pm.push("A"+rn+":F"+rn); }
    else pd.push([(r.jour||"").trim(), planAgents(r).join("\n"), planGeh(r), num(r.nb), r.type||"", (r.plage||"").trim()]); });
  const s5 = sheetXml(["Jour","Agents chimiques","N° GEH","Nb total de prélèvements","Type de VLEP","Plage horaire de prélèvement"], pd, [14,55,32,14,12,40], (r,c)=> r.sec ? 3 : 2, {merges:pm, noFilter:true});
  /* Tâches (3.7) */
  const td = []; let gn2 = 0;
  S.ateliers.forEach(a=>a.gehs.forEach(g=>{ gn2++; const L = (g.taches.length && mergedTasks(g).length) ? mergedTasks(g) : [{t:"",dur:[],frq:[],prods:[],ags:[]}];
    L.forEach(k=>td.push([gn2, a.nom||"", g.des||"", g.eff||"", g.orga||"", k.t||"", k.dur.join(" / "), k.frq.join(" / "), k.prods.join(", "), k.ags.join("\n"), String(g.epc||"").replace(/(^|,\s*|\n)\s*(absence de|pas de|sans|aucune|aucun) ventilation[^,\n]*/gi,"$1").replace(/(^|,)\s*aucun\s*(?=,|$)/gi,"$1").replace(/^[,\s]+|[,\s]+$/g,""), g.epi||"", g.com||""])); }));
  const s6 = sheetXml(["N° GEH","Atelier","Désignation du GEH","Effectif","Organisation du travail","Tâche élémentaire","Durée d'exposition","Fréquence d'exposition","Produits utilisés","Agents chimiques (ACD)","Environnement / EPC","EPI","Commentaire"], td, [8,24,30,10,22,40,22,16,44,34,24,24,30], (r,c)=>2);
  const z = new JSZip();
  z.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+[1,2,3,4,5,6].map(i=>'<Override PartName="/xl/worksheets/sheet'+i+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>');
  z.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  z.file("xl/workbook.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Entreprise" sheetId="1" r:id="rId1"/><sheet name="Accréditation (2.4)" sheetId="2" r:id="rId2"/><sheet name="Annexe méthodes" sheetId="3" r:id="rId3"/><sheet name="Décomposition en GEH" sheetId="4" r:id="rId4"/><sheet name="Plan d\'échantillonnage" sheetId="5" r:id="rId5"/><sheet name="Tâches (3.7)" sheetId="6" r:id="rId6"/></sheets></workbook>');
  z.file("xl/_rels/workbook.xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+[1,2,3,4,5,6].map(i=>'<Relationship Id="rId'+i+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+i+'.xml"/>').join("")+'<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  const bd = '<border><left style="thin"><color rgb="FFBFE7F7"/></left><right style="thin"><color rgb="FFBFE7F7"/></right><top style="thin"><color rgb="FFBFE7F7"/></top><bottom style="thin"><color rgb="FFBFE7F7"/></bottom><diagonal/></border>';
  z.file("xl/styles.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FF0000FF"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFB35A00"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00ACE8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3E6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+bd+'</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  [s1,s2,s3,s4,s5,s6].forEach((s,i)=>z.file("xl/worksheets/sheet"+(i+1)+".xml", s));
  return z.generateAsync({type:"blob", compression:"DEFLATE", mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
$("#bXlsx").onclick = async ()=>{
  try{ download(await buildXlsx(), "Strategie_"+safe(S.ent.nom)+"_"+today()+".xlsx"); msg("Excel généré : "+S.agents.filter(a=>!noLab(a)).length+" agent(s), "+S.plan.filter(r=>r.kind!=="sec").length+" ligne(s) de plan, 6 feuilles."); }
  catch(err){ msg("Échec de l'export Excel : "+esc(err.message), "warn"); }
};
