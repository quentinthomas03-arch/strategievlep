"use strict";
/* ================= Relecture experte (IA, sans API payante) ================= */
/* Claude relit la stratégie complète comme un auditeur Cofrac. L'appli exporte un fichier de relecture (consignes, référentiel,
   format de réponse, dossier anonymisé par défaut avec l'analyse du moteur) ; Quentin le transmet à Claude (Claude Code ou
   claude.ai, dans son abonnement) ; la réponse JSON se réimporte ici pour être lue. Aucun appel réseau depuis l'appli.
   Le moteur garde la main sur ce que disent les textes ; l'IA cherche ce qu'un moteur de règles ne voit pas. Le technicien tranche. */
const RELECT_FORMAT = "relecture-strategie-vlep/1";

const RELECT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["verdict", "synthese", "constats", "questions_visite"],
  properties: {
    verdict: {type: "string", enum: ["conforme", "à reprendre", "non conforme"]},
    synthese: {type: "string"},
    constats: {type: "array", items: {
      type: "object", additionalProperties: false, required: ["gravite", "theme", "cible", "constat", "pourquoi", "source", "correction"],
      properties: {
        gravite: {type: "string", enum: ["bloquant", "majeur", "mineur", "suggestion"]},
        theme: {type: "string", enum: ["GEH", "agents", "plan", "justifications", "méthodes", "représentativité", "documents", "autre"]},
        cible: {type: "string"}, constat: {type: "string"}, pourquoi: {type: "string"}, source: {type: "string"}, correction: {type: "string"}
      }}},
    questions_visite: {type: "array", items: {type: "string"}}
  }
};

/* Consignes système : figées (aucune date ni donnée du dossier) pour que le cache de prompt serve d'une relecture à l'autre */
function relectSysteme(){
  return [
    "Tu es auditeur technique pour le Cofrac (exigences LAB REF 27 et arrêté du 15 décembre 2009). Tu relis la stratégie de prélèvement établie par un organisme accrédité pour le contrôle réglementaire des VLEP d’une entreprise, avant qu’elle ne parte chez le client.",
    "",
    "Le message de l’utilisateur contient le dossier de la stratégie en JSON : contexte de la mission, ateliers et GEH (tâches, durées, fréquences, effectifs, organisation, EPC, EPI, notes de visite), agents retenus avec la nature de leurs VLEP lue dans les textes, état de la matrice GEH × agents (dont les éliminations), plan d’échantillonnage, justifications retenues, et l’analyse déjà produite par le moteur de règles de l’application (raisons et alertes de chaque ligne, avec leur source ; éléments manquants ; contrôles de cohérence).",
    "",
    "Ton rôle : trouver ce qui ne tiendrait pas face à un auditeur exigeant ou face à la réalité du terrain, en particulier ce qu’un moteur de règles ne voit pas :",
    "- homogénéité des GEH : tâches, produits, durées ou fréquences trop différents pour un même groupe, effectifs incohérents ;",
    "- agents : agent plausiblement émis par une tâche ou un produit mais absent, agent retenu sans lien avec les tâches, élimination fragile ;",
    "- plan : choix 8 h / CT au regard des tâches, phase la plus exposante, nombre de mesures, répartition sur les jours, représentativité (périodes, conditions d’activité) ;",
    "- justifications : affirmation non étayée par les données du dossier, contradiction avec le plan ou les tâches, phrase restée générique ;",
    "- méthodes et métrologie : support, débit, durée et LQ au regard de la VLEP, interférences, fractions inhalable / alvéolaire, mélanges ;",
    "- documents et traçabilité exigés par le LAB REF 27 § 7.7.",
    "Les alertes du moteur sont fiables : ne les répète pas, sauf pour en préciser la portée ou la correction. Si un point du moteur te paraît faux, dis-le en l’argumentant.",
    "",
    "Règles :",
    "- Appuie-toi sur le référentiel ci-dessous et sur le dossier. Cite la source précise (texte et paragraphe, ou élément du dossier). Si tu t’appuies sur une connaissance générale (propriété d’une substance, pratique courante), écris « connaissance générale, à vérifier ».",
    "- N’invente aucune valeur de VLEP, de LQ ou de débit : utilise celles du dossier.",
    "- Gravité : « bloquant » = exigence d’un texte non respectée ou diagnostic impossible ; « majeur » = forte probabilité d’écart en audit ou de mesure non représentative ; « mineur » = à corriger sans enjeu de conformité ; « suggestion » = amélioration.",
    "- Quand une information manque pour juger, ne suppose pas : dis-le et ajoute la question précise à poser au client ou pendant la visite dans « questions_visite ».",
    "- « cible » désigne l’élément concerné tel qu’il apparaît dans le dossier (GEH, agent, ligne du plan, justification).",
    "- « correction » dit concrètement quoi changer dans la stratégie.",
    "- Verdict : « non conforme » s’il existe un constat bloquant, « à reprendre » s’il existe un constat majeur, sinon « conforme ».",
    "- Écris en français, phrases courtes, vocabulaire du métier. Pas de constat de pure forme.",
    "",
    "Référentiel (lu à la source par l’application) :",
    ...REFERENTIEL.map(r=>"- "+r.titre+" ("+r.version+") :\n"+r.apport.map(x=>"  • "+x).join("\n"))
  ].join("\n");
}

