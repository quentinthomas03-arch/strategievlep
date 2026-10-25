"use strict";
/* ================= Projet : ouvrir / enregistrer / nouveau ================= */
async function saveProject(){
  const name = "Projet_"+safe(S.ent.nom)+"_"+today()+".json", blob = new Blob([JSON.stringify(S,null,1)],{type:"application/json"});
  try{ const f = new File([blob], name, {type:"application/json"}); if(/Mobi|iPhone|iPad|Android/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], title:name}); bkStamp(); return; } }catch(e){ if(e && e.name==="AbortError") return; }
  download(blob, name); bkStamp();
}
function b64Lines(bytes){ let bin = ""; for(let i=0;i<bytes.length;i+=0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i,i+0x8000)); return btoa(bin).replace(/(.{76})/g,"$1\r\n"); }
async function mailProject(){
  const name = "Projet_"+safe(S.ent.nom)+"_"+today()+".json", json = JSON.stringify(S), blob = new Blob([json],{type:"application/json"});
  const mobile = /Mobi|iPhone|iPad|Android/i.test(navigator.userAgent);
  try{ const f = new File([blob], name, {type:"application/json"}); if(mobile && navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], title:"Projet VLEP "+(S.ent.nom||"")}); bkStamp(); return; } }catch(e){ if(e && e.name==="AbortError") return; }
  /* PC : brouillon .eml (X-Unsent) -> s'ouvre dans Outlook avec la pièce jointe, il reste à saisir l'adresse */
  const bytes = new TextEncoder().encode(json), subj = "Projet VLEP - "+(S.ent.nom||"sans nom"), bd = "----=_vlep_"+Date.now().toString(36);
  const enc = t => /^[\x20-\x7E]*$/.test(t) ? t : "=?UTF-8?B?"+btoa(String.fromCharCode(...new TextEncoder().encode(t)))+"?=";
  const eml = ["X-Unsent: 1","Subject: "+enc(subj),"MIME-Version: 1.0",'Content-Type: multipart/mixed; boundary="'+bd+'"',"",
    "--"+bd,'Content-Type: text/plain; charset="utf-8"',"Content-Transfer-Encoding: 7bit","","Projet de strategie VLEP en piece jointe.","Sur le telephone : ouvrir Strategie_VLEP.html, puis Ouvrir un projet et choisir ce fichier.","",
    "--"+bd,'Content-Type: application/json; name="'+name+'"',"Content-Transfer-Encoding: base64",'Content-Disposition: attachment; filename="'+name+'"',"",b64Lines(bytes),"","--"+bd+"--",""].join("\r\n");
  download(new Blob([eml],{type:"message/rfc822"}), "Brouillon_"+safe(S.ent.nom)+".eml"); bkStamp();
  alert("Brouillon créé : ouvre le fichier .eml téléchargé (double-clic). Outlook affiche un mail avec le projet en pièce jointe : saisis ton adresse et envoie.");
}
$("#bMail").onclick = mailProject;

