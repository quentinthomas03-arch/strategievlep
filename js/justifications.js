"use strict";
/* ================= Justifications (§ plan d'échantillonnage) ================= */
const J_SECS = [
  ["vlepct","Justifications concernant les mesures de VLEP court-terme en première campagne de l’évaluation initiale"],
  ["fcr","Justifications concernant les FCR"],
  ["erc","Justifications faisant suite à l’analyse critique de l’ERC"],
  ["regr","Justifications permettant de regrouper certains GEH"],
  ["elim","Justifications permettant d’éliminer certains GEH"],
  ["duree","Justifications concernant la durée des mesures"],
  ["nb","Justifications concernant le nombre de mesures réalisées"],
  ["ag","Justifications concernant les agents chimiques retenus"],
  ["per","Justifications concernant la période d’intervention"],
  ["autres","Autres justifications"],
  ["infos","Informations sur les mesures"]
];
const TBC = "[à compléter]";
const J_LIB = [
  ["vlepct","vlepct.A","La phase la plus exposante à l’agent chimique "+TBC+" n’ayant pas pu être déterminée pour le GEH "+TBC+", nous avons choisi de réaliser les mesures court terme sur 3 phases distinctes lors de cette première campagne. Cela permet d’éviter de réaliser un nombre important de mesures lors de cette 1ère campagne. A contrario, il existe un risque que, à l’issue de l’évaluation initiale, le GEH soit non homogène pour cet agent chimique. Dans ce cas, nous devrons réétudier les GEH et réaliser des mesures complémentaires afin de pouvoir statuer réglementairement."],
  ["vlepct","vlepct.B","La phase la plus exposante à l’agent chimique "+TBC+" n’ayant pas pu être déterminée pour le GEH "+TBC+", nous avons choisi de réaliser les mesures court terme triplées sur chaque phase exposante identifiée. A l’issue de cette première campagne nous statuerons sur la phase la plus exposante si existante. Cela nous permet de pouvoir statuer directement à l’issue de cette première campagne mais nous contraint à multiplier le nombre de mesures."],
  ["fcr","fcr.A","La nature des fibres ayant déjà été caractérisée au préalable ("+TBC+"), l’analyse des prélèvements comprenant l’observation et le dénombrement des FCR sur les filtres sera réalisée en microscopie optique à contraste de phase (MOCP)."],
  ["fcr","fcr.B","Aucune information ne permet d’attester à ce jour la présence de FCR. La caractérisation de la nature des fibres observées sera réalisée en microscopie électronique à balayage analytique (MEBA) en complément de l’observation et du dénombrement par microscopie optique à contraste de phase (MOCP). Deux prélèvements en parallèle seront par conséquent requis."],
  ["erc","erc.A","Certains produits sont utilisés en très faible quantité, de manière discontinue voire épisodique et sur des laps de temps très courts (quelques gouttes par jour / une pulvérisation par jour). L’exposition à ces produits a été considérée comme faible au cours de la visite préalable malgré le classement en risque non faible dans l’ERC."],
  ["erc","erc.B","Le produit "+TBC+" contient un agent CMR de catégorie 1A ou 1B à une concentration inférieure au seuil de classification CMR. Ce produit n’est par conséquent pas classé CMR. Étant classé en risque faible dans l’ERC, le contrôle selon l’arrêté du 15 décembre 2009 n’est pas obligatoire."],
  ["erc","erc.C","Certaines mesures figurant dans le plan d’échantillonnage sont réalisées dans le cadre de votre ERC, hors application de l’arrêté du 15 décembre 2009, pour valider ou non certaines opérations / substances classées à risque faible. Dans certains cas, des mesures à poste fixe sont prévues à votre demande."],
  ["erc","erc.D","L’agent chimique "+TBC+" va disparaître. Un produit de substitution a été introduit. Il n’a pas été utilisé depuis plus de 6 mois, même si le produit est encore présent sur site. Aucun prélèvement n’a, par conséquent, été prévu pour cet agent chimique."],
  ["regr","regr.A","Les GEH "+TBC+" sont regroupés en un seul GEH : ces opérations ont lieu dans un seul et même bâtiment, les produits mis en œuvre sont identiques et les conditions de travail (EPC, organisation) sont identiques."],
  ["elim","elim.A","Les GEH établis ne comportent que des opérateurs et certains chefs d’équipe. En effet, le personnel d’encadrement ou administratif n’est peu ou pas présent à proximité des sources d’exposition. Le personnel d’encadrement et le personnel administratif sont par conséquent exclus de ces GEH, leur exposition étant jugée plus faible que celle des opérateurs."],
  ["elim","elim.B","Le personnel administratif travaille dans des bureaux indépendants. Il n’est pas amené à traverser les ateliers comportant des sources d’exposition. Le personnel administratif est par conséquent exclu des GEH."],
  ["elim","elim.C","Les superviseurs sont a priori moins exposés que les opérateurs. Ainsi, si la VLEP est respectée pour les opérateurs, elle le sera également pour les superviseurs. Par conséquent, dans un premier temps, seul le GEH « opérateurs » est intégré au plan d’échantillonnage. Le GEH « superviseurs » fera l’objet d’une campagne de prélèvement ultérieurement, en cas de dépassement de la VLEP pour les opérateurs."],
  ["duree","duree.A","L’agent chimique "+TBC+" dispose d’une VLEP court-terme et d’une VLEP 8h. L’exposition à cet agent chimique n’est effective que pendant une courte durée (quelques minutes par jour) et l’opération correspondante n’est pas répétée dans la journée. Par conséquent, seule la VLEP court terme fera l’objet d’un prélèvement spécifique de 15 minutes. Le respect de la VLEP 8h sera vérifié par pondération à partir du résultat du contrôle de la VLEP court-terme, en considérant une exposition nulle le reste du temps."],
  ["duree","duree.B","L’agent chimique "+TBC+" dispose d’une VLEP court-terme et d’une VLEP 8h. L’opération de "+TBC+" est de courte durée, mais répétée "+TBC+" fois par jour, ce qui justifie le contrôle de la VLEP 8h."],
  ["nb","nb.A","D’après les informations recueillies, cette opération a lieu moins de 12 fois par an. Lorsque le nombre de jours travaillés par an est faible, ainsi que le nombre de personnes dans le GEH, l’arrêté du 15/12/09 prévoit de réaliser des mesurages exhaustifs et de comparer les résultats des mesures directement aux VLEP sans interprétation statistique."],
  ["ag","ag.A","Les poussières alvéolaires n’ont pas été retenues dans un premier temps : en fonction des résultats des poussières inhalables, les poussières alvéolaires pourraient être recherchées dans une deuxième phase."],
  ["per","per.A","La première campagne de mesures doit être réalisée dans les conditions d’exposition a priori les plus défavorables."],
  ["per","per.B","Étant donnée la localisation géographique de votre site et les conditions d’aération et d’assainissement des locaux, l’exposition est supposée plus importante l’été et sur les postes de l’après-midi. La date de la première intervention sera fixée en conséquence."],
  ["autres","autres.A","Certains produits fabriqués au sein d’un même atelier présentent des typologies d’exposition sensiblement identiques : les paramètres à mesurer et les phases d’exposition à mesurer sont fixés dans le plan d’échantillonnage mais le produit dont la fabrication fera l’objet de mesures n’est pas défini à ce stade. Il le sera en fonction des campagnes de production mises en œuvre et les résultats pour un produit seront a priori considérés comme identiques pour les autres produits."],
  ["infos","infos.A","Certains produits ou références sont utilisés simultanément au cours du procédé. Ainsi, certains agents chimiques peuvent être prélevés simultanément sur un même support de prélèvement."],
  ["infos","infos.B","Les mesures sont réalisées sur des demi-postes de travail."],
  ["infos","infos.C","Certains groupes d’exposition homogène n’étant représentés que par une personne, les prélèvements sont réalisés sur 3 jours consécutifs."],
  ["infos","infos.D","Certains opérateurs seront équipés de deux pompes de prélèvement."],
  ["infos","infos.E","Afin de limiter le nombre de pompes portées par un opérateur, des dérivations, permettant un prélèvement simultané sur deux tubes de perte de charge identique, seront utilisées."],
  ["infos","infos.F","Pour le méthanol, dont la durée du prélèvement doit être limitée pour éviter la migration de la première zone du tube vers la seconde zone, plusieurs prélèvements successifs de 2h seront réalisés afin de couvrir la totalité du poste de travail."]
];
/* ---- aides pour la génération des justifications (GEH + agents visés) ---- */
const J_FEM = /^(fraction|silice|colle|huile|peinture|laine|r[ée]sine|soude|potasse|ammoniaque|vapeur|fibre|fum[ée]e|poussi[èe]re|poudre|cendre|mousse|encre)/i;
const J_ACRO = /^[A-Z0-9][A-Z0-9\-]{2,9}$/;
function agShort(name){
  let n = String(name||"").split(" — ")[0].trim();
  const m = /\(([^)]+)\)/.exec(n);
  if(m){ const p = m[1].trim(); if(J_ACRO.test(p) || /^\d/.test(p)) return p; }
  n = n.replace(/\s*\([^)]*\)/g,"").replace(/\s+et (ses )?compos[ée]s.*$/i,"").replace(/\s+total\b.*$/i,"").trim();
  return n || String(name||"").trim();
}
/* "l’acétone", "le méthanol", "les poussières inhalables" */
function agRef(name, cap){
  const n = agShort(name), acro = J_ACRO.test(n) || /^\d/.test(n), w = acro ? n : n.charAt(0).toLowerCase()+n.slice(1);
  const pl = /^(poussi[èe]res|fibres|fum[ée]es|vapeurs|huiles|colles)\b/i.test(w);
  const art = pl ? "les " : (!acro && /^[aeiouyàâäéèêëîïôöùûüœh]/i.test(w)) ? "l’" : (J_FEM.test(w) ? "la " : "le ");
  const s = (art+w).replace(/'/g,"’"); return {txt: cap ? s.charAt(0).toUpperCase()+s.slice(1) : s, pl};
}
function jJoin(a){ a = a.filter(Boolean); return a.length<2 ? (a[0]||"") : a.slice(0,-1).join(", ")+" et "+a[a.length-1]; }
function taskLbl(t){ let s = String(t||"").replace(/\s*\([^)]*\)/g,"").replace(/\s+/g," ").trim(); if(s && !/^[A-Z]{2,}/.test(s)) s = s.charAt(0).toLowerCase()+s.slice(1); return s; }
/* durée en minutes ("15 minutes", "4 heures", "1h30") */
function jDur(s){ s = String(s||"").toLowerCase().replace(",",".");
  let m = /(\d+(?:\.\d+)?)\s*(?:heures?|h)(?![a-z])\s*(\d{1,2})?/.exec(s); if(m) return parseFloat(m[1])*60 + (m[2] ? parseInt(m[2],10) : 0);
  m = /(\d+(?:\.\d+)?)\s*min/.exec(s); return m ? parseFloat(m[1]) : null; }
