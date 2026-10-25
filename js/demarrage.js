"use strict";
/* ================= Démarrage ================= */
restore(); bindEnt(); renderSel(); renderList(); renderDSel(); persist();
if(window.innerWidth<760 && S.ateliers.length) show("terrain");