/* ================= Dossier de mission (ZIP Client / Mission) ================= */
function carnetText(){
  return allGeh().map((o,i)=>{ const g = o.g, n = g.notes||[]; if(!n.length) return ""; const L = ["GEH "+(i+1)+" – "+(g.des||"")+" ["+(o.a.nom||"")+"]"];
    n.filter(z=>!z.tid).forEach(z=>L.push("  - "+(C_LAB[z.type]||z.type)+" : "+z.txt));
    g.taches.forEach(k=>{ const l = n.filter(z=>z.tid===k.id); if(l.length){ L.push("  Tâche : "+(k.t||"")); l.forEach(z=>L.push("    - "+(C_LAB[z.type]||z.type)+" : "+z.txt)); } });
    return L.join("\n"); }).filter(Boolean).join("\n\n");
}
function exclCsv(){
  const q = v => '"'+String(v==null?"":v).replace(/"/g,'""').replace(/\n/g," | ")+'"', L = [["GEH","GEH écarté","Tâche","Produit / agent","Motif","Date de fin"].map(q).join(";")];
  exAll().forEach(o=>L.push([o.g.des, o.arch!=null?"oui":"", o.x.t, o.x.prod, EXWHY[o.x.why]||o.x.why, o.x.date].map(q).join(";")));
  return "﻿"+L.join("\r\n");
}
async function packMission(){
  try{
    persist();
    const cli = (S.ent.nom||"").trim() ? safe(S.ent.nom) : "Client_sans_nom", dt = (/^\d{4}-\d{2}-\d{2}/.exec(S.ent.dateMission||"")||[today()])[0], aff = (S.ent.affaire||"").trim() ? safe(S.ent.affaire)+"_" : "";
    const mission = aff+dt, root = cli+"/"+mission+"/", jsn = "Projet_"+cli+"_"+dt+".json", zip = new JSZip();
    zip.file(root+jsn, JSON.stringify(S,null,1));
    const car = carnetText(); if(car) zip.file(root+"Carnet_de_visite.txt", car);
    if(exAll().length) zip.file(root+"Elements_exclus.csv", exclCsv());
    zip.file(root+"LISEZMOI.txt", ["Dossier de mission généré le "+new Date().toLocaleString("fr-FR")+" par l'appli Stratégie VLEP.","","Client : "+(S.ent.nom||"")+"\nMission : "+(S.ent.affaire||"")+" "+dt,"","- "+jsn+" : le projet complet. Dans l'appli : « Ouvrir un projet » (le ZIP entier est aussi accepté).","- Carnet_de_visite.txt : notes de visite par GEH.","- Elements_exclus.csv : lignes retirées (fin d'activité / d'utilisation, sans exposition), avec motif et date.","","Rangement conseillé : un dossier par client, un sous-dossier par mission (OneDrive / iCloud).",""].join("\n"));
    const blob = await zip.generateAsync({type:"blob", compression:"DEFLATE"}), name = cli+"_"+mission+".zip";
    try{ const f = new File([blob], name, {type:"application/zip"}); if(/Mobi|iPhone|iPad|Android/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], title:name}); bkStamp(); return; } }catch(e){ if(e && e.name==="AbortError") return; }
    download(blob, name); bkStamp();
  }catch(err){ alert("Échec de la création du dossier : "+err.message); }
}
$("#bPack").onclick = packMission;

/* mise à jour : détecte une nouvelle version publiée et propose d'actualiser */
(function(){
  if(!/^https?:/.test(location.protocol)) return;
  const mine = (document.querySelector('meta[name="app-version"]')||{}).content; if(!mine) return;
  let shown = false;
  async function check(){
    if(shown || !navigator.onLine) return;
    try{
      const r = await fetch(location.pathname+"?v="+Date.now(), {cache:"no-store", headers:{Range:"bytes=0-3000"}});
      const m = /name="app-version" content="([^"]+)"/.exec(await r.text());
      if(m && m[1]!==mine){ shown = true; $("#updBar").classList.add("on"); }
    }catch(e){}
  }
  $("#bUpd").onclick = async ()=>{ persist();
    try{ const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(x=>x.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))); }catch(e){}
    location.reload(); };
  $("#bUpdX").onclick = ()=>$("#updBar").classList.remove("on");
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) check(); });
  setTimeout(check, 3000); setInterval(check, 10*60*1000);
})();

/* mode terrain : sur téléphone, seul l'onglet Terrain est proposé */
(function(){
  let force = null; try{ force = localStorage.getItem("vlep-fieldmode"); }catch(e){}
  const phone = /iPhone|Android.*Mobile|Mobile.*Safari/i.test(navigator.userAgent) || (window.matchMedia && matchMedia("(max-width:760px)").matches);
  const on = force==="0" ? false : (force==="1" || phone);
  const apply = v => { document.body.classList.toggle("fieldmode", v); $("#bAllTabs").textContent = v ? "Afficher toutes les rubriques" : "Revenir au mode terrain"; $("#fieldBar").style.display = (v || phone) ? "flex" : "none"; try{ localStorage.setItem("vlep-fieldmode", v?"1":"0"); }catch(e){} if(v) show("terrain"); };
  $("#bAllTabs").onclick = ()=>apply(!document.body.classList.contains("fieldmode"));
  if(on){ document.body.classList.add("fieldmode"); $("#fieldBar").style.display = "flex"; show("terrain"); }
  else if(phone){ $("#fieldBar").style.display = "flex"; $("#bAllTabs").textContent = "Revenir au mode terrain"; }
})();