/* fréquence : nombre de fois par an / par jour ("1 fois / semaine", "2 fois/an", "1 fois/jour") */
function perYear(f){
  f = String(f||"").toLowerCase(); if(!f.trim()) return null;
  if(/quotidien|tous les jours|chaque jour/.test(f)) return 250; if(/hebdo/.test(f)) return 52; if(/mensuel/.test(f)) return 12; if(/annuel/.test(f)) return 1;
  const m = /(\d+(?:[.,]\d+)?)\s*(?:x|fois)?\s*(?:\/|par)?\s*(sem(?!estre)|semestre|trimestre|mois|an\b|ans\b|jour|j\b|quinz)/.exec(f); if(!m) return null;
  const n = parseFloat(m[1].replace(",",".")), u = m[2]; return n * (u==="sem"?52 : u==="semestre"?2 : u==="trimestre"?4 : u==="mois"?12 : /^an/.test(u)?1 : u==="quinz"?24 : 250);
}
function perDay(f){ f = String(f||"").toLowerCase(); if(/quotidien/.test(f)) return 1; if(/plusieurs fois\s*(\/|par)?\s*jour/.test(f)) return 2;
  const m = /(\d+(?:[.,]\d+)?)\s*(?:x|fois)\s*(?:\/|par)?\s*(?:jour|j\b)/.exec(f); return m ? parseFloat(m[1].replace(",",".")) : null; }
