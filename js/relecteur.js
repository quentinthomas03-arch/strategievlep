"use strict";
/* ================= Relecture experte (IA) ================= */
/* Claude relit la stratégie complète comme un auditeur Cofrac. Il reçoit un dossier JSON (anonymisé par défaut) qui contient
   la stratégie ET l'analyse déjà faite par le moteur de règles (raisons et alertes sourcées), plus le référentiel en système.
   Le moteur garde la main sur ce que disent les textes ; l'IA cherche ce qu'un moteur de règles ne voit pas. Le technicien tranche. */
const RELECT_MODELE = "claude-opus-5-5";
const RELECT_CLE = "vlep-relecteur-cle";   /* clé API : sur ce poste seulement (localStorage), jamais dans le dossier */

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

/* ---- appel à Claude (SDK officiel, chargé à la demande) ---- */
let ANTHROPIC_CLASSE = null;
async function chargerSdkAnthropic(){
  if(ANTHROPIC_CLASSE) return ANTHROPIC_CLASSE;
  const url = URL.createObjectURL(new Blob([ANTHROPIC_SDK.source], {type:"text/javascript"}));
  ANTHROPIC_CLASSE = (await import(url)).default; return ANTHROPIC_CLASSE;
}
async function lancerRelecture(apiKey, anonyme){
  const Anthropic = await chargerSdkAnthropic();
  const client = new Anthropic({apiKey, dangerouslyAllowBrowser: true});
  const dossier = dossierRelecture(anonyme);
  const stream = client.beta.messages.stream({
    model: RELECT_MODELE, max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",   /* refus de sécurité : relance automatique sur un autre modèle */
    thinking: {type: "adaptive"},
    output_config: {effort: "high", format: {type: "json_schema", schema: RELECT_SCHEMA}},
    system: [{type: "text", text: relectSysteme(), cache_control: {type: "ephemeral"}}],
    messages: [{role: "user", content: "Dossier de la stratégie à relire (JSON) :\n\n"+JSON.stringify(dossier, null, 1)}]
  });
  const msg = await stream.finalMessage();
  if(msg.stop_reason==="refusal") throw new Error("le modèle a refusé la demande"+(msg.stop_details && msg.stop_details.category ? " ("+msg.stop_details.category+")" : ""));
  if(msg.stop_reason==="max_tokens") throw new Error("réponse tronquée (limite de longueur atteinte)");
  const txt = msg.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  return {date: new Date().toISOString(), modele: msg.model, anonyme, resultat: JSON.parse(txt),
    usage: {entree: msg.usage.input_tokens, cache_lu: msg.usage.cache_read_input_tokens||0, sortie: msg.usage.output_tokens}};
}
function messageErreurApi(err, Anthropic){
  if(Anthropic && err instanceof Anthropic.AuthenticationError) return "clé API refusée : vérifie-la";
  if(Anthropic && err instanceof Anthropic.PermissionDeniedError) return "cette clé n’a pas accès au modèle "+RELECT_MODELE;
  if(Anthropic && err instanceof Anthropic.RateLimitError) return "trop de requêtes : réessaie dans une minute";
  if(Anthropic && err instanceof Anthropic.APIConnectionError) return "connexion impossible à l’API (réseau, proxy de l’entreprise ?)";
  if(Anthropic && err instanceof Anthropic.APIError) return "erreur de l’API ("+err.status+") : "+err.message;
  return err && err.message ? err.message : String(err);
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
      ' <button class="btn sm" data-goto="'+(RELECT_ONGLET[c.theme]||"plan")+'">'+esc(c.theme)+'</button></div></li>').join("")+'</ul>'; };
  return '<div class="'+cls+'"><b>Verdict : '+esc(r.verdict)+'</b> — '+esc(r.synthese)+'</div>'+RELECT_GRAV.map(groupe).join("")+
    ((r.questions_visite||[]).length ? '<h3 style="margin:12px 0 4px">Questions à poser</h3><ul>'+r.questions_visite.map(q=>'<li>'+esc(q)+'</li>').join("")+'</ul>' : '')+
    '<div class="legend">Relu le '+esc(fmtDT(Date.parse(R.date)))+' par '+esc(R.modele)+(R.anonyme ? ', dossier anonymisé' : ', dossier non anonymisé')+
    (R.usage ? ' · '+R.usage.entree+' jetons en entrée ('+R.usage.cache_lu+' lus en cache), '+R.usage.sortie+' en sortie' : '')+'. L’IA propose, tu tranches : rien n’est modifié dans la stratégie.</div>';
}
function lireCle(){ try{ return localStorage.getItem(RELECT_CLE)||""; }catch(e){ return ""; } }
function renderRelecture(){
  const W = $("#relecture"); if(!W) return; const cle = lireCle();
  W.innerHTML = '<h2>Relecture experte (IA)</h2>'+
    '<p style="margin-top:0">Claude ('+RELECT_MODELE+') relit la stratégie complète comme un auditeur Cofrac, en s’appuyant sur le moteur de règles et le référentiel, et dit ce qui ne tient pas. Il ne modifie rien.</p>'+
    '<div class="warn" style="margin:6px 0">Le dossier est envoyé à l’API d’Anthropic. Ne lance la relecture que si SOCOTEC autorise ce service pour ces données. Anonymisation : nom, adresse, SIRET, contact, n° d’affaire et référence de l’ERC sont masqués ; les notes libres et les noms de produits restent tels quels.</div>'+
    '<div class="row" style="flex-wrap:wrap;gap:6px;align-items:center">'+
      '<input id="relCle" type="password" autocomplete="off" placeholder="'+(cle ? 'clé API enregistrée sur ce poste' : 'clé API Anthropic (sk-ant-…)')+'" style="min-width:260px">'+
      '<button class="btn sm" id="relCleSave">Enregistrer la clé sur ce poste</button>'+(cle ? '<button class="btn sm" id="relCleDel">Oublier la clé</button>' : '')+
      '<label style="font-size:13px"><input type="checkbox" id="relAnon" checked> anonymiser</label>'+
    '</div><div class="row" style="margin-top:6px;gap:6px">'+
      '<button class="btn pri" id="relGo">Lancer la relecture</button><button class="btn" id="relVoir">Voir ce qui sera envoyé</button><button class="btn" id="relCopie">Copier pour une autre IA</button>'+
    '</div><div id="relMsg" style="margin-top:6px;font-size:13px"></div><div id="relRes">'+relectureHtml(S.relecture)+'</div>';
  $("#relCleSave").onclick = ()=>{ const v = $("#relCle").value.trim(); if(!v) return; try{ localStorage.setItem(RELECT_CLE, v); }catch(e){} renderRelecture(); };
  if($("#relCleDel")) $("#relCleDel").onclick = ()=>{ try{ localStorage.removeItem(RELECT_CLE); }catch(e){} renderRelecture(); };
  $("#relVoir").onclick = ()=>{ $("#relMsg").innerHTML = '<details open><summary>Dossier envoyé ('+($("#relAnon").checked ? "anonymisé" : "non anonymisé")+')</summary><pre style="max-height:320px;overflow:auto;font-size:11px;white-space:pre-wrap">'+esc(JSON.stringify(dossierRelecture($("#relAnon").checked), null, 1))+'</pre></details>'; };
  $("#relCopie").onclick = async ()=>{ const t = relectSysteme()+"\n\nRéponds en JSON selon ce schéma :\n"+JSON.stringify(RELECT_SCHEMA)+"\n\nDossier de la stratégie à relire (JSON) :\n\n"+JSON.stringify(dossierRelecture($("#relAnon").checked), null, 1);
    try{ await navigator.clipboard.writeText(t); $("#relMsg").textContent = "Consignes et dossier copiés : colle-les dans l’outil d’IA autorisé par SOCOTEC."; }catch(e){ $("#relMsg").textContent = "Copie bloquée par le navigateur."; } };
  $("#relGo").onclick = async ()=>{
    const k = $("#relCle").value.trim() || lireCle(); if(!k){ $("#relMsg").textContent = "Renseigne d’abord une clé API."; return; }
    if(!S.plan.some(r=>r.kind!=="sec")){ $("#relMsg").textContent = "Le plan est vide : génère d’abord la stratégie."; return; }
    const b = $("#relGo"); b.disabled = true; $("#relMsg").textContent = "Relecture en cours (une à plusieurs minutes)…";
    try{ S.relecture = await lancerRelecture(k, $("#relAnon").checked); persist(); renderRelecture(); }
    catch(err){ $("#relMsg").textContent = "Relecture impossible : "+messageErreurApi(err, ANTHROPIC_CLASSE); b.disabled = false; }
  };
}