$("#bSave").onclick = saveProject; $("#bSave2").onclick = saveProject;
$("#bOpen").onclick = ()=> $("#fOpen").click();
async function readProjectFile(f){
  let o;
  if(/\.zip$/i.test(f.name)){
    const z = await JSZip.loadAsync(await f.arrayBuffer()), names = Object.keys(z.files).filter(n=>/\.json$/i.test(n) && !z.files[n].dir).sort((a,b)=>(/projet/i.test(b)?1:0)-(/projet/i.test(a)?1:0));
    for(const n of names){ try{ const t = JSON.parse(await z.files[n].async("string")); if(t && t.v===1 && t.ent && Array.isArray(t.agents)){ o = t; break; } }catch(_){} }
    if(!o) throw new Error("format");
  } else { o = JSON.parse(await f.text()); }
  if(!o||o.v!==1||!o.ent||!Array.isArray(o.agents)) throw new Error("format");
  return o;
}
function findByMid(mid){
  if(!mid) return null;
  return DOS.list.find(d=>{ if(d.mid) return d.mid===mid; try{ const s = JSON.parse(localStorage.getItem(dkey(d.id))); if(s && s.mid){ d.mid = s.mid; return s.mid===mid; } }catch(e){} return false; }) || null;
}
/* un projet qui porte l'identifiant d'une mission déjà présente la met à jour (version précédente gardée) ; sinon nouveau dossier */
function openProject(raw){
  const hadMid = !!raw.mid, o = normalize(raw), ex = hadMid ? findByMid(o.mid) : null;
  if(ex && confirm("Cette mission est déjà dans l'appli : « "+(ex.name||"Nouveau dossier")+" » (dernière modification ici : "+fmtDT(ex.upd)+").\n\nOK = mettre à jour ce dossier avec le fichier (l'ancienne version est gardée, bouton ↩)\nAnnuler = ouvrir le fichier comme une copie séparée")){
    persist(); try{ const old = localStorage.getItem(dkey(ex.id)); if(old) localStorage.setItem(prevKey(ex.id), old); }catch(e){}
    DOS.cur = ex.id; S = o; resetUI(); persist(); return "maj";
  }
  if(ex) o.mid = newMid();
  newDossier(o); return "nouveau";
}
reg("fOpen", async e=>{
  const f = e.target.files[0]; if(!f) return;
  try{ openProject(await readProjectFile(f)); show(document.body.classList.contains("fieldmode") ? "terrain" : "ent");
  }catch(err){ alert("Fichier projet invalide."); }
  e.target.value="";
});
$("#bPrev").onclick = ()=>{ let prev = null; try{ prev = localStorage.getItem(prevKey(DOS.cur)); }catch(e){} if(!prev) return;
  if(!confirm("Revenir à la version de ce dossier d'avant la dernière mise à jour par fichier ? La version actuelle est gardée (re-cliquer ↩ pour revenir).")) return;
  let o; try{ o = normalize(JSON.parse(prev)); }catch(e){ return; }
  try{ const cur = localStorage.getItem(dkey(DOS.cur)); localStorage.setItem(dkey(DOS.cur), prev); if(cur) localStorage.setItem(prevKey(DOS.cur), cur); }catch(e){}
  S = o; resetUI(); persist(); };
$("#bNew").onclick = ()=>{ newDossier(); show(document.body.classList.contains("fieldmode") ? "terrain" : "ent"); };
$("#dSel").addEventListener("change", e=>switchDossier(e.target.value));
$("#bDelD").onclick = ()=>{ const d = DOS.list.find(x=>x.id===DOS.cur); if(!confirm("Supprimer le dossier « "+((d&&d.name)||"Nouveau dossier")+" » de ce navigateur ? (enregistre-le d'abord en .json si besoin)")) return;
  try{ localStorage.removeItem(dkey(DOS.cur)); localStorage.removeItem(prevKey(DOS.cur)); }catch(e){} DOS.list = DOS.list.filter(x=>x.id!==DOS.cur);
  if(!DOS.list.length){ const id = uid(); DOS.list.push({id,name:"",upd:Date.now()}); DOS.cur = id; S = blank(); }
  else { DOS.cur = DOS.list.slice().sort((a,b)=>b.upd-a.upd)[0].id; try{ S = normalize(JSON.parse(localStorage.getItem(dkey(DOS.cur)))); }catch(e){ S = blank(); } }
  resetUI(); persist(); show(document.body.classList.contains("fieldmode") ? "terrain" : "ent"); };
