"use strict";
/* ================= Procédés -> agents émis à rechercher ================= */
/* Un inventaire de produits ne voit pas ce que le procédé fabrique (fumées, poussières, gaz d'échappement).
   La table repère le procédé dans les noms d'atelier, de GEH, de tâches, de produits et d'émissions du GEH,
   puis propose les agents correspondants. Chaque ligne s'appuie sur une source INRS relue ; rien n'est ajouté sans source.
   coche : true quand le procédé suffit (l'agent est toujours émis), false quand cela dépend d'un matériau ou d'une énergie à confirmer. */
const SRC_PROC = {
  soudage: "INRS ED 6132 (oct. 2018), Les fumées de soudage et des techniques connexes, § 4",
  usinage: "INRS ED 972, Captage et traitement des aérosols de fluides de coupe, § 1 et § 4.2.1",
  silice: "tableau RG 25 (INRS) : principales tâches exposant à la silice cristalline ; arrêté du 26/10/2020 (procédés cancérogènes)",
  bois: "INRS, dossier Poussières de bois ; arrêté du 26/10/2020 (procédés cancérogènes) ; R. 4412-149",
  diesel: "INRS, dossier Gaz d’échappement ; arrêté du 26/10/2020 (procédés cancérogènes) ; R. 4412-149"
};
const RE_SOUD = /\bsoud(age|ure|er|eur)|\bbrasage|\bbraser|oxycoup|coupage|decoupe (plasma|laser|thermique|chalumeau)|plasma|metallisation|projection thermique/;
const RE_INOX = /\binox|acier inoxydable|chrome nickel|cr ni\b|\b316\b|\b304\b/;
const RE_GALVA = /galva|zingu/;
const RE_ALU = /\balu\b|alumin/;
const RE_UV = /\bmig\b|\btig\b|plasma|laser/;
const ozoneSur = t => /\btig\b/.test(t) || (RE_ALU.test(t) && RE_UV.test(t));
const RE_MIX =/inoxydables ou galvanises/, sansMix = t => t.split("inoxydables ou galvanises").join(" ");
const PROCEDES = [
  {id:"soudage", nom:"soudage / coupage des métaux", src:SRC_PROC.soudage, si:t=>RE_SOUD.test(t), agents:[
    {re:/^fumees de soudage/, coche:true, pourquoi:"fumées de soudage : VLEP 8 h de 5 mg/m³ pour la totalité des particules"},
    {re:/^manganese et ses composes fraction alveolaire/, coche:false, pourquoi:"oxyde de manganèse : constituant principal quand le métal d’apport ou l’ensemble enrobage/fourrage contient au moins 5 % de manganèse"},
    {re:/^chrome vi et ses composes$/, coche:true, quand:t=>RE_INOX.test(sansMix(t)), pourquoi:"acier inoxydable (chrome-nickel) : composés du chrome VI, surtout en électrodes enrobées et fil fourré"},
    {re:/^composes du nickel exprimes en nickel fraction inhalable/, coche:true, quand:t=>RE_INOX.test(sansMix(t)) || /nickel/.test(t), pourquoi:"acier chrome-nickel ou alliage de nickel : oxyde de nickel"},
    {re:/^zinc oxyde de fumees/, coche:true, quand:t=>RE_GALVA.test(sansMix(t)), pourquoi:"acier galvanisé : oxyde de zinc issu du revêtement"},
    /* catégorie Seirich « aciers inoxydables ou galvanisés » seule : le matériau reste à confirmer */
    {re:/^chrome vi et ses composes$/, coche:false, quand:t=>RE_MIX.test(t) && !RE_INOX.test(sansMix(t)), pourquoi:"catégorie Seirich « aciers inoxydables ou galvanisés » : si inox, composés du chrome VI"},
    {re:/^composes du nickel exprimes en nickel fraction inhalable/, coche:false, quand:t=>RE_MIX.test(t) && !RE_INOX.test(sansMix(t)), pourquoi:"catégorie Seirich « aciers inoxydables ou galvanisés » : si inox, oxyde de nickel"},
    {re:/^zinc oxyde de fumees/, coche:false, quand:t=>RE_MIX.test(t) && !RE_GALVA.test(sansMix(t)), pourquoi:"catégorie Seirich « aciers inoxydables ou galvanisés » : si galvanisé, oxyde de zinc"},
    {re:/^ozone/, coche:true, quand:ozoneSur, pourquoi:"soudage TIG (tous matériaux), MIG ou coupage plasma/laser sur aluminium : ozone"},
    {re:/^ozone/, coche:false, quand:t=>RE_UV.test(t) && !ozoneSur(t), pourquoi:"MIG, coupage plasma ou laser : ozone selon le matériau (aluminium, nickel, chrome-nickel)"},
    {re:/^azote dioxyde d/, coche:true, quand:t=>/chalumeau|flamme|oxyacetyl|oxycoup|metallisation/.test(t), pourquoi:"soudage, coupage ou projection thermique à la flamme : dioxyde d’azote"},
    {re:/^oxyde de carbone/, coche:false, quand:t=>/\bmag\b|co2|dioxyde de carbone/.test(t), pourquoi:"soudage MAG sous CO₂ : monoxyde de carbone (décomposition du gaz de protection)"}]},
  {id:"bois", nom:"travail du bois", src:SRC_PROC.bois, si:t=>/\bbois\b|menuis|ebenist|scierie|charpent|parquet|agencement|panneaux? de particules|\bmdf\b/.test(t), agents:[
    {re:/^poussieres de bois/, coche:true, pourquoi:"poussières de bois : VLEP contraignante de 1 mg/m³ ; travaux classés cancérogènes"}]},
  {id:"silice", nom:"travaux sur matériaux contenant de la silice", src:SRC_PROC.silice,
    si:t=>/sablage|fonderie|concass|broyage de materiaux|carriere|demoulage|decochage/.test(t) ||
      (/beton|pierre|granit|\bgres\b|marbre|parpaing|carrel|ceramique|brique|mortier|ciment|enduit|refractaire|\bfour\b/.test(t) && /decoup|ponc|perc|scie|sciage|taill|meul|polis|rectif|carott|rainur|burin|demoli|tronconn|disqu|faconn/.test(t)), agents:[
    {re:/^fraction alveolaire de silice cristalline quartz$/, coche:true, pourquoi:"silice cristalline alvéolaire (quartz) : découpe, ponçage, perçage, sciage, taille, fonderie (procédés cancérogènes depuis 2021)"}]},
  {id:"usinage", nom:"usinage avec fluides de coupe", src:SRC_PROC.usinage,
    si:t=>/usinage|tournage|tourneur|fraisa|fraiseu|rectifi|alesa|decollet|taraud|brochage|frappe a froid|emboutiss/.test(t) && !/\bbois\b/.test(t), agents:[
    {re:/^aerosols de fluide d usinage/, coche:false, pourquoi:"aérosols de fluides de coupe : pas de VLEP française ; l’INRS retient 0,5 mg/m³ (fraction inhalable) comme objectif"}]},
  {id:"diesel", nom:"moteurs diesel", src:SRC_PROC.diesel, si:t=>/diesel|gazole|chariot|engin|garage|controle technique|creusement|souterrain|tracteur|poids lourd|camion/.test(t), agents:[
    {re:/^emissions d echappement de moteurs diesel/, coche:true, quand:t=>/diesel|gazole/.test(t), pourquoi:"moteurs diesel : VLEP contraignante de 0,05 mg/m³ en carbone élémentaire (fraction alvéolaire) ; travaux classés cancérogènes"},
    {re:/^emissions d echappement de moteurs diesel/, coche:false, quand:t=>!/diesel|gazole|electrique/.test(t), pourquoi:"chariots, engins, véhicules ou garage : à retenir si des moteurs diesel tournent dans le local (garages, entrepôts, engins de chantier, tunnels)"}]}
];
/* agent de la base : la variante sans « sur support » si elle existe */
function refProcede(re){
  const l = BASE.filter(b=>re.test(b._n)); return (l.find(b=>!/sur support/.test(b._n)) || l[0] || {}).ref;
}
/* texte d'un GEH : atelier, GEH, tâches et émissions déclarées ; pas les noms de produits (« lasure bois », « soude » ne sont pas des procédés) */
function texteGeh(at, g){
  const keys = new Set(gehKeys(g));
  return norm([at.nom, g.des].concat(g.srcs||[], g.taches.map(t=>t.t||t.nom||""), (S.cand||[]).filter(c=>c.emis && (c.gehs||[]).some(k=>keys.has(k))).map(c=>c.nom)).join(" "));
}
/* propositions : un agent par procédé repéré, avec les GEH concernés (sans ceux qui ont déjà cet agent) */
function agentsProcedes(){
  const out = {};
  S.ateliers.forEach(at=>at.gehs.forEach(g=>{   /* tous les GEH : un GEH « soudage » sans agent retenu est justement celui qu'il faut compléter */
    const t = texteGeh(at, g), deja = new Set(agentsOfGeh(g).map(u=>(S.agents.find(a=>a.uid===u)||{}).ref));
    PROCEDES.forEach(P=>{ if(!P.si(t)) return;
      P.agents.forEach(A=>{ if(A.quand && !A.quand(t)) return; const ref = refProcede(A.re); if(ref==null || deja.has(ref)) return;
        const k = P.id+":"+ref, o = out[k] = out[k] || {procede:P, ref, coche:A.coche, pourquoi:A.pourquoi, gehs:[]};
        if(A.coche) o.coche = true; if(!o.gehs.includes(g)) o.gehs.push(g); }); });
  }));
  return Object.values(out);
}