/* Dossier de relecture : la stratégie telle que l'appli la connaît, avec l'analyse du moteur. Anonymisé par défaut. */
function dossierRelecture(anonyme){
  const e = S.ent, gl = gehList(), num = id => (gl.find(x=>x.id===id)||{}).n;
  const secrets = anonyme ? [e.nom, e.adresse, e.cpville, e.siret, e.contact, e.contactMail, e.contactTel, e.affaire, e.ercRef].map(x=>String(x||"").trim()).filter(x=>x.length>=3) : [];
  const masque = v => { let s = String(v==null ? "" : v); secrets.forEach(x=>{ s = s.split(x).join("[masqué]"); }); return s; };
  const nomA = a => String(a.agent).split(" — ")[0].replace(/\s+/g," ").trim();
  const ligne = (r,i) => { const x = analyseLigne(r); return {ligne:i+1, jour:r.jour||"", agents:planAgents(r), geh:planGeh(r), nb_prelevements:r.nb, type:r.type||"", plage:masque(r.plage),
    moteur_raisons:x.raisons.map(o=>o.t+" ("+o.s+")"), moteur_alertes:x.alertes.map(o=>o.t+" ("+o.s+")")}; };
  const mo = matOpts(), lk = linkMap(), lignes = S.plan.filter(r=>r.kind!=="sec");
  return {
    mission: {
      objet: "Contrôle réglementaire des VLEP : stratégie de prélèvement de l’évaluation initiale, plan de la 1re campagne",
      entreprise: anonyme ? "[masqué]" : (e.nom||""), activite: masque(e.activite), code_naf: e.naf||"", effectif_site: e.effectif||"",
      evaluation_risques: {mode: e.ercMode||"", reference: anonyme ? (e.ercRef ? "[masqué]" : "") : (e.ercRef||""), date: e.ercDate||""},
      visite_prealable: {date: e.dateMission||"", fonction_interlocuteur: masque(e.contactFonction)},
      notes_generales: masque(e.notes)
    },
    ateliers: S.ateliers.map(at=>({atelier: masque(at.nom), geh: at.gehs.filter(gehActive).map(g=>({
      numero: num(g.id), designation: masque(g.des), effectif: g.eff||"", organisation: masque(g.orga), epc: masque(g.epc), epi: masque(g.epi), commentaire: masque(g.com),
      taches: (g.taches||[]).map(k=>({tache: masque(k.t), duree: k.duree||"", frequence: k.freq||"", produits_et_substances: masque(k.prod), risque_erc: k.risque||""})),
      notes_visite: (g.notes||[]).map(n=>masque(n.txt)).filter(Boolean),
      agents_rattaches: agentsOfGeh(g).map(agName).filter(Boolean)
    }))})).filter(a=>a.geh.length),
    agents: S.agents.map(a=>({agent: nomA(a), cas: a.cas||"", cmr: a.cmr||"",
      vlep_8h: {valeur_mg_m3: a.v8==null ? null : a.v8, nature: natureVlep(a,"8h")}, vlep_ct: {valeur_mg_m3: a.vct==null ? null : a.vct, nature: natureVlep(a,"CT")},
      methode: a.methode||"", principe: a.principe||"", support: a.support||"", debit_8h_l_min: [a.dmin8, a.dmax8], debit_ct_l_min: [a.dminCT, a.dmaxCT],
      lq_ug: a.lq==null ? null : a.lq, laboratoire: a.labo||"", sans_laboratoire: noLab(a), remarques_methode: a.commentaire||""})),
    matrice: S.ateliers.flatMap(at=>at.gehs.filter(gehActive).flatMap(g=>S.agents.map(a=>({geh: num(g.id), agent: nomA(a), etat: matCell(g, a, mo, lk)||""})).filter(c=>c.etat))),
    plan: lignes.map(ligne),
    justifications: (S.just||[]).filter(j=>j.on).map(j=>({rubrique: J_SEC_T[j.sec]||j.sec, texte: masque(j.txt), liste: (j.list||[]).map(masque)})),
    analyse_moteur: {manques: manques().map(x=>x.t), coherence: controleJustifs().map(x=>x.t), blancs_terrain: blancsTerrain(), parametres_terrain: S.cap||{}}
  };
}