/* une tâche nommée + les lignes suivantes sans nom (produits supplémentaires de la même tâche) */
function taskGroups(g){ const out = []; let cur = null;
  (g.taches||[]).forEach(k=>{ if((k.t||"").trim()){ cur = {name:k.t.trim(), items:[k]}; out.push(cur); } else if(cur) cur.items.push(k); else { cur = {name:"", items:[k]}; out.push(cur); } });
  return out; }
function jProds(k){ return String(k.prod||"").split(/;|\n|\/|,\s+/).map(x=>x.trim()).filter(x=>x && !/^\/?$/.test(x)); }
function jKeys(name){ const full = String(name||"").split(" — ")[0], ks = new Set([norm(full), norm(agShort(name))]);
  (full.match(/\(([^)]+)\)/g)||[]).forEach(x=>ks.add(norm(x.slice(1,-1))));
  norm(full.replace(/\([^)]*\)/g," ")).split(/\s+ou\s+/).forEach(x=>ks.add(x.trim()));
  [...ks].forEach(k=>{ const a = k.replace(/\s+melange.*$/,"").trim(), b = a.replace(/^((o|m|p|n|ortho|meta|para)\s+)+/,"").replace(/^(\d+\s+)+/,"").trim(); ks.add(a); ks.add(b); });
  return [...ks].filter(x=>x.length>=4); }
function prodMatch(prod, name, row){ const keys = jKeys(name);
  if(jProds({prod}).some(p0=>{ const p = norm(p0).replace(/^normal /,"n ").replace(/ortho(?=phosph)/,""); if(!p) return false;
    return keys.some(k=> k===p || k.startsWith(p+" ") || p.startsWith(k+" ") || (p.split(" ").length<=3 && p.split(" ").includes(k))); })) return true;
  /* repli par les substances (CAS) lues dans le Seirich pour cette ligne : isomères, synonymes, noms différents */
  if(row && row.ck && row.ck.length){ const A = S.agents.find(a=>norm(a.agent)===norm(name));
    if(A){ const ks = new Set(); const m = CAS_RE.exec(A.cas||""); if(m) ks.add(m[0]); candOfAgent(A).forEach(c=>ks.add(c.cas || ("n:"+norm(c.nom)))); return row.ck.some(k=>ks.has(k)); } }
  return false; }
/* GEH visés par une ligne du plan (GEH choisi, ou texte libre "1" / "GEH 2" / nom) */
function gehIdsOfRow(r, gl){
  if(r.gehId && r.gehId!=="__txt") return gl.some(g=>g.id===r.gehId) ? [r.gehId] : [];
  if(r.gehId==="__txt" && (r.gehTxt||"").trim()){ const t = r.gehTxt, nums = (t.match(/\d+/g)||[]).map(Number), nt = norm(t), ids = new Set();
    gl.forEach(g=>{ const gg = S.ateliers.flatMap(a=>a.gehs).find(x=>x.id===g.id), ln = parseInt((/\d+/.exec((gg&&gg.num)||"")||[])[0],10);
      if(nums.includes(g.n) || (!isNaN(ln) && nums.includes(ln)) || (nt.length>3 && (norm(g.des)===nt || norm(g.label)===nt))) ids.add(g.id); });
    return [...ids]; }
  return [];
}
function gehsOfAgent(name, gl){ return gl.filter(g=>{ const gg = S.ateliers.flatMap(a=>a.gehs).find(x=>x.id===g.id); return gg && (gg.taches||[]).some(k=>prodMatch(k.prod, name, k)); }).map(g=>g.id); }
/* GEH homonymes : on ajoute l'atelier */
function gehNames(gl){ const cnt = {}; gl.forEach(g=>{ cnt[norm(g.des)] = (cnt[norm(g.des)]||0)+1; }); const o = {};
  gl.forEach(g=>{ o[g.id] = g.label + (cnt[norm(g.des)]>1 && g.atelier && norm(g.atelier)!==norm(g.des) ? " ("+g.atelier+")" : ""); }); return o; }
