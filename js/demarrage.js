"use strict";
/* ================= Démarrage ================= */
restore(); bindEnt(); renderSel(); renderList(); renderDSel(); persist();
/* accueil « missions » ; sur téléphone en mode terrain, on reste sur la visite */
if(document.body.classList.contains("fieldmode")) show("terrain"); else if(window.innerWidth<760 && S.ateliers.length) show("terrain"); else ouvrirAccueil();
$("#bHome").onclick = ouvrirAccueil;