/* ---- fichier de relecture à transmettre à Claude ---- */
function fichierRelecture(anonyme){
  return {format: RELECT_FORMAT, cree_le: new Date().toISOString(), anonymise: !!anonyme,
    consignes: relectSysteme(),
    reponse_attendue: "Réponds uniquement par un objet JSON conforme au schéma « schema_reponse » (pas de texte autour), en français. Il sera réimporté dans l’appli Stratégie VLEP.",
    schema_reponse: RELECT_SCHEMA,
    dossier: dossierRelecture(anonyme)};
}
/* texte à coller dans claude.ai : consignes + schéma + dossier */
function texteRelecture(anonyme){
  const f = fichierRelecture(anonyme);
  return f.consignes+"\n\n"+f.reponse_attendue+"\n\nSchéma de la réponse :\n"+JSON.stringify(f.schema_reponse)+"\n\nDossier de la stratégie à relire (JSON) :\n\n"+JSON.stringify(f.dossier, null, 1);
}
/* réponse de Claude réimportée : JSON brut, éventuellement entouré de texte ou d'un bloc ```json */
function lireReponseRelecture(texte){
  const t = String(texte||""), d = t.indexOf("{"), f = t.lastIndexOf("}");
  if(d<0 || f<d) throw new Error("aucun objet JSON trouvé dans la réponse");
  const r = JSON.parse(t.slice(d, f+1));
  if(!["conforme","à reprendre","non conforme"].includes(r.verdict) || !Array.isArray(r.constats)) throw new Error("ce n’est pas une réponse de relecture (verdict ou constats manquants)");
  r.constats = r.constats.filter(c=>c && c.constat); r.questions_visite = Array.isArray(r.questions_visite) ? r.questions_visite : [];
  return r;
}