/* par agent du plan : lignes, GEH, tâches concernées (durée / fréquence lues dans l'un ou l'autre champ) */
function jAgentInfo(rows, gl){
  const map = new Map(), G = id => S.ateliers.flatMap(a=>a.gehs).find(x=>x.id===id);
  rows.forEach(r=>planAgents(r).forEach(name=>{ const key = norm(name); if(!key) return;
    let I = map.get(key); if(!I){ I = {name, a:S.agents.find(x=>norm(x.agent)===key), rows:[], gehs:new Set(), tasks:[]}; map.set(key,I); }
    I.rows.push(r); gehIdsOfRow(r, gl).forEach(id=>I.gehs.add(id)); }));
  map.forEach(I=>{ if(!I.gehs.size) gehsOfAgent(I.name, gl).forEach(id=>I.gehs.add(id));
    I.gehs.forEach(id=>{ const g = G(id); if(!g) return;
      taskGroups(g).forEach(gr=>{ const head = gr.items[0]; gr.items.forEach(k=>{ if(!prodMatch(k.prod, I.name, k)) return;
        const own = x => jDur(x.duree)!=null ? jDur(x.duree) : jDur(x.freq), fr = x => perYear(x.freq)!=null ? perYear(x.freq) : perYear(x.duree), pd = x => perDay(x.freq)!=null ? perDay(x.freq) : perDay(x.duree);
        I.tasks.push({gid:id, name:gr.name, dur: own(k)!=null ? own(k) : own(head), year: fr(k)!=null ? fr(k) : fr(head), day: pd(k)!=null ? pd(k) : pd(head)}); }); }); });
  });
  return map;
}
const J_SHORT_PLAGE = /^(15min|Entre 15min et 1h|Entre 1 et 4h)$/;
function genJust(){
  const kept = (S.just||[]).filter(it=>!it.auto || it.edited), keepKeys = new Set(kept.map(it=>it.key).filter(Boolean)), out = [];
  const gl = gehList(), gn = {}; gl.forEach(g=>gn[g.id] = g.n); const GN = gehNames(gl);
  const rows = S.plan.filter(r=>r.kind!=="sec"), INFO = jAgentInfo(rows, gl), infos = [...INFO.values()];
  const hasPlan = infos.length>0, gtxt = ids => ids.length ? (ids.length>1 ? "les GEH " : "le GEH ")+jJoin(ids.map(id=>gn[id])) : "le GEH "+TBC;
  const oneGeh = I => I.gehs.size===1 ? [...I.gehs][0] : "";
  /* bibliothèque générale (propositions non retenues par défaut) */
  const libOut = []; const addLib = (sec,key,txt,on)=>{ if(keepKeys.has(key)) return; libOut.push({id:uid(), sec, key, txt, list:[], on, auto:true, edited:false, geh:"", lib:true}); };
  const add = (sec,key,txt,on,list,geh) => { if(keepKeys.has(key)) return; out.push({id:uid(), sec, key, txt, list:list||[], on, auto:true, edited:false, geh:geh||""}); };
  J_LIB.forEach(([sec,key,txt])=>{ addLib(sec,key,txt,false); });
  const setOn = (key,on)=>{ const it = libOut.find(x=>x.key===key); if(it) it.on = on; };
  setOn("elim.A", true); setOn("per.A", true);
  /* GEH sans prélèvement : seulement quand le plan est renseigné */
  if(hasPlan){ const covered = new Set(); infos.forEach(I=>I.gehs.forEach(id=>covered.add(id)));
    const unc = gl.filter(g=>!covered.has(g.id) && !rows.some(r=>r.gehId===g.id)).map(g=>GN[g.id]);
    if(unc.length) add("elim","elim.unc","Les GEH suivants ne font pas l’objet de prélèvements lors de cette première campagne : "+unc.join(" ; ")+". "+TBC, true); }
  /* agents sans méthode accréditée (limités aux agents du plan quand il existe) */
  const inPlan = a => !hasPlan || INFO.has(norm(a.agent));
  const horsAcc = S.agents.filter(a=>!(a.accP==="X"&&a.accA==="X") && inPlan(a) && !noLab(a));
  const sansLabo = S.agents.filter(a=>noLab(a));
  if(sansLabo.length) add("ag","ag.nolab","Les agents chimiques suivants n’ont pas été retenus dans la stratégie de prélèvement : aucun laboratoire ne réalise leur analyse.", true, sansLabo.map(a=>{ const n = String(a.agent).split(" — ")[0]; return a.ref!=null ? n : (n===n.toUpperCase() ? n.charAt(0)+n.slice(1).toLowerCase() : n); }));
  if(horsAcc.length) add("ag","ag.hors","Pour les agents chimiques suivants, aucune méthode de prélèvement et d’analyse sous accréditation n’est disponible : une méthode générique, la sous-traitance ou un développement spécifique sera mis en œuvre ("+TBC+").", true, horsAcc.map(a=>String(a.agent).split(" — ")[0]));
  const notRet = (S.cand||[]).filter(c=>(c.v8||c.vct) && !candState(c) && !c.emis).map(c=>c.nom);
  if(notRet.length) add("ag","ag.nr","Certains paramètres n’ont pas été retenus compte tenu de l’absence de VLEP réglementaire applicable, de l’absence de méthode de référence ou de leur utilisation négligeable :", false, [...new Set(notRet)].slice(0,40));
  if(S.agents.some(a=>/inhalable|poussi/i.test(a.agent))) setOn("ag.A", true);
  /* ---- phrases par agent visé (une seule phrase par agent, GEH regroupés) ---- */
  let nVlepct = 0, nDuree = 0; const VG = new Map(), DG = new Map();
  infos.forEach(I=>{ const a = I.a, ref = agRef(I.name), Ref = agRef(I.name,true), ids = [...I.gehs], k = norm(I.name).replace(/ /g,"-").slice(0,40);
    const types = I.rows.map(r=>norm(r.type)), isCT = types.some(t=>/^ct/.test(t)), is8h = types.some(t=>t==="8h"), ctPond = types.some(t=>/pond/.test(t)) || (isCT && !is8h && !!a && !!a.v8 && !!a.vct);
    const phases = new Set(I.tasks.map(t=>t.gid+"|"+norm(t.name))).size;
    /* VLEP court terme : phase la plus exposante indéterminée si plusieurs phases */
    if(isCT && (!a || a.vct)){ nVlepct++;
      { const gk = ids.slice().sort().join(","); if(!VG.has(gk)) VG.set(gk,{ids, list:[], ph:false, geh:oneGeh(I)}); const G = VG.get(gk); G.list.push({k, ref, a, I}); if(phases>=2) G.ph = true; } }
    /* durée : VLEP CT mesurée, 8h obtenue par pondération */
    if(ctPond && (!a || (a.v8 && a.vct))){ nDuree++; const maxDay = Math.max(0, ...I.tasks.map(t=>t.day||0)), tn = jJoin([...new Set(I.tasks.map(t=>taskLbl(t.name)).filter(Boolean))]);
      { const gk = "ag|"+ids.slice().sort().join(",")+"|"+maxDay+"|"+tn; if(!DG.has(gk)) DG.set(gk,{kind:"ag", ids, maxDay, tn, list:[], geh:oneGeh(I)}); DG.get(gk).list.push({k, ref, Ref, I}); } }
    /* durée : prélèvement 8h plus long que l'exposition réelle -> pondération */
    else if(is8h){ const shortTasks = I.tasks.length && I.tasks.every(t=>t.dur!=null && t.dur<=60), shortPlage = I.rows.some(r=>r.type==="8h" && J_SHORT_PLAGE.test((r.plage||"").trim()));
      if(shortTasks || shortPlage){ nDuree++; const tn = jJoin([...new Set(I.tasks.map(t=>taskLbl(t.name)).filter(Boolean))]);
        { const gk = "court|"+ids.slice().sort().join(",")+"|"+tn; if(!DG.has(gk)) DG.set(gk,{kind:"court", ids, tn, list:[], geh:oneGeh(I)}); DG.get(gk).list.push({k, ref, I}); } } }
    /* méthodes à durée de prélèvement limitée (migration sur le tube) */
    const lim = /limiter le pr[ée]l[èe]vement [àa] (\d+)\s*h/i.exec((a&&a.commentaire)||"");
    if(lim){ const gk = "lim|"+ids.slice().sort().join(",")+"|"+lim[1]; if(!DG.has(gk)) DG.set(gk,{kind:"lim", ids, h:lim[1], list:[], geh:oneGeh(I)}); DG.get(gk).list.push({k, ref, I}); }
  });
  /* VLEP court terme : une seule justification, agents (et GEH) en liste */
  { const L = []; VG.forEach(G=>{ if(!G.ph) return; G.list.forEach(x=>L.push(String(x.I.name).split(" — ")[0]+" ("+gtxt(G.ids).replace(/^les GEH /,"GEH ").replace(/^le GEH /,"GEH ")+")")); });
    if(L.length) add("vlepct","vlepct.all","Pour les agents chimiques suivants, la phase la plus exposante n’a pas pu être déterminée : nous avons choisi de réaliser les mesures court terme sur plusieurs phases distinctes lors de cette première campagne. Cela permet d’éviter un nombre important de mesures lors de cette 1ère campagne. A contrario, il existe un risque que, à l’issue de l’évaluation initiale, les GEH concernés soient non homogènes pour ces agents. Dans ce cas, nous devrons réétudier les GEH et réaliser des mesures complémentaires afin de pouvoir statuer réglementairement.", true, L, ""); }
  /* durée / durée limitée : une phrase par groupe d'agents ayant le même contexte */
  DG.forEach(G=>{ const n = G.list.length, one = n===1, pl = !one || G.list[0].ref.pl, refs = jJoin(G.list.map(x=>x.ref.txt)), key = "duree."+G.kind+"."+(one ? G.list[0].k : "grp."+G.list.map(x=>x.k).join("+").slice(0,80));
    if(G.kind==="ag"){ const head = (one ? G.list[0].Ref.txt : refs.charAt(0).toUpperCase()+refs.slice(1))+" "+(pl?"disposent":"dispose")+" d’une VLEP court-terme et d’une VLEP 8h. ";
      add("duree", key, G.maxDay>1
        ? head+"L’opération de "+(G.tn||TBC)+" est de courte durée, mais répétée "+G.maxDay+" fois par jour, ce qui justifie le contrôle de la VLEP 8h."
        : head+"L’exposition "+(one?"à cet agent chimique":"à ces agents chimiques")+" n’est effective que pendant une courte durée (quelques minutes par jour) et l’opération correspondante n’est pas répétée dans la journée. Par conséquent, seule la VLEP court terme fera l’objet d’un prélèvement spécifique de 15 minutes. Le respect de la VLEP 8h sera vérifié par pondération à partir du résultat du contrôle de la VLEP court-terme, en considérant une exposition nulle le reste du temps.", true, [], G.geh); }
    else if(G.kind==="court"){ /* regroupé plus bas */ }
    else { /* regroupé plus bas */ } });
  { const C = [], Lm = [];
    DG.forEach(G=>{ if(G.kind==="court") G.list.forEach(x=>{ const tl = (G.tn||"").split(/, | et /).filter(Boolean); C.push(String(x.I.name).split(" — ")[0]+(G.tn ? (tl.length>3 ? " (après "+tl.length+" tâches, cf. §3.7)" : " (après "+G.tn+")") : "")); });
      if(G.kind==="lim") G.list.forEach(x=>Lm.push(String(x.I.name).split(" — ")[0]+" : "+G.h+" h")); });
    if(C.length) add("duree","duree.court.all","Pour les agents chimiques suivants, le prélèvement sera plus court que la durée du poste de travail. Le résultat des mesures sera ensuite pondéré sur 8h pour comparaison à la VLEP, en considérant une exposition nulle le reste du temps : après la ou les tâches indiquées, l’opérateur est en effet affecté à des tâches administratives dans un autre local et n’est plus exposé à ces agents chimiques.", true, C, "");
    if(Lm.length) add("infos","infos.lim.all","Pour les agents chimiques suivants, la durée du prélèvement doit être limitée pour éviter la migration de la première zone du tube vers la seconde zone : plusieurs prélèvements successifs de la durée indiquée seront réalisés afin de couvrir la totalité du poste de travail.", true, Lm, ""); }
  /* nombre de mesures : opérations peu fréquentes, par GEH (agents concernés seulement) */
  /* mesurage exhaustif : seulement dans le cas de l'arrêté (GEH d'une personne exposée 9 jours par an au plus, annexe 1 § 1.3) */
  S.ateliers.forEach(at=>at.gehs.forEach(g=>{
    const mine = infos.filter(I=>I.gehs.has(g.id) && I.a && profilAgent(g, I.a).exhaustif); if(!mine.length) return;
    const P = mine.map(I=>profilAgent(g, I.a)), tn = [...new Set(P.flatMap(p=>p.taches.map(t=>t.nom)).filter(Boolean))].join(" ; ") || "certaines opérations", j = Math.max(...P.map(p=>p.jours));
    add("nb","nb."+g.id,"D’après les informations recueillies, le GEH "+gn[g.id]+" « "+(g.des||"")+" » ne comporte qu’une personne et l’opération de « "+tn+" » a lieu "+j+" jour"+(j>1?"s":"")+" par an au plus. Dans ce cas, l’arrêté du 15/12/09 (annexe 1, § 1.3) prévoit de réaliser des mesurages exhaustifs, chaque journée d’exposition faisant l’objet d’un mesurage, et de comparer les résultats des mesures directement aux VLEP sans interprétation statistique. Cela concerne les paramètres suivants :", true, mine.map(I=>String(I.name).split(" — ")[0]), g.id); }));
  /* nombre de CT : 3 par campagne, 9 sur l'évaluation initiale (moteur) */
  if(rows.some(r=>r.type==="CT" && parseFloat(r.nb)>=NB_CAMPAGNE)) add("nb","nb.ct","Les mesures court terme sont réalisées à raison de trois prélèvements de 15 minutes par GEH et par campagne : trois lors de cette première campagne, soit neuf sur les trois campagnes de l’évaluation initiale, conformément à l’annexe 1 (§ 2.4) de l’arrêté du 15 décembre 2009.", true);
  /* LQ trop haute pour conclure dès la 1re campagne (critère < 0,1 VLEP) */
  { const L = new Set(); rows.forEach(r=>analyseLigne(r).alertes.forEach(x=>{ if(/LQ/.test(x.t)) L.add(x.t.split(" : ")[0]+" ("+(r.type==="CT"?"VLCT":"VLEP 8 h")+")"); }));
    if(L.size) add("infos","infos.lq","Pour les agents chimiques suivants, la limite de quantification de la méthode ne permet pas de descendre sous 10 % de la valeur limite : le respect de la VLEP ne pourra pas être conclu dès la première campagne et l’évaluation initiale devra être menée jusqu’à son terme (annexe 1, § 4.2 de l’arrêté du 15 décembre 2009) :", true, [...L]); }
  /* regroupement GEH */
  S.ateliers.forEach(at=>at.gehs.forEach(g=>{ if((g.srcs||[]).length>1 && /\s\/\s/.test(g.des||"")) add("regr","regr."+g.id,"Les GEH « "+(g.des||"").split(" / ").join(" » et « ")+" » sont regroupés en un seul GEH : "+TBC+" (mêmes locaux, mêmes produits, mêmes conditions de travail).", true, [], g.id); }));
  /* éliminations saisies dans la matrice */
  const EL = {x1:["erc","Certains produits sont utilisés en très faible quantité, de manière discontinue voire épisodique et sur des laps de temps très courts. L’exposition aux agents chimiques suivants a été considérée comme faible au cours de la visite préalable et ils ne font pas l’objet de prélèvement :"],
    x2:["erc","Les agents chimiques suivants sont présents en quantité négligeable dans les GEH indiqués et ne font pas l’objet de prélèvement :"],
    x3:["erc","Les produits contenant les agents chimiques suivants ne sont plus utilisés (produit disparu ou substitué, non utilisé depuis plus de 6 mois). Aucun prélèvement n’a, par conséquent, été prévu :"],
    x4:["ag","Les agents chimiques suivants ne font pas l’objet de prélèvement ("+TBC+") :"],
    x5:["erc","Les agents chimiques suivants, non CMR, sont évalués à risque faible dans votre évaluation des risques chimiques pour les GEH indiqués. Conformément aux articles R. 4412-12 et R. 4412-13 du code du travail (circulaire DGT 2010/03 du 13 avril 2010, § 2.2.2), ils ne font pas l’objet du contrôle technique :"],
    x6:["ag","Les agents chimiques suivants ne disposent d’aucune VLEP réglementaire (VLEP admise ou absence de VLEP) : ils n’entrent pas dans le champ du contrôle technique de l’arrêté du 15 décembre 2009 (articles R. 4412-27 et R. 4412-76 du code du travail) et ne font pas l’objet de prélèvement dans la présente stratégie :"]};
  /* état de chaque case de la matrice : choix saisi, sinon proposition du moteur (ex. « risque faible » de l'ERC) */
  const elim = {}, mo = matOpts(), lk = linkMap();
  S.ateliers.forEach(at=>at.gehs.forEach(g=>{ if(!gn[g.id]) return; S.agents.forEach(a=>{ const st = matCell(g, a, mo, lk); if(!/^x/.test(st||"")) return; ((elim[st] = elim[st]||{})[a.agent] = elim[st][a.agent]||[]).push(gn[g.id]); }); }));
  Object.keys(elim).forEach(st=>add(EL[st][0],"mat."+st,EL[st][1],true,Object.keys(elim[st]).map(n=>n+" (GEH "+elim[st][n].sort((x,y)=>x-y).join(", ")+")")));
  /* mesures ajoutées hors du champ de l'arrêté (VLEP admise, CMR sans VLEP) : à présenter comme mesures de l'ERC */
  if(rows.some(r=>(r.ag||[]).some(u=>{ const a = S.agents.find(x=>x.uid===u); return a && horsArrete(a); }))) setOn("erc.C", true);
  /* infos mesures */
  if(rows.some(r=>planAgents(r).length>1)) setOn("infos.A", true);
  if(rows.some(r=>r.type==="8h" && !/^$|En journée|Plus de 4h/.test((r.plage||"").trim()))) setOn("infos.B", true);
  if(S.ateliers.some(a=>a.gehs.some(g=>/^\s*1\s*(\(|$)/.test(g.eff||"")))) setOn("infos.C", true);
  /* ---- anti-doublons ---- */
  const specific = new Set(out.map(i=>i.sec));
  const dropLib = it => (["vlepct.A","vlepct.B"].includes(it.key) && out.some(x=>x.sec==="vlepct")) || (["duree.A","duree.B"].includes(it.key) && out.some(x=>x.sec==="duree")) || (it.key==="infos.F" && out.some(x=>/^infos\.lim\./.test(x.key)));
  const fp = (t,n) => norm(String(t||"").split(TBC).join(" ")).slice(0,n);
  const keptSpec = new Set(kept.map(i=>fp(i.txt,120))), keptPref = new Set(kept.map(i=>fp(i.txt,60)));
  const seen = new Set(), res = [];
  out.forEach(it=>{ const e = fp(it.txt,400)+"|"+(it.list||[]).join(";"); if(keptSpec.has(fp(it.txt,120)) && !(it.list||[]).length) return; if(seen.has(e)) return; seen.add(e); res.push(it); });
  libOut.forEach(it=>{ if(dropLib(it)) return; if(keptPref.has(fp(it.txt,60))) return; const e = fp(it.txt,400); if(seen.has(e)) return; seen.add(e); delete it.lib; res.push(it); });
  S.just = kept.concat(res); persist(); return res.length;
}
let J_VIEW = "geh", J_ONLY = false, J_OPEN = {};
const J_SEC_T = Object.fromEntries(J_SECS);
function jItemHtml(i, showSec, gl){
  return '<div class="jit'+(i.on?' on':'')+'"><div class="jtop"><label class="jon"><input type="checkbox" data-jon="'+i.id+'"'+(i.on?' checked':'')+'> Retenir</label>'+
    (showSec?'<span class="tag">'+esc(J_SEC_T[i.sec]||i.sec)+'</span>':'')+(i.auto?'':'<span class="tag">ajoutée</span>')+
    (i.txt.includes(TBC)||(i.list||[]).some(x=>String(x).includes(TBC))?'<span class="tag no">à compléter</span>':'')+
    '<select data-jg="'+i.id+'" title="Rattacher à un GEH"><option value="">Général</option>'+gl.map(g=>'<option value="'+g.id+'"'+(i.geh===g.id?' selected':'')+'>GEH '+esc(g.label)+'</option>').join("")+'</select></div>'+
    '<textarea data-jt="'+i.id+'" rows="3">'+esc(i.txt)+'</textarea>'+(i.list&&i.list.length?'<textarea data-jl="'+i.id+'" rows="'+Math.min(8,i.list.length+1)+'" placeholder="un élément par ligne">'+esc(i.list.join("\n"))+'</textarea>':'')+
    (i.auto?'':'<button class="btn sm" data-jdel="'+i.id+'">Supprimer</button>')+'</div>';
}
function renderJust(){
  const all = S.just||[], gl = gehList(), nOn = all.filter(i=>i.on).length;
  const unfinished = all.filter(i=>i.on && (i.txt.includes(TBC) || (i.list||[]).some(x=>String(x).includes(TBC)))).length;
  const tb = '<div class="jbar"><span class="seg"><button class="chip'+(J_VIEW==="geh"?' on':'')+'" data-jv="geh">Par GEH</button><button class="chip'+(J_VIEW==="sec"?' on':'')+'" data-jv="sec">Par rubrique du Word</button></span>'+
    '<label class="chip'+(J_ONLY?' on':'')+'"><input type="checkbox" id="jOnly" style="display:none"'+(J_ONLY?' checked':'')+'>Retenues seulement</label>'+
    '<button class="btn sm" data-jexp="1">Tout déplier</button><button class="btn sm" data-jexp="0">Tout replier</button></div>';
  $("#jInfo").innerHTML = all.length ? '<span class="tag">'+nOn+' retenue(s) sur '+all.length+'</span> '+(unfinished?'<span class="tag no">'+unfinished+' à compléter</span>':'<span class="tag ok">rien à compléter</span>')+tb+(()=>{ const cj = controleJustifs(); return cj.length ? '<div class="warn">'+cj.map(x=>esc(x.t.charAt(0).toUpperCase()+x.t.slice(1))).join("<br>")+'</div>' : ""; })() : '<div class="empty">Aucune justification. Clique sur « Proposer automatiquement ».</div>';
  const vis = i => !J_ONLY || i.on;
  const grp = (id, title, its, addAttr, sub) => { if(!its.length && !addAttr) return ""; const open = J_OPEN[id] !== false && (J_OPEN[id] || its.some(i=>i.on) || J_VIEW==="sec" || !!addAttr && !its.length);
    const nA = its.filter(i=>i.on).length, nT = its.filter(i=>i.on && (i.txt.includes(TBC)||(i.list||[]).some(x=>String(x).includes(TBC)))).length;
    return '<div class="card jgrp"><h2 data-jtog="'+id+'" style="cursor:pointer">'+(open?'▾ ':'▸ ')+esc(title)+' <span class="tag">'+nA+'/'+its.length+'</span>'+(nT?' <span class="tag no">'+nT+' à compléter</span>':'')+'</h2>'+
      (open ? its.map(i=>jItemHtml(i, J_VIEW==="geh", gl)).join("")+(addAttr?'<div class="row"><button class="btn sm" '+addAttr+'>+ Ajouter une phrase</button></div>':'') : '')+'</div>'; };
  if(J_VIEW==="geh"){
    let h = grp("g:", "Général (tout le site)", all.filter(i=>!i.geh && vis(i)), 'data-jadd="autres" data-jgeh=""');
    gl.forEach(g=>{ h += grp("g:"+g.id, "GEH "+g.label, all.filter(i=>i.geh===g.id && vis(i)), ""); });
    const orphan = all.filter(i=>i.geh && !gl.some(g=>g.id===i.geh) && vis(i)); if(orphan.length) h += grp("g:?", "GEH supprimé", orphan, "");
    $("#jWrap").innerHTML = h;
  } else {
    $("#jWrap").innerHTML = J_SECS.map(([sec,title])=>{ const its = all.filter(i=>i.sec===sec && vis(i)); if(!its.length && sec!=="elim") return ""; return grp("s:"+sec, title, its, 'data-jadd="'+sec+'"'); }).join("");
  }
}
$("#jInfo").addEventListener("click", e=>{ const b = e.target.closest("button"), l = e.target.closest("label.chip");
  if(b && b.dataset.jv){ J_VIEW = b.dataset.jv; renderJust(); } else if(b && b.dataset.jexp!=null){ const ex = b.dataset.jexp==="1"; J_OPEN = {}; document.querySelectorAll("#jWrap [data-jtog]").forEach(h=>J_OPEN[h.dataset.jtog] = ex); renderJust(); }
  else if(l){ e.preventDefault(); J_ONLY = !J_ONLY; renderJust(); } });
$("#bGenJust").onclick = ()=>{ if((S.just||[]).some(i=>i.auto&&i.edited||!i.auto) && !confirm("Régénérer les propositions ? Tes phrases modifiées ou ajoutées sont conservées, les autres sont recalculées.")) return; genJust(); renderJust(); };
$("#jWrap").addEventListener("input", e=>{ const t = e.target, f = id => (S.just||[]).find(i=>i.id===id);
  if(t.dataset.jt){ const i = f(t.dataset.jt); i.txt = t.value; if(i.auto) i.edited = true; persist(); }
  else if(t.dataset.jl){ const i = f(t.dataset.jl); i.list = t.value.split("\n").map(x=>x.trim()).filter(Boolean); if(i.auto) i.edited = true; persist(); } });
$("#jWrap").addEventListener("change", e=>{ const t = e.target; if(t.dataset.jg){ const i = S.just.find(x=>x.id===t.dataset.jg); i.geh = t.value; if(i.auto) i.edited = true; persist(); renderJust(); return; } if(t.dataset.jon){ const i = S.just.find(x=>x.id===t.dataset.jon); i.on = t.checked; persist(); renderJust(); } });
$("#jWrap").addEventListener("click", e=>{ const h = e.target.closest("[data-jtog]"); if(h){ const id = h.dataset.jtog, was = h.textContent.trim().startsWith("▾"); J_OPEN[id] = !was; renderJust(); return; } const b = e.target.closest("button"); if(!b) return;
  if(b.dataset.jadd){ S.just = S.just||[]; S.just.push({id:uid(), sec:b.dataset.jadd, key:"", txt:"", list:[], on:true, auto:false, edited:true, geh:b.dataset.jgeh||""}); }
  else if(b.dataset.jdel){ S.just = S.just.filter(i=>i.id!==b.dataset.jdel); } else return; persist(); renderJust(); });
/* injection Word */
const JBLK = '<w:tabs><w:tab w:val="clear" w:pos="720"/><w:tab w:val="num" w:pos="284"/></w:tabs><w:overflowPunct/><w:adjustRightInd/><w:ind w:left="284" w:hanging="284"/><w:textAlignment w:val="auto"/>';
function jRuns(t, b){ const rp = '<w:rPr><w:rFonts w:cs="Arial"/>'+(b?'<w:b/><w:bCs/>':'')+'<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>';
  return String(t).split(/(\[[^\]]*\])/).filter(x=>x!=="").map(x=>'<w:r>'+(/^\[.*\]$/.test(x)?rp.replace("<w:sz",'<w:highlight w:val="yellow"/><w:sz'):rp)+'<w:t xml:space="preserve">'+esc(x)+'</w:t></w:r>').join(""); }
const jHead = (t, sub) => '<w:p><w:pPr><w:keepNext/><w:overflowPunct/><w:spacing w:before="'+(sub?160:200)+'"/><w:textAlignment w:val="auto"/></w:pPr>'+jRuns(t+(sub?"":" :"), true)+'</w:p>';
const jBul = (t, lvl) => '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="8"/></w:numPr>'+JBLK.replace('w:left="284"','w:left="'+(lvl?568:284)+'"')+'<w:spacing w:before="60"/></w:pPr>'+jRuns(t,false)+'</w:p>';
function fillJust(xml){
  const its = (S.just||[]).filter(i=>i.on && (i.txt.trim()||(i.list||[]).length)); if(!its.length) return xml;
  const a = posOfText(xml, "Les hypothèses retenues"); if(a<0) return xml;
  const aEnd = xml.indexOf("</w:p>", a)+6;
  let b = posOfText(xml, "Plan d’échantillonnage proposé", aEnd); if(b<0) b = posOfText(xml, "chantillonnage proposé", aEnd); if(b<0) return xml;
  b = Math.max(xml.lastIndexOf("<w:p ", b), xml.lastIndexOf("<w:p>", b)); if(b<aEnd) return xml;
  let g = "";
  J_SECS.forEach(([sec,title])=>{ const gord = id => { const k = gehList().findIndex(g=>g.id===id); return k<0 ? -1 : k; }; const l = its.filter(i=>i.sec===sec).map((i,k)=>[i,k]).sort((x,y)=>(gord(x[0].geh)-gord(y[0].geh))||(x[1]-y[1])).map(x=>x[0]); if(!l.length) return;
    g += jHead(title, sec==="infos");
    l.forEach(i=>{ if(i.txt.trim()) g += jBul(i.txt.trim(), false); (i.list||[]).forEach(x=>{ g += jBul(x, true); }); }); });
  return xml.slice(0,aEnd) + g + xml.slice(b);
}