/* ---- affichage ---- */
const RELECT_GRAV = [["bloquant","Bloquant"],["majeur","Majeur"],["mineur","Mineur"],["suggestion","Suggestion"]];
const RELECT_ONGLET = {GEH:"geh", agents:"agents", plan:"plan", justifications:"just", "méthodes":"agents", "représentativité":"plan", documents:"ent", autre:"plan"};
function relectureHtml(R){
  if(!R || !R.resultat) return "";
  const r = R.resultat, cls = r.verdict==="conforme" ? "ok" : "warn";
  const groupe = ([g,lbl]) => { const L = (r.constats||[]).filter(c=>c.gravite===g); if(!L.length) return "";
    return '<h3 style="margin:12px 0 4px">'+esc(lbl)+' ('+L.length+')</h3><ul class="relect">'+L.map(c=>'<li><b>'+esc(c.cible)+'</b> — '+esc(c.constat)+
      '<div class="legend" style="margin:2px 0 0">Pourquoi : '+esc(c.pourquoi)+' <i>('+esc(c.source)+')</i></div><div style="margin:2px 0 0">→ '+esc(c.correction)+
      ' <button class="btn sm" data-goto="'+(RELECT_ONGLET[c.theme]||"plan")+'">'+esc(c.theme||"voir")+'</button></div></li>').join("")+'</ul>'; };
  return '<div class="'+cls+'"><b>Verdict : '+esc(r.verdict)+'</b> — '+esc(r.synthese||"")+'</div>'+RELECT_GRAV.map(groupe).join("")+
    ((r.questions_visite||[]).length ? '<h3 style="margin:12px 0 4px">Questions à poser</h3><ul>'+r.questions_visite.map(q=>'<li>'+esc(q)+'</li>').join("")+'</ul>' : '')+
    '<div class="legend">Relecture importée le '+esc(fmtDT(Date.parse(R.date)))+'. L’IA propose, tu tranches : rien n’est modifié dans la stratégie.</div>';
}
function renderRelecture(){
  const W = $("#relecture"); if(!W) return;
  W.innerHTML = '<h2>Relecture experte (IA)</h2>'+
    '<p style="margin-top:0">Claude relit la stratégie complète comme un auditeur Cofrac, en s’appuyant sur le moteur de règles et le référentiel, et dit ce qui ne tient pas. Gratuit : la relecture passe par ton abonnement Claude, l’appli n’envoie rien elle-même.</p>'+
    '<ol style="margin:4px 0 8px 18px;padding:0;font-size:13.5px">'+
      '<li><b>Exporte</b> le fichier de relecture (bouton ci-dessous) : il arrive dans tes Téléchargements.</li>'+
      '<li><b>Dépose-le</b> dans le dossier <code>Desktop\\APPLI\\Stratégie\\dossiers-reels</code>.</li>'+
      '<li>Dans <b>Claude Code</b>, écris : « relis la stratégie » suivi du nom du fichier. Claude te répond et enregistre sa réponse à côté, dans un fichier <code>…-reponse.json</code>.</li>'+
      '<li><b>Importe</b> ce fichier réponse ici pour lire la relecture classée par gravité, avec un lien vers chaque onglet.</li></ol>'+
    '<div class="legend" style="margin:0 0 8px">Sans Claude Code : « Copier pour claude.ai », colle dans une conversation, puis copie la réponse et importe-la avec « Coller une réponse ».</div>'+
    '<div class="row" style="flex-wrap:wrap;gap:6px;align-items:center">'+
      '<button class="btn pri" id="relExport">Exporter le fichier de relecture</button>'+
      '<label class="btn" style="font-weight:400">Importer la réponse…<input type="file" id="relImport" accept=".json,.txt" class="hide"></label>'+
      '<button class="btn" id="relCopie">Copier pour claude.ai</button><button class="btn" id="relColle">Coller une réponse</button><button class="btn" id="relVoir">Voir le dossier</button>'+
      '<label style="font-size:13px"><input type="checkbox" id="relAnon" checked> anonymiser</label>'+
    '</div><div class="legend" style="margin-top:4px">Anonymisation : nom, adresse, SIRET, contact, n° d’affaire et référence de l’ERC masqués ; les notes libres et les noms de produits restent tels quels.</div>'+
    '<div id="relMsg" style="margin-top:6px;font-size:13px"></div><div id="relRes">'+relectureHtml(S.relecture)+'</div>';
  const anon = () => $("#relAnon").checked, msg = h => { $("#relMsg").innerHTML = h; };
  const importer = texte => { try{ S.relecture = {date:new Date().toISOString(), resultat: lireReponseRelecture(texte)}; persist(); renderRelecture(); $("#relMsg").innerHTML = '<div class="ok">Relecture importée.</div>'; }
    catch(e){ msg('<div class="warn">Import impossible : '+esc(e.message)+'</div>'); } };
  $("#relExport").onclick = ()=>{
    if(!S.plan.some(r=>r.kind!=="sec")) return msg('<div class="warn">Le plan est vide : génère d’abord la stratégie.</div>');
    const nom = "relecture_"+safe(anon() ? "dossier" : S.ent.nom)+"_"+today()+".json";
    download(new Blob([JSON.stringify(fichierRelecture(anon()), null, 1)], {type:"application/json"}), nom);
    msg('<div class="ok">Fichier <b>'+esc(nom)+'</b> exporté. Dépose-le dans <code>Desktop\\APPLI\\Stratégie\\dossiers-reels</code>, puis écris dans Claude Code : « relis la stratégie '+esc(nom)+' ».</div>'); };
  $("#relImport").addEventListener("change", async e=>{ const f = e.target.files[0]; e.target.value = ""; if(f) importer(await f.text()); });
  $("#relCopie").onclick = async ()=>{ try{ await navigator.clipboard.writeText(texteRelecture(anon())); msg("Consignes et dossier copiés : colle-les dans une conversation sur claude.ai, puis reviens coller sa réponse avec « Coller une réponse »."); }catch(e){ msg("Copie bloquée par le navigateur."); } };
  $("#relColle").onclick = ()=>{ msg('<textarea id="relTxt" rows="6" style="width:100%" placeholder="Colle ici la réponse JSON de Claude"></textarea><button class="btn sm" id="relTxtOk" style="margin-top:4px">Importer</button>'); $("#relTxtOk").onclick = ()=>importer($("#relTxt").value); };
  $("#relVoir").onclick = ()=>{ msg('<details open><summary>Dossier exporté ('+(anon() ? "anonymisé" : "non anonymisé")+')</summary><pre style="max-height:320px;overflow:auto;font-size:11px;white-space:pre-wrap">'+esc(JSON.stringify(dossierRelecture(anon()), null, 1))+'</pre></details>'); };
}
